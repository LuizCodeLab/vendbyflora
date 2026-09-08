import { useEffect, useRef, useState } from 'react';
import { api, URL_ARQUIVOS } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [erro, setErro] = useState('');
  const [enviandoFotoDe, setEnviandoFotoDe] = useState(null); // id do produto com upload em andamento
  const inputsArquivo = useRef({}); // um <input type="file"> escondido por produto

  async function carregar() {
    setProdutos(await api.listarProdutos());
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
        await api.atualizarProduto(editandoId, { nome, categoria, descricao });
      } else {
        await api.criarProduto({ nome, categoria, descricao });
      }

      setNome('');
      setCategoria('');
      setDescricao('');
      setEditandoId(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function handleEditar(produto) {
    setEditandoId(produto.id);
    setNome(produto.nome);
    setCategoria(produto.categoria || '');
    setDescricao(produto.descricao || '');
  }

  function pedirConfirmacaoExclusao(produto) {
    setConfirmarExclusao(produto);
  }

  async function confirmarExclusaoProduto() {
    setErro('');
    try {
      await api.excluirProduto(confirmarExclusao.id);
      setConfirmarExclusao(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
      setConfirmarExclusao(null);
    }
  }

  function abrirSeletorDeArquivo(produtoId) {
    inputsArquivo.current[produtoId]?.click();
  }

  async function handleArquivosEscolhidos(produtoId, arquivos) {
    if (!arquivos || arquivos.length === 0) return;
    setErro('');
    setEnviandoFotoDe(produtoId);
    try {
      await api.enviarImagensProduto(produtoId, Array.from(arquivos));
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviandoFotoDe(null);
    }
  }

  async function handleExcluirImagem(produtoId, imagemId) {
    setErro('');
    try {
      await api.excluirImagemProduto(produtoId, imagemId);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <h1>Produtos</h1>

      <form onSubmit={handleCriar} className="form-linha">
        <input placeholder="Nome do produto" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Categoria (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <textarea
          rows={1}
          className="campo-descricao"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <button type="submit">{editandoId ? 'Salvar alterações' : 'Novo produto'}</button>
      </form>
      {erro && <p className="erro">{erro}</p>}

      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Descrição</th>
            <th>Fotos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => (
            <tr key={produto.id}>
              <td>{produto.nome}</td>
              <td>{produto.categoria || '—'}</td>
              <td>{produto.descricao || '—'}</td>
              <td>
                <div className="galeria-produto">
                  {produto.imagens.map((imagem) => (
                    <div key={imagem.id} className="miniatura">
                      <img src={`${URL_ARQUIVOS}/imagens/${imagem.caminho}`} alt={produto.nome} />
                      <button
                        type="button"
                        className="miniatura-excluir"
                        title="Excluir foto"
                        onClick={() => handleExcluirImagem(produto.id, imagem.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    multiple
                    style={{ display: 'none' }}
                    ref={(el) => (inputsArquivo.current[produto.id] = el)}
                    onChange={(e) => handleArquivosEscolhidos(produto.id, e.target.files)}
                  />
                  <button
                    type="button"
                    className="botao-adicionar-foto"
                    disabled={enviandoFotoDe === produto.id}
                    onClick={() => abrirSeletorDeArquivo(produto.id)}
                  >
                    {enviandoFotoDe === produto.id ? 'Enviando...' : '+ Fotos'}
                  </button>
                </div>
              </td>
              <td>
                <div className="acoes">
                  <button onClick={() => handleEditar(produto)}>✏️</button>
                  <button onClick={() => pedirConfirmacaoExclusao(produto)}>Excluir</button>
                </div>
              </td>
            </tr>
          ))}
          {produtos.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum produto cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>

      {confirmarExclusao && (
        <ConfirmDialog
          mensagem={`Tem certeza que quer excluir o produto "${confirmarExclusao.nome}"?`}
          onConfirmar={confirmarExclusaoProduto}
          onCancelar={() => setConfirmarExclusao(null)}
        />
      )}
    </div>
  );
}
