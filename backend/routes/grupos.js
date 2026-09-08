// routes/grupos.js
const express = require('express');
const router = express.Router();
const db = require('../db').obter();

// GET /api/grupos — lista todos os grupos (ex: VIP, Blusinha regata, Calça jeans...)
router.get('/', (req, res) => {
  const grupos = db.prepare('SELECT * FROM grupos ORDER BY nome').all();
  res.json(grupos);
});

// POST /api/grupos — cria um grupo novo. Body: { nome, descricao }
router.post('/', (req, res) => {
  const { nome, descricao = null } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome do grupo é obrigatório.' });

  try {
    const resultado = db.prepare('INSERT INTO grupos (nome, descricao) VALUES (?, ?)').run(nome, descricao);
    res.status(201).json({ id: resultado.lastInsertRowid, nome, descricao });
  } catch (e) {
    res.status(409).json({ erro: 'Já existe um grupo com esse nome.' });
  }
});

// PUT /api/grupos/:id — Body: { nome, descricao }
router.put('/:id', (req, res) => {
  const { nome, descricao = null } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome do grupo é obrigatório.' });

  try {
    db.prepare('UPDATE grupos SET nome = ?, descricao = ? WHERE id = ?').run(nome, descricao, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ erro: 'Já existe um grupo com esse nome.' });
  }
});

// DELETE /api/grupos/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM grupos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível excluir o grupo. Tente novamente.' });
  }
});

module.exports = router;
