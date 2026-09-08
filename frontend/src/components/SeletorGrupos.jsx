import { useState, useRef, useEffect } from 'react';

// Componente reutilizável: input com badges dos grupos selecionados + seta
// que abre uma lista com checkbox. Usado na tela de Clientes e de Campanhas.
export default function SeletorGrupos({ grupos, selecionados, onMudar }) {
  const [aberto, setAberto] = useState(false);

  const containerRef = useRef(null);

useEffect(() => {
  function aoClicarFora(evento) {
    if (containerRef.current && !containerRef.current.contains(evento.target)) {
      setAberto(false);
    }
  }

  document.addEventListener('mousedown', aoClicarFora);
  return () => document.removeEventListener('mousedown', aoClicarFora);
}, []);

  function alternar(grupoId) {
    if (selecionados.includes(grupoId)) {
      onMudar(selecionados.filter((id) => id !== grupoId));
    } else {
      onMudar([...selecionados, grupoId]);
    }
  }

  const nomeDoGrupo = (id) => grupos.find((g) => g.id === id)?.nome || '';

  return (
    <div className="seletor-grupos" ref={containerRef}>
      <div className="seletor-grupos-input" onClick={() => setAberto((v) => !v)}>
        <div className="seletor-grupos-badges">
          {selecionados.length === 0 && <span className="placeholder">Selecionar grupos</span>}
          {selecionados.map((id) => (
            <span key={id} className="badge">
              {nomeDoGrupo(id)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  alternar(id);
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <span className="chevron">{aberto ? '▲' : '▼'}</span>
      </div>

      {aberto && (
        <div className="seletor-grupos-lista">
          {grupos.map((grupo) => (
            <label key={grupo.id} className="seletor-grupos-item">
              <input
                type="checkbox"
                checked={selecionados.includes(grupo.id)}
                onChange={() => alternar(grupo.id)}
              />
              {grupo.nome}
            </label>
          ))}
          {grupos.length === 0 && <div className="seletor-grupos-vazio">Nenhum grupo cadastrado ainda.</div>}
        </div>
      )}
    </div>
  );
}
