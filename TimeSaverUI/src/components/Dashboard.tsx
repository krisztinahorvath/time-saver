import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { JobPost, JobApplication, GivenReviewEntry } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS } from '../types';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';
import PlusBadge from './PlusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import './Dashboard.css';

function statusBadge(status: string) {
  const cls = status.toLowerCase();
  return <span className={`badge badge-${cls}`}>{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}</span>;
}

function appBadge(status: string) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {status === 'Accepted' ? 'Acceptat' : status === 'Rejected' ? 'Respins' : 'În așteptare'}
    </span>
  );
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
  jobPostId: number;
}

// ─── EMPLOYER DASHBOARD ────────────────────────────────────────────────────────

const EmployerDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const fetchJobs = async () => {
    try {
      const res = await api.get<JobPost[]>('/JobPosts/mine');
      setJobs(res.data);
    } catch {
      setMsg({ text: 'Eroare la încărcarea joburilor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewedIds = async () => {
    try {
      const res = await api.get<GivenReviewEntry[]>('/reviews/given');
      setReviewedIds(new Set(res.data.map(e => `${e.reviewedUserId}_${e.jobPostId}`)));
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
          setMsg({ text: 'Aplicație acceptată cu succes!', type: 'success' });
          await fetchJobs();
        } catch (e) {
          setMsg({ text: extractApiError(e, 'Eroare la acceptare.'), type: 'error' });
        }
      },
      { confirmLabel: 'Acceptă', danger: false }
    );
  };

  const handleReviewSuccess = () => {
    setReviewTarget(null);
    setMsg({ text: 'Recenzie trimisă cu succes!', type: 'success' });
    fetchReviewedIds();
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;

  const openJobs      = jobs.filter(j => j.status === 'Open');
  const activeJobs    = jobs.filter(j => j.status === 'InProgress');
  const completedJobs = jobs.filter(j => j.status === 'Completed');
  const totalApps     = jobs.reduce((s, j) => s + (j.jobApplications?.length || 0), 0);
  const pendingApps   = jobs.reduce((s, j) => s + (j.jobApplications?.filter(a => a.jobApplicationStatus === 'Pending').length || 0), 0);

  // Jobs needing action: Open with pending apps or InProgress needing completion
  const actionNeeded = jobs.filter(j =>
    (j.status === 'Open' && (j.jobApplications?.some(a => a.jobApplicationStatus === 'Pending') ?? false)) ||
    j.status === 'InProgress'
  );

  return (
    <div>
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
          jobPostId={reviewTarget.jobPostId}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <div className="dash-header">
        <div>
          <h1>Bun venit, {user?.name}! 👋</h1>
          <p className="text-muted">Gestionează taskurile și aplicațiile primite</p>
        </div>
        <Link to="/post-job" className="btn btn-primary">+ Postează job nou</Link>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.text}
        </div>
      )}

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-num">{openJobs.length}</div>
          <div className="stat-label">Disponibile</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{activeJobs.length}</div>
          <div className="stat-label">În desfășurare</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--success)' }}>{completedJobs.length}</div>
          <div className="stat-label">Finalizate</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: pendingApps > 0 ? 'var(--warning)' : undefined }}>{pendingApps}</div>
          <div className="stat-label">Aplicații noi</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalApps}</div>
          <div className="stat-label">Total aplicații</div>
        </div>
      </div>

      {/* Action needed section */}
      {actionNeeded.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: '1.5rem' }}>⚡ Necesită atenție</h2>
          <div className="dash-jobs">
            {actionNeeded.map(job => (
              <div key={job.id} className="dash-job-card dash-job-card--highlight">
                <div className="djc-header">
                  <div>
                    <div className="djc-title">
                      <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                      {statusBadge(job.status)}
                    </div>
                    <div className="djc-meta">
                      <span>💰 {job.budget} RON</span>
                      <span>📍 {job.location}</span>
                      <span>🏷️ {CATEGORY_LABELS[job.category] ?? job.category}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {job.status === 'InProgress' && (
                      <>
                        {job.payment?.status === 'PaidHeld' && (
                          <PaymentStatusBadge status="PaidHeld" />
                        )}
                        {(!job.payment || job.payment.status === 'NotStarted' || job.payment.status === 'CheckoutPending') && (
                          <Link to={`/jobs/${job.id}`} className="btn btn-primary btn-sm">💳 Plătește</Link>
                        )}
                        {job.payment?.status === 'ReleasedToWorker' && (
                          <PaymentStatusBadge status="ReleasedToWorker" workerAmount={job.payment.workerAmount} hasTransfer={!!job.payment.stripeTransferId} />
                        )}
                      </>
                    )}
                    <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-sm">Gestionează</Link>
                  </div>
                </div>

                {job.status === 'Open' && job.jobApplications && job.jobApplications.length > 0 && (
                  <div className="djc-apps">
                    <h4>Aplicații în așteptare ({job.jobApplications.filter(a => a.jobApplicationStatus === 'Pending').length})</h4>
                    <div className="apps-list">
                      {job.jobApplications
                        .filter(a => a.jobApplicationStatus === 'Pending')
                        .map(app => (
                          <div key={app.id} className="app-row">
                            <div className="app-info">
                              <div className="app-user">
                                <Link to={`/users/${app.userId}/profile`}>👤 {app.user?.name ?? `User #${app.userId}`}</Link>
                                {app.user?.isPlusSubscriber && <PlusBadge size="sm" />}
                                {appBadge(app.jobApplicationStatus)}
                              </div>
                              <p className="app-msg">"{app.message}"</p>
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => acceptApp(job.id, app.id)}
                            >
                              Acceptă
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Completed jobs needing review */}
      {completedJobs.some(j => j.acceptedByUserId && !reviewedIds.has(`${j.acceptedByUserId}_${j.id}`)) && (
        <>
          <h2 className="section-title" style={{ marginTop: '1.5rem' }}>★ Lasă recenzii</h2>
          <div className="dash-review-list">
            {completedJobs
              .filter(j => j.acceptedByUserId && !reviewedIds.has(`${j.acceptedByUserId}_${j.id}`))
              .map(job => (
                <div key={job.id} className="dash-review-card card">
                  <div>
                    <Link to={`/jobs/${job.id}`} className="dash-review-job">{job.title}</Link>
                    <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      Prestator: <strong>{job.acceptedByUser?.name ?? `#${job.acceptedByUserId}`}</strong>
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setReviewTarget({
                      userId: job.acceptedByUserId!,
                      userName: job.acceptedByUser?.name ?? 'Prestator',
                      jobPostId: job.id,
                    })}
                  >
                    ★ Trimite o recenzie prestatorului
                  </button>
                </div>
              ))}
          </div>
        </>
      )}

      {/* All jobs */}
      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Toate joburile</h2>
      {jobs.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job postat încă</h3>
          <p>Postează primul tău task și primești aplicații de la prestatori locali.</p>
          <Link to="/post-job" className="btn btn-primary" style={{ marginTop: '1rem' }}>Postează acum</Link>
        </div>
      ) : (
        <div className="dash-jobs">
          {jobs.map(job => (
            <div key={job.id} className="dash-job-card">
              <div className="djc-header">
                <div>
                  <div className="djc-title">
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                    {statusBadge(job.status)}
                  </div>
                  <div className="djc-meta">
                    <span>💰 {job.budget} RON</span>
                    <span>📍 {job.location}</span>
                    <span>🏷️ {CATEGORY_LABELS[job.category] ?? job.category}</span>
                    <span>📅 {new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {job.status === 'InProgress' && job.payment?.status === 'PaidHeld' && (
                    <PaymentStatusBadge status="PaidHeld" />
                  )}
                  <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">Detalii</Link>
                </div>
              </div>

              <div className="djc-apps">
                <h4>Aplicații ({job.jobApplications?.length ?? 0})</h4>
                {!job.jobApplications || job.jobApplications.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nicio aplicație încă.</p>
                ) : (
                  <div className="apps-list">
                    {job.jobApplications.map(app => (
                      <div key={app.id} className="app-row">
                        <div className="app-info">
                          <div className="app-user">
                            <Link to={`/users/${app.userId}/profile`}>👤 {app.user?.name ?? `User #${app.userId}`}</Link>
                            {app.user?.isPlusSubscriber && <PlusBadge size="sm" />}
                            {appBadge(app.jobApplicationStatus)}
                          </div>
                          <p className="app-msg">"{app.message}"</p>
                        </div>
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
          ))}
        </div>
      )}
    </div>
  );
};

// ─── WORKER DASHBOARD ──────────────────────────────────────────────────────────

const WorkerDashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [appsRes, reviewedRes] = await Promise.all([
        api.get<JobApplication[]>('/JobApplications'),
        api.get<GivenReviewEntry[]>('/reviews/given').catch(() => ({ data: [] as GivenReviewEntry[] })),
      ]);
      setApplications(appsRes.data);
      setReviewedIds(new Set(reviewedRes.data.map(e => `${e.reviewedUserId}_${e.jobPostId}`)));
    } catch {
      setError('Eroare la încărcarea datelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReviewSuccess = () => {
    setReviewTarget(null);
    setMsg({ text: 'Recenzie trimisă cu succes!', type: 'success' });
    fetchData();
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;

  const pending   = applications.filter(a => a.jobApplicationStatus === 'Pending');
  const accepted  = applications.filter(a => a.jobApplicationStatus === 'Accepted');
  const activeJobs = accepted.filter(a => a.jobPost?.status === 'InProgress');
  const completedJobs = accepted.filter(a => a.jobPost?.status === 'Completed');

  return (
    <div>
      {reviewTarget && (
        <ReviewModal
          reviewedUserId={reviewTarget.userId}
          reviewedUserName={reviewTarget.userName}
          jobPostId={reviewTarget.jobPostId}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <div className="dash-header">
        <div>
          <h1>Bun venit, {user?.name}! 👋</h1>
          <p className="text-muted">Urmărește aplicațiile și joburile acceptate</p>
        </div>
        <Link to="/explore" className="btn btn-primary">Explorează joburi</Link>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--warning)' }}>{pending.length}</div>
          <div className="stat-label">În așteptare</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{activeJobs.length}</div>
          <div className="stat-label">În desfășurare</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--success)' }}>{completedJobs.length}</div>
          <div className="stat-label">Finalizate</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{applications.length}</div>
          <div className="stat-label">Total aplicații</div>
        </div>
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: '1.5rem' }}>⚡ Joburi în desfășurare</h2>
          <div className="dash-apps-list accepted-list">
            {activeJobs.map(app => (
              <div key={app.id} className="app-card accepted">
                <div className="app-card-header">
                  <Link to={`/jobs/${app.jobPostId}`} className="app-card-title">
                    {app.jobPost?.title ?? `Job #${app.jobPostId}`}
                  </Link>
                  {statusBadge(app.jobPost?.status ?? '')}
                </div>
                <div className="app-card-meta">
                  <span>💰 {app.jobPost?.budget} RON</span>
                  <span>📍 {app.jobPost?.location}</span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <Link to={`/jobs/${app.jobPostId}`} className="btn btn-primary btn-sm">
                    Deschide job →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Completed jobs needing review */}
      {completedJobs.some(a => {
        const eId = a.jobPost?.userId;
        return eId !== undefined && !reviewedIds.has(`${eId}_${a.jobPostId}`);
      }) && (
        <>
          <h2 className="section-title" style={{ marginTop: '1.5rem' }}>★ Lasă recenzii</h2>
          <div className="dash-review-list">
            {completedJobs
              .filter(a => {
                const eId = a.jobPost?.userId;
                return eId !== undefined && !reviewedIds.has(`${eId}_${a.jobPostId}`);
              })
              .map(app => (
                <div key={app.id} className="dash-review-card card">
                  <div>
                    <Link to={`/jobs/${app.jobPostId}`} className="dash-review-job">
                      {app.jobPost?.title ?? `Job #${app.jobPostId}`}
                    </Link>
                    <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      Angajator: <strong>Utilizator #{app.jobPost?.userId}</strong>
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setReviewTarget({
                      userId: app.jobPost!.userId!,
                      userName: 'Angajatorul',
                      jobPostId: app.jobPostId,
                    })}
                  >
                    ★ Trimite o recenzie clientului
                  </button>
                </div>
              ))}
          </div>
        </>
      )}

      {/* All applications */}
      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Toate aplicațiile mele</h2>
      {applications.length === 0 ? (
        <div className="empty-state">
          <h3>Nicio aplicație trimisă</h3>
          <p>Explorează joburile disponibile și aplică la cele care te interesează.</p>
          <Link to="/explore" className="btn btn-primary" style={{ marginTop: '1rem' }}>Explorează</Link>
        </div>
      ) : (
        <div className="dash-apps-list">
          {applications.map(app => (
            <div key={app.id} className={`app-card ${app.jobApplicationStatus.toLowerCase()}`}>
              <div className="app-card-header">
                <Link to={`/jobs/${app.jobPostId}`} className="app-card-title">
                  {app.jobPost?.title ?? `Job #${app.jobPostId}`}
                </Link>
                {appBadge(app.jobApplicationStatus)}
              </div>
              <div className="app-card-meta">
                <span>💰 {app.jobPost?.budget} RON</span>
                <span>📍 {app.jobPost?.location}</span>
                {app.jobPost?.status && statusBadge(app.jobPost.status)}
                <span>📅 {new Date(app.createdAt).toLocaleDateString('ro-RO')}</span>
              </div>
              <p className="app-message">Mesajul tău: "{app.message}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { isEmployer } = useAuth();
  return (
    <div className="page-wrap">
      {isEmployer ? <EmployerDashboard /> : <WorkerDashboard />}
    </div>
  );
};

export default Dashboard;
