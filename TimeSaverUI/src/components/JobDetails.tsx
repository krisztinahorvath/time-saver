import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import type { JobPost } from '../types';
import { CATEGORY_LABELS, STATUS_LABELS } from '../types';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';
import Chat from './Chat';
import './JobDetails.css';

interface ConfirmState {
  message: string;
  confirmLabel: string;
  danger: boolean;
  action: () => Promise<void>;
}

interface ReviewState {
  userId: number;
  userName: string;
}

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyStatus, setApplyStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  // IDs the current user has already reviewed
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const fetchJob = async () => {
    try {
      const res = await api.get<JobPost>(`/JobPosts/${id}`);
      setJob(res.data);
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewedIds = async () => {
    try {
      const res = await api.get<number[]>('/reviews/given');
      setReviewedIds(new Set(res.data));
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchJob();
    fetchReviewedIds();
  }, [id]);

  const isOwner  = job?.userId === user?.userId;
  const isWorker = job?.acceptedByUserId === user?.userId;
  const applied  = job?.jobApplications?.some(a => a.userId === user?.userId) ?? false;
  const canChat  = (isOwner || isWorker) && (job?.status === 'InProgress' || job?.status === 'Completed');

  const showConfirm = (message: string, action: () => Promise<void>, opts = { confirmLabel: 'Confirmă', danger: false }) => {
    setConfirmState({ message, action, confirmLabel: opts.confirmLabel, danger: opts.danger });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const fn = confirmState.action;
    setConfirmState(null);
    await fn();
  };

  const handleApply = async () => {
    const trimmed = applyMsg.trim();
    if (!trimmed || trimmed.length < 10) {
      setApplyStatus({ type: 'error', msg: 'Scrie un mesaj de aplicare (min. 10 caractere).' });
      return;
    }
    setApplying(true);
    try {
      await api.post('/JobApplications', { jobPostId: Number(id), message: trimmed });
      setApplyStatus({ type: 'success', msg: 'Aplicație trimisă cu succes!' });
      setApplyMsg('');
      fetchJob();
    } catch (e) {
      setApplyStatus({ type: 'error', msg: extractApiError(e, 'Eroare la aplicare.') });
    } finally {
      setApplying(false);
    }
  };

  const acceptApp = (appId: number) => {
    showConfirm(
      'Accepți această aplicație? Celelalte vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/accept`, { applicationId: appId });
          setNotification({ type: 'success', msg: 'Aplicație acceptată!' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la acceptare.') });
        }
      },
      { confirmLabel: 'Acceptă', danger: false }
    );
  };

  const completeJob = () => {
    showConfirm(
      'Marchezi jobul ca finalizat? Acțiunea nu poate fi anulată.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/complete`);
          setNotification({ type: 'success', msg: 'Job finalizat!' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la finalizare.') });
        }
      },
      { confirmLabel: 'Finalizează', danger: false }
    );
  };

  const cancelJob = () => {
    showConfirm(
      'Anulezi acest job? Aplicațiile în așteptare vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/cancel`);
          setNotification({ type: 'success', msg: 'Jobul a fost anulat.' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la anulare.') });
        }
      },
      { confirmLabel: 'Anulează jobul', danger: true }
    );
  };

  const deleteJob = () => {
    showConfirm(
      'Ștergi definitiv acest job? Acțiunea este ireversibilă.',
      async () => {
        try {
          await api.delete(`/JobPosts/${id}`);
          navigate('/my-jobs');
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la ștergere.') });
        }
      },
      { confirmLabel: 'Șterge', danger: true }
    );
  };

  const handleReviewSuccess = () => {
    setReviewState(null);
    setNotification({ type: 'success', msg: 'Recenzia a fost trimisă cu succes!' });
    fetchReviewedIds();
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;
  if (!job) return (
    <div className="page-wrap">
      <div className="empty-state">
        <h3>Job negăsit</h3>
        <p>Jobul nu există sau nu ai acces.</p>
        <Link to="/explore" className="btn btn-outline" style={{ marginTop: '1rem' }}>← Înapoi la explorare</Link>
      </div>
    </div>
  );

  return (
    <div className="page-wrap">
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {reviewState && (
        <ReviewModal
          reviewedUserId={reviewState.userId}
          reviewedUserName={reviewState.userName}
          onClose={() => setReviewState(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <Link to="/explore" className="back-link">← Înapoi la explorare</Link>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ margin: '1rem 0' }}>
          {notification.msg}
        </div>
      )}

      {/* Status timeline */}
      <div className="jd-status-bar">
        {(['Open', 'InProgress', 'Completed'] as const).map((s, i) => {
          const steps = ['Open', 'InProgress', 'Completed'];
          const currentIdx = steps.indexOf(job.status);
          const isCancelled = job.status === 'Cancelled';
          const isDone = isCancelled ? false : i <= currentIdx;
          return (
            <React.Fragment key={s}>
              <div className={`jd-status-step ${isDone ? 'done' : ''} ${job.status === s ? 'current' : ''}`}>
                <div className="jd-status-dot" />
                <span>{s === 'Open' ? 'Disponibil' : s === 'InProgress' ? 'În desfășurare' : 'Finalizat'}</span>
              </div>
              {i < 2 && <div className={`jd-status-line ${isDone && i < currentIdx ? 'done' : ''}`} />}
            </React.Fragment>
          );
        })}
        {job.status === 'Cancelled' && (
          <div className="jd-status-cancelled">✕ Anulat</div>
        )}
      </div>

      <div className="jd-layout">
        <div className="jd-main">
          <div className="card">
            <div className="jd-header">
              <div className="jd-category">{CATEGORY_LABELS[job.category] ?? job.category}</div>
              <span className={`badge badge-${job.status.toLowerCase()}`}>
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </div>

            <h1 className="jd-title">{job.title}</h1>

            <div className="jd-meta">
              <div className="jd-meta-item"><span>💰</span><strong>{job.budget} RON</strong></div>
              <div className="jd-meta-item"><span>📍</span>{job.location}</div>
              <div className="jd-meta-item"><span>📅</span>{new Date(job.createdAt).toLocaleDateString('ro-RO')}</div>
              {job.deadline && (
                <div className="jd-meta-item"><span>⏰</span>Termen: {new Date(job.deadline).toLocaleDateString('ro-RO')}</div>
              )}
            </div>

            <div className="jd-section">
              <h3>Descriere</h3>
              <p>{job.description}</p>
            </div>

            {job.specialRequirements && (
              <div className="jd-section">
                <h3>Cerințe speciale</h3>
                <p>{job.specialRequirements}</p>
              </div>
            )}

            {job.images && job.images.length > 0 && (
              <div className="jd-section">
                <h3>Imagini</h3>
                <div className="jd-images">
                  {job.images.map(img => (
                    <img key={img.id} src={img.imageUrl} alt="job" className="jd-img" />
                  ))}
                </div>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="jd-owner-actions">
                {job.status === 'InProgress' && (
                  <button className="btn btn-success" onClick={completeJob}>✓ Marchează finalizat</button>
                )}
                {(job.status === 'Open' || job.status === 'InProgress') && (
                  <button className="btn btn-outline" onClick={cancelJob}>✕ Anulează job</button>
                )}
                {job.status === 'Open' && (
                  <button className="btn btn-danger btn-sm" onClick={deleteJob}>🗑 Șterge job</button>
                )}
                {/* Employer reviews worker after completion */}
                {job.status === 'Completed' && job.acceptedByUserId && !reviewedIds.has(job.acceptedByUserId) && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setReviewState({ userId: job.acceptedByUserId!, userName: job.acceptedByUser?.name ?? 'Prestator' })}
                  >
                    ★ Recenzează prestatorul
                  </button>
                )}
                {job.status === 'Completed' && job.acceptedByUserId && reviewedIds.has(job.acceptedByUserId) && (
                  <span className="review-given-badge">✓ Ai lăsat o recenzie</span>
                )}
              </div>
            )}

            {/* Worker actions */}
            {isWorker && !isOwner && (
              <div className="jd-owner-actions">
                {job.status === 'InProgress' && (
                  <button className="btn btn-success" onClick={completeJob}>✓ Marchează finalizat</button>
                )}
                {/* Worker reviews employer after completion */}
                {job.status === 'Completed' && !reviewedIds.has(job.userId) && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setReviewState({ userId: job.userId, userName: job.user?.name ?? 'Angajator' })}
                  >
                    ★ Recenzează angajatorul
                  </button>
                )}
                {job.status === 'Completed' && reviewedIds.has(job.userId) && (
                  <span className="review-given-badge">✓ Ai lăsat o recenzie</span>
                )}
              </div>
            )}
          </div>

          {/* Apply section */}
          {!isOwner && !isWorker && job.status === 'Open' && (
            <div className="card jd-apply-card">
              <h3>Aplică la acest job</h3>
              {applied ? (
                <div className="alert alert-success">✓ Ai aplicat deja la acest job.</div>
              ) : (
                <>
                  {applyStatus && (
                    <div className={`alert alert-${applyStatus.type}`}>{applyStatus.msg}</div>
                  )}
                  <div className="form-group">
                    <label>Mesajul tău * <span className="text-muted" style={{ fontSize: '0.82rem' }}>(min. 10 caractere)</span></label>
                    <textarea
                      rows={4}
                      placeholder="Descrie de ce ești potrivit pentru acest task, experiența ta relevantă..."
                      value={applyMsg}
                      onChange={e => { setApplyMsg(e.target.value); setApplyStatus(null); }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                    {applying ? 'Se trimite...' : '📩 Trimite aplicația'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Chat */}
          {canChat && (
            <Chat
              jobPostId={job.id}
              otherPartyName={
                isOwner
                  ? (job.acceptedByUser?.name ?? 'Prestator')
                  : (job.user?.name ?? 'Angajator')
              }
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="jd-sidebar">
          {job.user && (
            <div className="card jd-poster-card">
              <h3>Postat de</h3>
              <div className="jd-poster-name">{job.user.name}</div>
              <Link to={`/users/${job.userId}/profile`} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}>
                Vezi profil
              </Link>
            </div>
          )}

          {job.status === 'InProgress' && job.acceptedByUser && (
            <div className="card jd-accepted-card">
              <h3>Prestator acceptat</h3>
              <div className="jd-poster-name">{job.acceptedByUser.name}</div>
              <Link to={`/users/${job.acceptedByUserId}/profile`} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}>
                Vezi profil
              </Link>
            </div>
          )}

          {/* Applications list (owner only) */}
          {isOwner && job.jobApplications && job.jobApplications.length > 0 && (
            <div className="card">
              <h3>Aplicații ({job.jobApplications.length})</h3>
              <div className="jd-apps-list">
                {job.jobApplications.map(app => (
                  <div key={app.id} className="jd-app-item">
                    <div className="jd-app-header">
                      <Link to={`/users/${app.userId}/profile`} className="jd-app-name">
                        👤 {app.user?.name ?? `User #${app.userId}`}
                      </Link>
                      <span className={`badge badge-${app.jobApplicationStatus.toLowerCase()}`}>
                        {app.jobApplicationStatus === 'Accepted' ? 'Acceptat' : app.jobApplicationStatus === 'Rejected' ? 'Respins' : 'În așteptare'}
                      </span>
                    </div>
                    <p className="jd-app-msg">"{app.message}"</p>
                    {job.status === 'Open' && app.jobApplicationStatus === 'Pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => acceptApp(app.id)}>
                        Acceptă
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
