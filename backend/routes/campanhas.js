// routes/campanhas.js
const express = require('express');
const router = express.Router();
const db = require('../db').obter();

// Função auxiliar: monta o link direto pro WhatsApp Desktop.
// Como usa o protocolo "whatsapp://" (em vez de "https://"), o Windows não
// pergunta qual programa abrir — só o WhatsApp Desktop reconhece esse link.
function gerarLinkWhatsapp(telefone, mensagem) {
  let telefoneLimpo = telefone.replace(/\D/g, ''); // remove parênteses, traços, espaços

  // Garante o código do Brasil (55) no início, caso o número tenha sido
  // digitado só com DDD + número (ex: cliente cadastrado como "11987654321").
  if (!telefoneLimpo.startsWith('55')) {
    telefoneLimpo = '55' + telefoneLimpo;
  }

  const mensagemCodificada = encodeURIComponent(mensagem);
  return `whatsapp://send?phone=${telefoneLimpo}&text=${mensagemCodificada}`;
}

// GET /api/campanhas — lista campanhas com produto, grupos vinculados e a
// contagem de envios (total/enviados), usada no card do histórico.
router.get('/', (req, res) => {
  const campanhas = db.prepare(`
    SELECT c.*, p.nome AS produto_nome
    FROM campanhas c
    LEFT JOIN produtos p ON p.id = c.produto_id
    ORDER BY c.id DESC
  `).all();

  const buscarGrupos = db.prepare(`
    SELECT g.id, g.nome FROM grupos g
    JOIN campanha_grupo cg ON cg.grupo_id = g.id
    WHERE cg.campanha_id = ?
  `);

  const contarEnvios = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) AS enviados
    FROM envios
    WHERE campanha_id = ?
  `);

  const resultado = campanhas.map((c) => {
    const contagem = contarEnvios.get(c.id) || { total: 0, enviados: 0 };
    return {
      ...c,
      grupos: buscarGrupos.all(c.id),
      contagem: { total: contagem.total || 0, enviados: contagem.enviados || 0 },
    };
  });

  res.json(resultado);
});

// GET /api/campanhas/:campanhaId/envios — lista os envios de uma campanha
// específica (nome do cliente + status), usada em "Ver detalhes".
router.get('/:campanhaId/envios', (req, res) => {
  const envios = db.prepare(`
    SELECT e.cliente_id, e.status, e.enviado_em, cl.nome
    FROM envios e
    LEFT JOIN clientes cl ON cl.id = e.cliente_id
    WHERE e.campanha_id = ?
    ORDER BY cl.nome COLLATE NOCASE
  `).all(req.params.campanhaId);

  res.json(envios);
});

// POST /api/campanhas — cria a campanha e já devolve a lista de clientes
// dos grupos escolhidos, cada um com seu link do WhatsApp pronto pra clicar.
// Body: { produtoId, mensagem, grupoIds: [1, 2] }
router.post('/', (req, res) => {
  const { produtoId, mensagem, grupoIds = [] } = req.body;

  if (!mensagem || grupoIds.length === 0) {
    return res.status(400).json({ erro: 'Mensagem e ao menos um grupo são obrigatórios.' });
  }

  try {
    let campanhaId;
    let clientesComLink;

    // Tudo que acontece aqui dentro (criar a campanha, vincular grupos,
    // registrar um envio por cliente) é salvo em disco UMA VEZ só no
    // final, em vez de reescrever o loja.db inteiro a cada linha inserida.
    // Numa campanha com 150 clientes, isso é a diferença entre 150
    // gravações e 1.
    db.transacao(() => {
      campanhaId = db
        .prepare('INSERT INTO campanhas (produto_id, mensagem) VALUES (?, ?)')
        .run(produtoId || null, mensagem).lastInsertRowid;

      const vincularGrupo = db.prepare('INSERT INTO campanha_grupo (campanha_id, grupo_id) VALUES (?, ?)');
      grupoIds.forEach((grupoId) => vincularGrupo.run(campanhaId, grupoId));

      const placeholders = grupoIds.map(() => '?').join(',');
      const clientes = db.prepare(`
        SELECT DISTINCT cl.id, cl.nome, cl.telefone
        FROM clientes cl
        JOIN cliente_grupo cg ON cg.cliente_id = cl.id
        WHERE cg.grupo_id IN (${placeholders})
        ORDER BY cl.nome COLLATE NOCASE
      `).all(...grupoIds);

      const registrarEnvio = db.prepare(
        'INSERT INTO envios (campanha_id, cliente_id, status) VALUES (?, ?, ?)'
      );

      clientesComLink = clientes.map((cliente) => {
        registrarEnvio.run(campanhaId, cliente.id, 'pendente');
        return {
          ...cliente,
          linkWhatsapp: gerarLinkWhatsapp(cliente.telefone, mensagem),
        };
      });
    });

    res.status(201).json({ campanhaId, clientes: clientesComLink });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível criar a campanha. Tente novamente.' });
  }
});

// PUT /api/campanhas/:campanhaId/envios/:clienteId
// Marca um envio específico como "enviado" — chamado depois que o admin
// clica no botão "Enviar" e o WhatsApp abre com a mensagem.
router.put('/:campanhaId/envios/:clienteId', (req, res) => {
  const { campanhaId, clienteId } = req.params;

  try {
    db.prepare(`
      UPDATE envios SET status = 'enviado', enviado_em = CURRENT_TIMESTAMP
      WHERE campanha_id = ? AND cliente_id = ?
    `).run(campanhaId, clienteId);

    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível marcar o envio. Tente novamente.' });
  }
});

// DELETE /api/campanhas/:id — remove a campanha e tudo que depende dela
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    db.transacao(() => {
      db.prepare('DELETE FROM envios WHERE campanha_id = ?').run(id);
      db.prepare('DELETE FROM campanha_grupo WHERE campanha_id = ?').run(id);
      db.prepare('DELETE FROM campanhas WHERE id = ?').run(id);
    });
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível excluir a campanha. Tente novamente.' });
  }
});

module.exports = router;
