import React, { useState } from 'react';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import './ReviewModal.css';

interface ReviewModalProps {
  reviewedUserId: number;
  reviewedUserName: string;
  jobPostId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  reviewedUserId,
  reviewedUserName,
  jobPostId,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Selectează un rating între 1 și 5 stele.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/users/${reviewedUserId}/review`, { rating, comment: comment.trim(), jobPostId });
      onSuccess();
    } catch (e) {
      setError(extractApiError(e, 'Eroare la trimiterea recenziei.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box review-modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="review-modal-title">Lasă o recenzie</h3>
        <p className="review-modal-sub">pentru <strong>{reviewedUserName}</strong></p>

        <div className="star-selector">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= (hovered || rating) ? 'active' : ''}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} stele`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="star-label">
            {rating === 1 ? 'Slab' : rating === 2 ? 'Acceptabil' : rating === 3 ? 'Bun' : rating === 4 ? 'Foarte bun' : 'Excelent'}
          </p>
        )}

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Comentariu <span className="text-muted">(opțional, max. 500 caractere)</span></label>
          <textarea
            rows={3}
            placeholder="Descrie experiența ta cu acest utilizator..."
            value={comment}
            maxLength={500}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Anulează
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            autoFocus
          >
            {loading ? 'Se trimite...' : 'Trimite recenzia'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
