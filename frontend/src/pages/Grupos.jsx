import { useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  

  async function carregar() {
    setGrupos(await api.listarGrupos());
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCriar(e) {
  e.preventDefault();
  setErro('');
  if (!nome) return;

  try {
    if (editandoId) {
      await api.atualizarGrupo(editandoId, nome, descricao);
    } else {
      await api.criarGrupo(nome, descricao);
    }
    setNome('');
    setDescricao('');
    setEditandoId(null);
    carregar();
  } catch (e) {
    setErro(e.message);
  }
}

function pedirConfirmacaoExclusao(grupo) {
  setConfirmarExclusao(grupo);
}

async function confirmarExclusaoGrupo() {
  try {
    await api.excluirGrupo(confirmarExclusao.id);
    setConfirmarExclusao(null);
    carregar();
  } catch (e) {
    setErro(e.message);
    setConfirmarExclusao(null);
  }
}

  function handleEditar(grupo) {
  setEditandoId(grupo.id);
  setNome(grupo.nome);
  setDescricao(grupo.descricao || '');
}

  return (
    <div>
      <h1>Grupos</h1>
      <p className="dica">
        Ex: "VIP", "Blusinha regata", "Calça jeans", "Vestido midi" — grupos são criados manualmente
        e servem pra segmentar os disparos de mensagem.
      </p>

      <form onSubmit={handleCriar} className="form-linha">
        <input placeholder="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} />
        <textarea rows={1} className="campo-descricao" placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <button type="submit">{editandoId ? 'Salvar alterações' : 'Novo grupo'}</button>
      </form>
      {erro && <p className="erro">{erro}</p>}

      <table className="tabela">
  <thead>
    <tr>
      <th>Nome</th>
      <th>Descrição</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {grupos.map((grupo) => (
      <tr key={grupo.id}>
        <td>{grupo.nome}</td>
        <td>{grupo.descricao || '—'}</td>
        <td>
          <div className="acoes">
            <button onClick={() => handleEditar(grupo)}>✏️</button>
            <button onClick={() => pedirConfirmacaoExclusao(grupo)}>Excluir</button>
          </div>
        </td>
      </tr>
    ))}
    {grupos.length === 0 && (
      <tr>
        <td colSpan={3}>Nenhum grupo cadastrado ainda.</td>
      </tr>
    )}
  </tbody>
</table>
    {confirmarExclusao && (
  <ConfirmDialog
    mensagem={`Tem certeza que quer excluir o grupo "${confirmarExclusao.nome}"?`}
    onConfirmar={confirmarExclusaoGrupo}
    onCancelar={() => setConfirmarExclusao(null)}
  />
)}

    </div>
  );
}
