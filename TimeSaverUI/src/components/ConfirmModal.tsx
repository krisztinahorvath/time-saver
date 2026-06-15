import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  danger = false,
  onConfirm,
  onCancel,
}) => (
  <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <p className="modal-msg">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
