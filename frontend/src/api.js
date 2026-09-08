// api.js
// Centraliza as chamadas ao backend local (Express + SQLite).
// Tudo aqui aponta pro localhost — nada disso sai pra internet.

const BASE_URL = 'http://localhost:3001/api';
export const URL_ARQUIVOS = 'http://localhost:3001'; // base pra montar o <img src> das fotos

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  return resposta.json();
}

// Upload de imagens usa multipart/form-data, então não pode passar pelo
// requisitar() acima (que sempre manda Content-Type: application/json).
async function enviarArquivos(caminho, formData) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, { method: 'POST', body: formData });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro ao enviar imagens');
  }
  return resposta.json();
}

export const api = {
  // Clientes
  listarClientes: () => requisitar('/clientes'),
  criarCliente: (dados) => requisitar('/clientes', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarCliente: (id, dados) => requisitar(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirCliente: (id) => requisitar(`/clientes/${id}`, { method: 'DELETE' }),

  // Grupos
  listarGrupos: () => requisitar('/grupos'),
  criarGrupo: (nome, descricao) => requisitar('/grupos', { method: 'POST', body: JSON.stringify({ nome, descricao }) }),
  atualizarGrupo: (id, nome, descricao) => requisitar(`/grupos/${id}`, { method: 'PUT', body: JSON.stringify({ nome, descricao }) }),
  excluirGrupo: (id) => requisitar(`/grupos/${id}`, { method: 'DELETE' }),

  // Produtos
  listarProdutos: () => requisitar('/produtos'),
  criarProduto: (dados) => requisitar('/produtos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarProduto: (id, dados) => requisitar(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirProduto: (id) => requisitar(`/produtos/${id}`, { method: 'DELETE' }),
  enviarImagensProduto: (produtoId, arquivos) => {
    const formData = new FormData();
    arquivos.forEach((arquivo) => formData.append('imagens', arquivo));
    return enviarArquivos(`/produtos/${produtoId}/imagens`, formData);
  },
  excluirImagemProduto: (produtoId, imagemId) =>
    requisitar(`/produtos/${produtoId}/imagens/${imagemId}`, { method: 'DELETE' }),

  // Campanhas
  listarCampanhas: () => requisitar('/campanhas'),
  criarCampanha: (dados) => requisitar('/campanhas', { method: 'POST', body: JSON.stringify(dados) }),
  marcarEnviado: (campanhaId, clienteId) =>
    requisitar(`/campanhas/${campanhaId}/envios/${clienteId}`, { method: 'PUT' }),
  listarEnviosCampanha: (campanhaId) => requisitar(`/campanhas/${campanhaId}/envios`),
  excluirCampanha: (id) => requisitar(`/campanhas/${id}`, { method: 'DELETE' }),
};
