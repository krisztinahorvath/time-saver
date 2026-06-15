import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { JobPost } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS } from '../types';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';
import './MyJobs.css';

function statusBadge(status: string) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </span>
  );
}

function appBadge(status: string) {
  const label = status === 'Accepted' ? 'Acceptat' : status === 'Rejected' ? 'Respins' : 'În așteptare';
  return <span className={`badge badge-${status.toLowerCase()}`}>{label}</span>;
}

interface ConfirmState {
  message: string;
  confirmLabel: string;
  danger: boolean;
  action: () => Promise<void>;
}

interface ReviewTarget {
  userId: number;
  userName: string;
}

const MyJobs: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const fetchJobs = async () => {
    try {
      const res = await api.get<JobPost[]>('/JobPosts/mine');
      setJobs(res.data);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea joburilor.', type: 'error' });
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
    fetchJobs();
    fetchReviewedIds();
  }, []);

  const showConfirm = (message: string, action: () => Promise<void>, opts = { confirmLabel: 'Confirmă', danger: false }) => {
    setConfirmState({ message, action, confirmLabel: opts.confirmLabel, danger: opts.danger });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const fn = confirmState.action;
    setConfirmState(null);
    await fn();
  };

  const acceptApp = (jobId: number, appId: number) => {
    showConfirm(
      'Accepți această aplicație? Celelalte vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${jobId}/accept`, { applicationId: appId });
          setNotification({ msg: 'Aplicație acceptată cu succes!', type: 'success' });
          fetchJobs();
        } catch (e) {
          setNotification({ msg: extractApiError(e, 'Eroare la acceptare.'), type: 'error' });
        }
      },
      { confirmLabel: 'Acceptă', danger: false }
    );
  };

  const completeJob = (jobId: number) => {
    showConfirm(
      'Marchezi jobul ca finalizat? Acțiunea nu poate fi anulată.',
      async () => {
        try {
          await api.put(`/JobPosts/${jobId}/complete`);
          setNotification({ msg: 'Job finalizat cu succes!', type: 'success' });
          fetchJobs();
        } catch (e) {
          setNotification({ msg: extractApiError(e, 'Eroare la finalizare.'), type: 'error' });
        }
      },
      { confirmLabel: 'Finalizează', danger: false }
    );
  };

  const cancelJob = (jobId: number) => {
    showConfirm(
      'Anulezi acest job? Aplicațiile în așteptare vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${jobId}/cancel`);
          setNotification({ msg: 'Jobul a fost anulat.', type: 'success' });
          fetchJobs();
        } catch (e) {
          setNotification({ msg: extractApiError(e, 'Eroare la anulare.'), type: 'error' });
        }
      },
      { confirmLabel: 'Anulează jobul', danger: true }
    );
  };

  const deleteJob = (jobId: number) => {
    showConfirm(
      'Ștergi definitiv acest job? Acțiunea este ireversibilă.',
      async () => {
        try {
          await api.delete(`/JobPosts/${jobId}`);
          setNotification({ msg: 'Job șters.', type: 'success' });
          fetchJobs();
        } catch (e) {
          setNotification({ msg: extractApiError(e, 'Eroare la ștergere.'), type: 'error' });
        }
      },
      { confirmLabel: 'Șterge', danger: true }
    );
  };

  const handleReviewSuccess = () => {
    setReviewTarget(null);
    setNotification({ msg: 'Recenzie trimisă cu succes!', type: 'success' });
    fetchReviewedIds();
  };

  if (loading) return <div className="loading-wrap">Se încarcă joburile...</div>;

  const open      = jobs.filter(j => j.status === 'Open');
  const active    = jobs.filter(j => j.status === 'InProgress');
  const completed = jobs.filter(j => j.status === 'Completed');
  const cancelled = jobs.filter(j => j.status === 'Cancelled');

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

      {reviewTarget && (
        <ReviewModal
          reviewedUserId={reviewTarget.userId}
          reviewedUserName={reviewTarget.userName}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <div className="mj-header">
        <div>
          <h1>Joburile mele</h1>
          <p className="text-muted">Gestionează taskurile postate</p>
        </div>
        <Link to="/post-job" className="btn btn-primary">+ Job nou</Link>
      </div>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
          {notification.msg}
        </div>
      )}

      {/* Stats */}
      {jobs.length > 0 && (
        <div className="dash-stats" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card"><div className="stat-num">{open.length}</div><div className="stat-label">Disponibile</div></div>
          <div className="stat-card"><div className="stat-num" style={{ color: 'var(--primary)' }}>{active.length}</div><div className="stat-label">În desfășurare</div></div>
          <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{completed.length}</div><div className="stat-label">Finalizate</div></div>
          <div className="stat-card"><div className="stat-num" style={{ color: 'var(--danger)' }}>{cancelled.length}</div><div className="stat-label">Anulate</div></div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job postat</h3>
          <p>Postează primul tău task pentru a primi oferte de la prestatori.</p>
          <Link to="/post-job" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Postează acum
          </Link>
        </div>
      ) : (
        <div className="mj-list">
          {jobs.map(job => {
            const workerReviewed = job.acceptedByUserId !== undefined && reviewedIds.has(job.acceptedByUserId);
            return (
              <div key={job.id} className="mj-card card">
                <div className="mj-card-header">
                  <div className="mj-title-row">
                    <Link to={`/jobs/${job.id}`} className="mj-title">{job.title}</Link>
                    {statusBadge(job.status)}
                  </div>
                  <div className="mj-meta">
                    <span>💰 {job.budget} RON</span>
                    <span>📍 {job.location}</span>
                    <span>🏷️ {CATEGORY_LABELS[job.category] ?? job.category}</span>
                    <span>📅 {new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                    {job.deadline && <span>⏰ Termen: {new Date(job.deadline).toLocaleDateString('ro-RO')}</span>}
                  </div>

                  <div className="mj-actions">
                    {job.status === 'InProgress' && (
                      <button className="btn btn-success btn-sm" onClick={() => completeJob(job.id)}>
                        ✓ Finalizează
                      </button>
                    )}
                    {(job.status === 'Open' || job.status === 'InProgress') && (
                      <button className="btn btn-outline btn-sm" onClick={() => cancelJob(job.id)}>
                        ✕ Anulează
                      </button>
                    )}
                    {job.status === 'Open' && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteJob(job.id)}>
                        🗑 Șterge
                      </button>
                    )}
                    {/* Review worker after job completion */}
                    {job.status === 'Completed' && job.acceptedByUserId && (
                      workerReviewed ? (
                        <span className="review-given-badge">✓ Recenzie trimisă</span>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setReviewTarget({
                            userId: job.acceptedByUserId!,
                            userName: job.acceptedByUser?.name ?? 'Prestatorul'
                          })}
                        >
                          ★ Recenzează prestatorul
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Accepted worker info */}
                {job.status === 'InProgress' && job.acceptedByUser && (
                  <div className="mj-accepted-info">
                    ✅ Prestator acceptat:{' '}
                    <Link to={`/users/${job.acceptedByUserId}/profile`}>
                      <strong>{job.acceptedByUser.name}</strong>
                    </Link>
                  </div>
                )}

                {/* Applications */}
                <div className="mj-apps-section">
                  <h4>Aplicații ({job.jobApplications?.length ?? 0})</h4>
                  {!job.jobApplications || job.jobApplications.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nicio aplicație primită.</p>
                  ) : (
                    <div className="mj-apps-list">
                      {job.jobApplications.map(app => (
                        <div key={app.id} className={`mj-app-row ${app.jobApplicationStatus.toLowerCase()}`}>
                          <div className="mj-app-user">
                            <Link to={`/users/${app.userId}/profile`}>
                              👤 {app.user?.name ?? `User #${app.userId}`}
                            </Link>
                            {appBadge(app.jobApplicationStatus)}
                          </div>
                          <p className="mj-app-msg">"{app.message}"</p>
                          {job.status === 'Open' && app.jobApplicationStatus === 'Pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => acceptApp(job.id, app.id)}
                            >
                              Acceptă
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyJobs;
