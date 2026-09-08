// routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db').obter();

// Validação de telefone: não tentamos validar um formato exato (isso varia
// demais entre DDDs/países), só garantimos uma quantidade razoável de
// dígitos depois de remover tudo que não é número — barra entradas
// claramente erradas (ex: "abc", vazio, "11") sem travar formatos válidos
// como "(11) 98888-7777" ou "+55 11 98888-7777".
function telefoneValido(telefone) {
  const apenasDigitos = String(telefone || '').replace(/\D/g, '');
  return apenasDigitos.length >= 10 && apenasDigitos.length <= 13;
}

// GET /api/clientes — lista todos os clientes, já com os grupos de cada um
router.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nome COLLATE NOCASE').all();

  const buscarGrupos = db.prepare(`
    SELECT g.id, g.nome FROM grupos g
    JOIN cliente_grupo cg ON cg.grupo_id = g.id
    WHERE cg.cliente_id = ?
  `);

  const resultado = clientes.map((cliente) => ({
    ...cliente,
    grupos: buscarGrupos.all(cliente.id),
  }));

  res.json(resultado);
});

// POST /api/clientes — cria um cliente novo. Body: { nome, telefone, descricao, grupoIds: [] }
router.post('/', (req, res) => {
  const { nome, telefone, descricao = null, grupoIds = [] } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }
  if (!telefoneValido(telefone)) {
    return res.status(400).json({ erro: 'Telefone inválido. Informe DDD + número (ex: 11988887777).' });
  }

  try {
    const inserirCliente = db.prepare('INSERT INTO clientes (nome, telefone, descricao) VALUES (?, ?, ?)');
    const resultado = inserirCliente.run(nome, telefone, descricao);
    const clienteId = resultado.lastInsertRowid;

    const vincularGrupo = db.prepare('INSERT INTO cliente_grupo (cliente_id, grupo_id) VALUES (?, ?)');
    grupoIds.forEach((grupoId) => vincularGrupo.run(clienteId, grupoId));

    res.status(201).json({ id: clienteId, nome, telefone, descricao, grupoIds });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível salvar o cliente. Tente novamente.' });
  }
});

// PUT /api/clientes/:id — atualiza dados e a lista de grupos do cliente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, telefone, descricao = null, grupoIds = [] } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }
  if (!telefoneValido(telefone)) {
    return res.status(400).json({ erro: 'Telefone inválido. Informe DDD + número (ex: 11988887777).' });
  }

  try {
    db.prepare('UPDATE clientes SET nome = ?, telefone = ?, descricao = ? WHERE id = ?').run(
      nome,
      telefone,
      descricao,
      id
    );

    // Estratégia simples: apaga todos os vínculos antigos e recria com a lista atual
    db.prepare('DELETE FROM cliente_grupo WHERE cliente_id = ?').run(id);
    const vincularGrupo = db.prepare('INSERT INTO cliente_grupo (cliente_id, grupo_id) VALUES (?, ?)');
    grupoIds.forEach((grupoId) => vincularGrupo.run(id, grupoId));

    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível atualizar o cliente. Tente novamente.' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível excluir o cliente. Tente novamente.' });
  }
});

module.exports = router;
