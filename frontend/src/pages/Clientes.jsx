import { useEffect, useState } from 'react';
import { api } from '../api';
import SeletorGrupos from '../components/SeletorGrupos';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [grupoIds, setGrupoIds] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [erro, setErro] = useState('');

  async function carregarTudo() {
    setClientes(await api.listarClientes());
    setGrupos(await api.listarGrupos());
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  async function handleCriar(e) {
    e.preventDefault();
    setErro('');
    if (!nome || !telefone) return;

    try {
      if (editandoId) {
        await api.atualizarCliente(editandoId, { nome, telefone, grupoIds, descricao });
      } else {
        await api.criarCliente({ nome, telefone, grupoIds, descricao });
      }

      setNome('');
      setTelefone('');
      setGrupoIds([]);
      setDescricao('');
      setEditandoId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  function handleEditar(cliente) {
    setEditandoId(cliente.id);
    setNome(cliente.nome);
    setTelefone(cliente.telefone);
    setGrupoIds(cliente.grupos.map((g) => g.id));
    setDescricao(cliente.descricao || '');
  }

  function pedirConfirmacaoExclusao(cliente) {
    setConfirmarExclusao(cliente);
  }

  async function confirmarExclusaoCliente() {
    setErro('');
    try {
      await api.excluirCliente(confirmarExclusao.id);
      setConfirmarExclusao(null);
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
      setConfirmarExclusao(null);
    }
  }

  return (
    <div>
      <h1>Clientes</h1>

      <form onSubmit={handleCriar} className="form-linha">
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Telefone (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <textarea
          rows={1}
          className="campo-descricao"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <SeletorGrupos grupos={grupos} selecionados={grupoIds} onMudar={setGrupoIds} />
        <button type="submit">{editandoId ? 'Salvar Alterações' : 'Novo Cliente'} </button>
      </form>
      {erro && <p className="erro">{erro}</p>}

      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Descrição</th>
            <th>Grupos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id}>
              <td>{cliente.nome}</td>
              <td>{cliente.telefone}</td>
              <td>{cliente.descricao || '—'}</td>
              <td>{cliente.grupos.map((g) => g.nome).join(', ')}</td>
              <td>
                <div className="acoes">
                  <button onClick={() => handleEditar(cliente)}>✏️</button>
                  <button onClick={() => pedirConfirmacaoExclusao(cliente)}>Excluir</button>
                </div>
              </td>
            </tr>
          ))}
          {clientes.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum cliente cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
      {confirmarExclusao && (
        <ConfirmDialog
          mensagem={`Tem certeza que quer excluir o cliente "${confirmarExclusao.nome}"?`}
          onConfirmar={confirmarExclusaoCliente}
          onCancelar={() => setConfirmarExclusao(null)}
        />
      )}
    </div>
  );
}
