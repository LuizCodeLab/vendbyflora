// db.js
// Usamos sql.js: uma versão do SQLite compilada para WebAssembly. Ela roda
// em QUALQUER versão de JavaScript (incluindo a versão de Node embutida
// dentro do Electron, que costuma ser mais antiga que o Node do seu
// computador), sem precisar compilar nada em C++.
//
// A diferença é que o sql.js trabalha com o banco em memória, então
// salvamos manualmente o conteúdo no arquivo loja.db a cada alteração.

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CAMINHO_DB = app.isPackaged
  ? path.join(app.getPath('userData'), 'loja.db')  // instalado: pasta de dados do usuário
  : path.join(__dirname, 'loja.db');                 // desenvolvimento: continua como está

// Pasta onde ficam as fotos de cada produto, uma subpasta por produto
// (ex: produtos-imagens/produto-3/foto1.jpg). Segue a mesma lógica do banco:
// instalado usa a pasta de dados do usuário, em desenvolvimento fica local.
const PASTA_IMAGENS = app.isPackaged
  ? path.join(app.getPath('userData'), 'produtos-imagens')
  : path.join(__dirname, 'produtos-imagens');
if (!fs.existsSync(PASTA_IMAGENS)) {
  fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
}

let dbInstance = null;

// Escrita atômica: escreve primeiro num arquivo temporário e só troca pelo
// definitivo (fs.renameSync) quando termina — evita corromper o loja.db se
// o programa for fechado à força no meio de uma gravação.
function persistir(sqlJsDb) {
  const dados = sqlJsDb.export();
  const arquivoTemporario = `${CAMINHO_DB}.tmp`;
  fs.writeFileSync(arquivoTemporario, Buffer.from(dados));
  fs.renameSync(arquivoTemporario, CAMINHO_DB);
}

// Cria um "adaptador" com a mesma API simples que usamos nas rotas
// (prepare().run()/.get()/.all()), só que por baixo usa o sql.js.
function criarAdaptador(sqlJsDb) {
  // Por padrão, cada .run() grava o banco inteiro em disco na hora. Ótimo
  // pra uma escrita isolada, péssimo dentro de um loop (ex: registrar 150
  // envios de uma campanha reescreveria o arquivo 150 vezes seguidas).
  // transacao() deixa a gravação em espera durante o loop e grava tudo de
  // uma vez só no final.
  let suspenderPersistencia = false;

  function persistirSeNecessario() {
    if (!suspenderPersistencia) persistir(sqlJsDb);
  }

  return {
    exec(sql) {
      sqlJsDb.run(sql);
      persistirSeNecessario();
    },
    prepare(sql) {
      return {
        run(...params) {
          sqlJsDb.run(sql, params);
          const resultado = sqlJsDb.exec('SELECT last_insert_rowid() AS id');
          const lastInsertRowid = resultado[0]?.values[0][0] ?? null;
          persistirSeNecessario();
          return { lastInsertRowid, changes: sqlJsDb.getRowsModified() };
        },
        get(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          const linha = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return linha;
        },
        all(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          const linhas = [];
          while (stmt.step()) linhas.push(stmt.getAsObject());
          stmt.free();
          return linhas;
        },
      };
    },
    // Agrupa várias operações de escrita (vários .run() seguidos) numa
    // única gravação em disco no final. Use isso em qualquer loop de
    // inserts/updates (ex: registrar envios de campanha).
    transacao(fn) {
      suspenderPersistencia = true;
      try {
        fn();
      } finally {
        suspenderPersistencia = false;
        persistir(sqlJsDb);
      }
    },
  };
}

// Inicializa o banco: carrega o arquivo loja.db se ele já existir,
// ou começa um banco vazio na primeira vez. Precisa ser chamado (e aguardado)
// antes de qualquer rota ser usada — é feito em server.js.
async function iniciar() {
  const SQL = await initSqlJs();

  const arquivoExiste = fs.existsSync(CAMINHO_DB);
  const sqlJsDb = arquivoExiste ? new SQL.Database(fs.readFileSync(CAMINHO_DB)) : new SQL.Database();

  sqlJsDb.run('PRAGMA foreign_keys = ON');

  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS cliente_grupo (
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      PRIMARY KEY (cliente_id, grupo_id)
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      foto_url TEXT
    );

    -- Um produto pode ter várias fotos. Cada linha aponta pra um arquivo
    -- dentro de PASTA_IMAGENS. Se o produto for excluído, as linhas somem
    -- junto (ON DELETE CASCADE) — mas o arquivo em si no disco precisa ser
    -- apagado manualmente pela rota (isso não é automático).
    CREATE TABLE IF NOT EXISTS produto_imagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      caminho_arquivo TEXT NOT NULL,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- ON DELETE SET NULL: excluir um produto vinculado a uma campanha não
    -- trava mais com erro de FK — a campanha continua existindo (com a
    -- mensagem que já foi escrita), só perde a referência ao produto.
    CREATE TABLE IF NOT EXISTS campanhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
      mensagem TEXT NOT NULL,
      criada_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campanha_grupo (
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      PRIMARY KEY (campanha_id, grupo_id)
    );

    -- Mesma lógica: excluir um cliente não trava por causa do histórico de
    -- envios. O envio fica registrado, só perde o vínculo com o cliente.
    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER REFERENCES campanhas(id) ON DELETE CASCADE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'pendente',
      enviado_em TEXT
    );
  `);

  // Migrações: adiciona colunas em bancos criados antes delas existirem.
  try {
    sqlJsDb.run('ALTER TABLE grupos ADD COLUMN descricao TEXT');
  } catch (e) {
    // coluna já existe, pode ignorar
  }

  try {
    sqlJsDb.run('ALTER TABLE clientes ADD COLUMN descricao TEXT');
  } catch (e) {
    // coluna já existe, pode ignorar
  }

  try {
    sqlJsDb.run('ALTER TABLE produtos ADD COLUMN descricao TEXT');
  } catch (e) {
    // coluna já existe, pode ignorar
  }

  persistir(sqlJsDb);

  dbInstance = criarAdaptador(sqlJsDb);
  return dbInstance;
}

// As rotas chamam obter() depois que server.js já garantiu que iniciar() terminou.
function obter() {
  if (!dbInstance) {
    throw new Error('O banco de dados ainda não foi inicializado. Chame iniciar() primeiro.');
  }
  return dbInstance;
}

module.exports = { iniciar, obter, PASTA_IMAGENS, CAMINHO_DB };
