import { useEffect, useState } from 'react';
import { api } from '../api';
import SeletorGrupos from '../components/SeletorGrupos';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Campanhas() {
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [grupoIds, setGrupoIds] = useState([]);
  const [campanhaId, setCampanhaId] = useState(null);
  const [clientesParaEnviar, setClientesParaEnviar] = useState([]);
  const [enviados, setEnviados] = useState(new Set());
  const [historico, setHistorico] = useState([]);
  const [campanhaExpandidaId, setCampanhaExpandidaId] = useState(null);
  const [enviosDaExpandida, setEnviosDaExpandida] = useState([]);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false); // trava o botão contra duplo clique

  useEffect(() => {
    api.listarProdutos().then(setProdutos).catch((e) => setErro(e.message));
    api.listarGrupos().then(setGrupos).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    try {
      setHistorico(await api.listarCampanhas());
    } catch (e) {
      setErro(e.message);
    }
  }

  async function handleCriarCampanha(e) {
    e.preventDefault();
    setErro('');
    if (!mensagem || grupoIds.length === 0 || gerando) return;

    setGerando(true);
    try {
      const resultado = await api.criarCampanha({
        produtoId: produtoId || null,
        mensagem,
        grupoIds,
      });

      setCampanhaId(resultado.campanhaId);
      setClientesParaEnviar(resultado.clientes);
      setEnviados(new Set());
      await carregarHistorico();
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  // Abre o WhatsApp Desktop com a mensagem pronta pro admin conferir e enviar.
  async function handleEnviar(cliente) {
    setErro('');
    try {
      window.open(cliente.linkWhatsapp, '_blank');
      await api.marcarEnviado(campanhaId, cliente.id);
      setEnviados((prev) => new Set(prev).add(cliente.id));
      await carregarHistorico();
    } catch (e) {
      setErro(e.message);
    }
  }

  function pedirConfirmacaoExclusao(campanha) {
    setConfirmarExclusao(campanha);
  }

  async function confirmarExclusaoCampanha() {
    setErro('');
    try {
      await api.excluirCampanha(confirmarExclusao.id);
      const idExcluida = confirmarExclusao.id;
      setConfirmarExclusao(null);
      await carregarHistorico();

      if (campanhaExpandidaId === idExcluida) {
        setCampanhaExpandidaId(null);
        setEnviosDaExpandida([]);
      }
    } catch (e) {
      setErro(e.message);
      setConfirmarExclusao(null);
    }
  }

  async function handleExpandir(campanha) {
    if (campanhaExpandidaId === campanha.id) {
      setCampanhaExpandidaId(null);
      setEnviosDaExpandida([]);
      return;
    }

    setErro('');
    try {
      setCampanhaExpandidaId(campanha.id);
      setEnviosDaExpandida(await api.listarEnviosCampanha(campanha.id));
    } catch (e) {
      setErro(e.message);
    }
  }

  // Abre a pasta com todas as fotos do produto no Explorer/Finder, pra
  // selecionar todas de uma vez (Ctrl+A) e arrastar pro WhatsApp.
  async function handleAbrirPastaImagens() {
    setErro('');
    try {
      await window.electronAPI.abrirPastaImagensProduto(produtoId);
    } catch (e) {
      setErro('Não foi possível abrir a pasta de imagens.');
    }
  }

  return (
    <div>
      <h1>Nova campanha</h1>

      <form onSubmit={handleCriarCampanha} className="campanha-grid">
        <div>
          <label>Produto</label>
          <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value="">Sem produto vinculado</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          {produtoId && (
            <button
              type="button"
              className="botao-secundario"
              onClick={handleAbrirPastaImagens}
              style={{ marginTop: '8px' }}
            >
              📁 Abrir pasta de imagens do produto
            </button>
          )}

          <label>Mensagem</label>
          <textarea
            rows={4}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex: Chegou a nova blusinha regata floral! 🌸"
          />

          <label>Enviar para os grupos</label>
          <SeletorGrupos grupos={grupos} selecionados={grupoIds} onMudar={setGrupoIds} />

          <button type="submit" disabled={gerando} style={{ marginTop: '12px' }}>
            {gerando ? 'Gerando...' : 'Gerar lista de envio'}
          </button>
          {erro && <p className="erro">{erro}</p>}
        </div>

        <div>
          <label>Clientes selecionados ({clientesParaEnviar.length})</label>
          <ul className="lista-envio">
            {clientesParaEnviar.map((cliente) => (
              <li key={cliente.id}>
                <span>{cliente.nome}</span>
                <button
                  type="button"
                  disabled={enviados.has(cliente.id)}
                  onClick={() => handleEnviar(cliente)}
                >
                  {enviados.has(cliente.id) ? 'Enviado ✓' : 'Enviar no WhatsApp'}
                </button>
              </li>
            ))}
            {clientesParaEnviar.length === 0 && <li className="dica">Gere a lista pra ver os clientes aqui.</li>}
          </ul>
        </div>
      </form>

      <div style={{ marginTop: '2rem' }}>
        <h2>Histórico de campanhas</h2>

        {historico.length === 0 && <p className="dica">Nenhuma campanha criada ainda.</p>}

        {historico.map((campanha) => {
          const total = campanha.contagem?.total || 0;
          const enviadosCount = campanha.contagem?.enviados || 0;
          const estaExpandida = campanhaExpandidaId === campanha.id;

          return (
            <div key={campanha.id} className="card-campanha">
              <div className="card-campanha-cabecalho">
                <div>
                  <strong>{campanha.produto_nome || 'Sem produto vinculado'}</strong>
                  <p className="dica">{campanha.mensagem}</p>
                  <p className="dica">Grupos: {campanha.grupos.map((g) => g.nome).join(', ') || '—'}</p>
                </div>

                <div className="card-campanha-acoes">
                  <span className="badge-contagem">
                    {enviadosCount} de {total} enviados
                  </span>
                  <button type="button" onClick={() => handleExpandir(campanha)}>
                    {estaExpandida ? 'Ocultar' : 'Ver detalhes'}
                  </button>
                  <button type="button" onClick={() => pedirConfirmacaoExclusao(campanha)}>
                    Excluir
                  </button>
                </div>
              </div>

              {estaExpandida && (
                <ul className="lista-envio" style={{ marginTop: '12px' }}>
                  {enviosDaExpandida.map((envio) => (
                    <li key={envio.cliente_id}>
                      <span>{envio.nome || 'Cliente removido'}</span>
                      <span className={envio.status === 'enviado' ? 'status-enviado' : 'status-pendente'}>
                        {envio.status === 'enviado' ? 'Enviado ✓' : 'Pendente'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {confirmarExclusao && (
        <ConfirmDialog
          mensagem={`Tem certeza que quer excluir a campanha "${confirmarExclusao.produto_nome || 'sem produto'}"?`}
          onConfirmar={confirmarExclusaoCampanha}
          onCancelar={() => setConfirmarExclusao(null)}
        />
      )}
    </div>
  );
}
