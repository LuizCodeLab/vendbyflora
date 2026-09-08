// server.js
// Este servidor roda só dentro da máquina do usuário (localhost), nunca
// acessa a internet. Ele existe para o React "conversar" com o SQLite
// através de rotas HTTP simples (GET, POST, PUT, DELETE).

const express = require('express');
const cors = require('cors');
const db = require('./db');

// Lista de origens que podem chamar essa API. Em desenvolvimento, o front
// roda no Vite (localhost:5173). Requisições sem "origin" (undefined) são
// o próprio Electron carregando a tela via file:// em produção — essas
// também são permitidas, porque são o próprio app se chamando. Qualquer
// outra origem (ex: uma aba de navegador comum) é bloqueada.
const ORIGENS_PERMITIDAS = ['http://localhost:5173'];

async function iniciarServidor() {
  // Espera o banco de dados (sql.js) terminar de carregar ANTES de montar
  // as rotas — assim, quando uma rota for chamada, o banco já está pronto.
  await db.iniciar();

  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || ORIGENS_PERMITIDAS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origem não permitida'));
        }
      },
    })
  );
  app.use(express.json());

  // Serve as fotos dos produtos como arquivos estáticos, ex:
  // http://localhost:3001/imagens/produto-3/foto1.jpg
  app.use('/imagens', express.static(db.PASTA_IMAGENS));

  app.use('/api/clientes', require('./routes/clientes'));
  app.use('/api/grupos', require('./routes/grupos'));
  app.use('/api/produtos', require('./routes/produtos'));
  app.use('/api/campanhas', require('./routes/campanhas'));

  // Handler de erro genérico: pega tanto o bloqueio de CORS quanto qualquer
  // outro erro não tratado nas rotas, e devolve uma resposta JSON limpa em
  // vez de deixar o Express estourar um erro cru com stack trace.
  app.use((erro, req, res, _next) => {
    console.error(erro);
    res.status(erro.message === 'Origem não permitida' ? 403 : 500).json({ erro: erro.message });
  });

  const PORTA = 3001;
  // Escutar só em 127.0.0.1 (loopback), não em todas as interfaces de rede
  // (0.0.0.0, que é o padrão quando o host não é especificado). Assim, só
  // programas rodando NESTE computador acessam a API — nenhum outro
  // dispositivo na mesma Wi-Fi consegue.
  app.listen(PORTA, '127.0.0.1', () => {
    console.log(`Backend local rodando em http://127.0.0.1:${PORTA}`);
  });
}

iniciarServidor();
