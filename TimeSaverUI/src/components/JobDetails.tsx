import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { API_ORIGIN } from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import type { JobPost, JobPostImage } from '../types';
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
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

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

  const showConfirm = (message: string, action: () => Promise<void>, opts = { confirmLabel: 'Confirma', danger: false }) => {
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
      setApplyStatus({ type: 'success', msg: 'Aplicatie trimisa cu succes!' });
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
      'Accepti aceasta aplicatie? Celelalte vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/accept`, { applicationId: appId });
          setNotification({ type: 'success', msg: 'Aplicatie acceptata!' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la acceptare.') });
        }
      },
      { confirmLabel: 'Accepta', danger: false }
    );
  };

  const completeJob = () => {
    showConfirm(
      'Marchezi jobul ca finalizat? Actiunea nu poate fi anulata.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/complete`);
          setNotification({ type: 'success', msg: 'Job finalizat!' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la finalizare.') });
        }
      },
      { confirmLabel: 'Finalizeaza', danger: false }
    );
  };

  const cancelJob = () => {
    showConfirm(
      'Anulezi acest job? Aplicatiile in asteptare vor fi respinse automat.',
      async () => {
        try {
          await api.put(`/JobPosts/${id}/cancel`);
          setNotification({ type: 'success', msg: 'Jobul a fost anulat.' });
          fetchJob();
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la anulare.') });
        }
      },
      { confirmLabel: 'Anuleaza jobul', danger: true }
    );
  };

  const deleteJob = () => {
    showConfirm(
      'Stergi definitiv acest job? Actiunea este ireversibila.',
      async () => {
        try {
          await api.delete(`/JobPosts/${id}`);
          navigate('/my-jobs');
        } catch (e) {
          setNotification({ type: 'error', msg: extractApiError(e, 'Eroare la stergere.') });
        }
      },
      { confirmLabel: 'Sterge', danger: true }
    );
  };

  const handleReviewSuccess = () => {
    setReviewState(null);
    setNotification({ type: 'success', msg: 'Recenzia a fost trimisa cu succes!' });
    fetchReviewedIds();
  };

  // ── Image upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let hasError = false;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        await api.post(`/JobPosts/${id}/images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (err) {
        setNotification({ type: 'error', msg: extractApiError(err, 'Eroare la incarcarea imaginii.') });
        hasError = true;
        break;
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await fetchJob();
    if (!hasError) setNotification({ type: 'success', msg: 'Imagini incarcate cu succes!' });
  };

  const handleDeleteImage = async (imgId: number) => {
    try {
      await api.delete(`/JobPosts/${id}/images/${imgId}`);
      await fetchJob();
    } catch (err) {
      setNotification({ type: 'error', msg: extractApiError(err, 'Eroare la stergerea imaginii.') });
    }
  };

  const handleSetMain = async (imgId: number) => {
    try {
      await api.put(`/JobPosts/${id}/images/${imgId}/main`);
      await fetchJob();
    } catch (err) {
      setNotification({ type: 'error', msg: extractApiError(err, 'Eroare la actualizarea imaginii principale.') });
    }
  };

  const sortedImages = (job?.images ?? []).slice().sort((a, b) => Number(b.isMain) - Number(a.isMain));

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return <div className="loading-wrap">Se incarca...</div>;
  if (!job) return (
    <div className="page-wrap">
      <div className="empty-state">
        <h3>Job negasit</h3>
        <p>Jobul nu exista sau nu ai acces.</p>
        <Link to="/explore" className="btn btn-outline" style={{ marginTop: '1rem' }}>Inapoi la explorare</Link>
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

      {/* Lightbox */}
      {lightboxImg && (
        <div className="jd-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="preview" />
        </div>
      )}

      <Link to="/explore" className="back-link">Inapoi la explorare</Link>

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
                <span>{s === 'Open' ? 'Disponibil' : s === 'InProgress' ? 'In desfasurare' : 'Finalizat'}</span>
              </div>
              {i < 2 && <div className={`jd-status-line ${isDone && i < currentIdx ? 'done' : ''}`} />}
            </React.Fragment>
          );
        })}
        {job.status === 'Cancelled' && (
          <div className="jd-status-cancelled">Anulat</div>
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
                <h3>Cerinte speciale</h3>
                <p>{job.specialRequirements}</p>
              </div>
            )}

            {/* Image gallery — visible to all */}
            {sortedImages.length > 0 && (
              <div className="jd-section">
                <h3>Imagini ({sortedImages.length})</h3>
                <div className="jd-gallery">
                  {sortedImages.map((img: JobPostImage) => (
                    <div key={img.id} className={`jd-gallery-item ${img.isMain ? 'jd-gallery-main' : ''}`}>
                      <img
                        src={API_ORIGIN + img.imageUrl}
                        alt={img.isMain ? 'Imagine principala' : 'Imagine job'}
                        onClick={() => setLightboxImg(API_ORIGIN + img.imageUrl)}
                        className="jd-gallery-img"
                      />
                      {img.isMain && <span className="jd-gallery-badge">Principala</span>}
                      {isOwner && (
                        <div className="jd-gallery-controls">
                          {!img.isMain && (
                            <button
                              className="btn btn-ghost btn-xs"
                              title="Seteaza ca principala"
                              onClick={() => handleSetMain(img.id)}
                            >
                              ★
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-xs"
                            title="Sterge imaginea"
                            onClick={() => handleDeleteImage(img.id)}
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload — owner only */}
            {isOwner && sortedImages.length < 10 && (
              <div className="jd-section jd-upload-section">
                <h3>Adauga imagini</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Max. 10 imagini, max. 5 MB fiecare. Formate: JPG, PNG, WebP, GIF.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Se incarca...' : '📷 Alege imagini'}
                </button>
                {uploading && (
                  <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>
                    Se incarca...
                  </span>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="jd-owner-actions">
                {job.status === 'InProgress' && (
                  <button className="btn btn-success" onClick={completeJob}>Marcheaza finalizat</button>
                )}
                {(job.status === 'Open' || job.status === 'InProgress') && (
                  <button className="btn btn-outline" onClick={cancelJob}>Anuleaza job</button>
                )}
                {job.status === 'Open' && (
                  <button className="btn btn-danger btn-sm" onClick={deleteJob}>🗑 Sterge job</button>
                )}
                {job.status === 'Completed' && job.acceptedByUserId && !reviewedIds.has(job.acceptedByUserId) && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setReviewState({ userId: job.acceptedByUserId!, userName: job.acceptedByUser?.name ?? 'Prestator' })}
                  >
                    Recenzeaza prestatorul
                  </button>
                )}
                {job.status === 'Completed' && job.acceptedByUserId && reviewedIds.has(job.acceptedByUserId) && (
                  <span className="review-given-badge">Ai lasat o recenzie</span>
                )}
              </div>
            )}

            {/* Worker actions */}
            {isWorker && !isOwner && (
              <div className="jd-owner-actions">
                {job.status === 'InProgress' && (
                  <button className="btn btn-success" onClick={completeJob}>Marcheaza finalizat</button>
                )}
                {job.status === 'Completed' && !reviewedIds.has(job.userId) && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setReviewState({ userId: job.userId, userName: job.user?.name ?? 'Angajator' })}
                  >
                    Recenzeaza angajatorul
                  </button>
                )}
                {job.status === 'Completed' && reviewedIds.has(job.userId) && (
                  <span className="review-given-badge">Ai lasat o recenzie</span>
                )}
              </div>
            )}
          </div>

          {/* Apply section */}
          {!isOwner && !isWorker && job.status === 'Open' && (
            <div className="card jd-apply-card">
              <h3>Aplica la acest job</h3>
              {applied ? (
                <div className="alert alert-success">Ai aplicat deja la acest job.</div>
              ) : (
                <>
                  {applyStatus && (
                    <div className={`alert alert-${applyStatus.type}`}>{applyStatus.msg}</div>
                  )}
                  <div className="form-group">
                    <label>Mesajul tau * <span className="text-muted" style={{ fontSize: '0.82rem' }}>(min. 10 caractere)</span></label>
                    <textarea
                      rows={4}
                      placeholder="Descrie de ce esti potrivit pentru acest task, experienta ta relevanta..."
                      value={applyMsg}
                      onChange={e => { setApplyMsg(e.target.value); setApplyStatus(null); }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                    {applying ? 'Se trimite...' : '📩 Trimite aplicatia'}
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
              <h3>Aplicatii ({job.jobApplications.length})</h3>
              <div className="jd-apps-list">
                {job.jobApplications.map(app => (
                  <div key={app.id} className="jd-app-item">
                    <div className="jd-app-header">
                      <Link to={`/users/${app.userId}/profile`} className="jd-app-name">
                        👤 {app.user?.name ?? `User #${app.userId}`}
                      </Link>
                      <span className={`badge badge-${app.jobApplicationStatus.toLowerCase()}`}>
                        {app.jobApplicationStatus === 'Accepted' ? 'Acceptat' : app.jobApplicationStatus === 'Rejected' ? 'Respins' : 'In asteptare'}
                      </span>
                    </div>
                    <p className="jd-app-msg">"{app.message}"</p>
                    {job.status === 'Open' && app.jobApplicationStatus === 'Pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => acceptApp(app.id)}>
                        Accepta
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
