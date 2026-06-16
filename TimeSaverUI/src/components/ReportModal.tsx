import React, { useState } from 'react';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { ReportType } from '../types';
import './Admin.css';

interface ReportModalProps {
  type: ReportType;
  targetId: number;
  targetLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ type, targetId, targetLabel, onClose, onSuccess }) => {
  const [reason,  setReason]  = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const typeLabel = type === 'User' ? 'utilizatorul' : type === 'Job' ? 'jobul' : 'recenzia';

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError('Motivul trebuie să aibă cel puțin 10 caractere.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/Reports', {
        type,
        reason: reason.trim(),
        reportedUserId:    type === 'User'   ? targetId : undefined,
        reportedReviewId:  type === 'Review' ? targetId : undefined,
        reportedJobPostId: type === 'Job'    ? targetId : undefined,
      });
      onSuccess();
    } catch (e) {
      setError(extractApiError(e, 'Eroare la trimiterea raportului.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <h2>Raportează {typeLabel}</h2>
        <p className="text-muted">
          Raportezi: <strong>{targetLabel}</strong>. Echipa noastră va analiza raportul.
        </p>

        <div className="form-group">
          <label>Motivul raportului * <span className="text-muted" style={{ fontSize: '0.8rem' }}>(min. 10 caractere)</span></label>
          <textarea
            rows={4}
            placeholder="Descrie de ce raportezi această entitate..."
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
          />
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

        <div className="report-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <button className="btn btn-danger" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Se trimite...' : '🚩 Trimite raport'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
