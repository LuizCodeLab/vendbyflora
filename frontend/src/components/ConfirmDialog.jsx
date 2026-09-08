// Modal de confirmação feito em React, para substituir window.confirm().
// Usamos isso porque o window.confirm() nativo do Electron pode fazer a
// janela perder o foco do teclado depois de fechar, travando a digitação.
export default function ConfirmDialog({ mensagem, onConfirmar, onCancelar }) {
  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div className="confirm-caixa" onClick={(e) => e.stopPropagation()}>
        <p>{mensagem}</p>
        <div className="confirm-botoes">
          <button type="button" className="confirm-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="confirm-excluir" onClick={onConfirmar}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}