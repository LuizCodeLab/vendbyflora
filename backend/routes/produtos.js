// routes/produtos.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { obter, PASTA_IMAGENS } = require('../db');
const db = obter();

// --- Configuração do upload de imagens ------------------------------------
// Cada produto tem sua própria subpasta dentro de PASTA_IMAGENS, ex:
// produtos-imagens/produto-7/1699999999-foto.jpg. Isso é o que permite
// depois abrir "a pasta do produto" inteira de uma vez, pra selecionar
// várias fotos ao mesmo tempo.
const armazenamento = multer.diskStorage({
  destination(req, _file, callback) {
    const pastaProduto = path.join(PASTA_IMAGENS, `produto-${req.params.id}`);
    fs.mkdirSync(pastaProduto, { recursive: true });
    callback(null, pastaProduto);
  },
  filename(_req, file, callback) {
    const nomeSeguro = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    callback(null, `${Date.now()}-${nomeSeguro}`);
  },
});

const upload = multer({
  storage: armazenamento,
  limits: { fileSize: 20 * 1024 * 1024, files: 99 }, // até 8MB por foto, 10 fotos por vez
  fileFilter(_req, file, callback) {
    const tiposAceitos = ['image/jpeg', 'image/png', 'image/webp'];
    callback(null, tiposAceitos.includes(file.mimetype));
  },
});

// GET /api/produtos — já traz as imagens de cada produto junto (evita que
// o front precise pedir imagem por imagem, produto por produto).
router.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos ORDER BY nome COLLATE NOCASE').all();

  const buscarImagens = db.prepare(
    'SELECT id, caminho_arquivo FROM produto_imagens WHERE produto_id = ? ORDER BY id'
  );

  const resultado = produtos.map((produto) => ({
    ...produto,
    imagens: buscarImagens.all(produto.id).map((img) => ({ id: img.id, caminho: img.caminho_arquivo })),
  }));

  res.json(resultado);
});

// POST /api/produtos — Body: { nome, categoria, descricao, foto_url }
router.post('/', (req, res) => {
  const { nome, categoria = null, descricao = null, foto_url = null } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });

  try {
    const resultado = db
      .prepare('INSERT INTO produtos (nome, categoria, descricao, foto_url) VALUES (?, ?, ?, ?)')
      .run(nome, categoria, descricao, foto_url);

    res.status(201).json({ id: resultado.lastInsertRowid, nome, categoria, descricao, foto_url, imagens: [] });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível salvar o produto. Tente novamente.' });
  }
});

// PUT /api/produtos/:id — Body: { nome, categoria, descricao, foto_url }
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, categoria = null, descricao = null, foto_url = null } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });

  try {
    db.prepare('UPDATE produtos SET nome = ?, categoria = ?, descricao = ?, foto_url = ? WHERE id = ?').run(
      nome,
      categoria,
      descricao,
      foto_url,
      id
    );
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível atualizar o produto. Tente novamente.' });
  }
});

// POST /api/produtos/:id/imagens — recebe uma ou várias fotos
// (multipart/form-data, campo "imagens") e devolve as linhas criadas.
router.post('/:id/imagens', upload.array('imagens', 99), (req, res) => {
  const { id } = req.params;
  const produto = db.prepare('SELECT id FROM produtos WHERE id = ?').get(id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma imagem válida foi enviada (use JPG, PNG ou WEBP).' });
  }

  try {
    const inserir = db.prepare('INSERT INTO produto_imagens (produto_id, caminho_arquivo) VALUES (?, ?)');
    const imagens = req.files.map((arquivo) => {
      const caminhoRelativo = `produto-${id}/${arquivo.filename}`;
      const resultado = inserir.run(id, caminhoRelativo);
      return { id: resultado.lastInsertRowid, caminho: caminhoRelativo };
    });

    res.status(201).json({ imagens });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível salvar as imagens. Tente novamente.' });
  }
});

// DELETE /api/produtos/:id/imagens/:imagemId — remove uma foto específica
// (arquivo em disco + linha no banco).
router.delete('/:id/imagens/:imagemId', (req, res) => {
  const { id, imagemId } = req.params;

  try {
    const imagem = db
      .prepare('SELECT * FROM produto_imagens WHERE id = ? AND produto_id = ?')
      .get(imagemId, id);

    if (imagem) {
      const caminhoCompleto = path.join(PASTA_IMAGENS, imagem.caminho_arquivo);
      if (fs.existsSync(caminhoCompleto)) fs.unlinkSync(caminhoCompleto);
      db.prepare('DELETE FROM produto_imagens WHERE id = ?').run(imagemId);
    }

    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível excluir a imagem. Tente novamente.' });
  }
});

// DELETE /api/produtos/:id
// Excluir um produto vinculado a campanhas não trava mais (ON DELETE SET
// NULL no schema), e a pasta de imagens do produto é removida do disco —
// as linhas de produto_imagens somem sozinhas via ON DELETE CASCADE.
router.delete('/:id', (req, res) => {
  try {
    const pastaProduto = path.join(PASTA_IMAGENS, `produto-${req.params.id}`);
    if (fs.existsSync(pastaProduto)) fs.rmSync(pastaProduto, { recursive: true, force: true });

    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível excluir o produto. Tente novamente.' });
  }
});

module.exports = router;
