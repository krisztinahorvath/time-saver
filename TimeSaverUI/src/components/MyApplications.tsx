import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { JobApplication } from '../types';
import { STATUS_LABELS } from '../types';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';
import './MyApplications.css';

interface ReviewTarget {
  userId: number;
  userName: string;
}

const MyApplications: React.FC = () => {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmPending, setConfirmPending] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const fetchApps = async () => {
    try {
      const res = await api.get<JobApplication[]>('/JobApplications');
      setApps(res.data);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea aplicațiilor.', type: 'error' });
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
    fetchApps();
    fetchReviewedIds();
  }, []);

  const withdraw = async (appId: number) => {
    try {
      await api.delete(`/JobApplications/${appId}`);
      setNotification({ msg: 'Aplicație retrasă cu succes.', type: 'success' });
      fetchApps();
    } catch (e) {
      setNotification({ msg: extractApiError(e, 'Nu poți retrage această aplicație.'), type: 'error' });
    } finally {
      setConfirmPending(null);
    }
  };

  const handleReviewSuccess = () => {
    setReviewTarget(null);
    setNotification({ msg: 'Recenzie trimisă cu succes!', type: 'success' });
    fetchReviewedIds();
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;

  const accepted = apps.filter(a => a.jobApplicationStatus === 'Accepted');
  const pending  = apps.filter(a => a.jobApplicationStatus === 'Pending');
  const rejected = apps.filter(a => a.jobApplicationStatus === 'Rejected');

  return (
    <div className="page-wrap">
      {confirmPending !== null && (
        <ConfirmModal
          message="Retragi această aplicație? Nu o vei mai putea recupera."
          confirmLabel="Retrage"
          danger
          onConfirm={() => withdraw(confirmPending)}
          onCancel={() => setConfirmPending(null)}
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

      <div className="ma-header">
        <div>
          <h1>Aplicațiile mele</h1>
          <p className="text-muted">Urmărește statusul aplicațiilor trimise</p>
        </div>
        <Link to="/explore" className="btn btn-outline">Explorează joburi</Link>
      </div>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
          {notification.msg}
        </div>
      )}

      <div className="dash-stats">
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{accepted.length}</div><div className="stat-label">Acceptate</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--warning)' }}>{pending.length}</div><div className="stat-label">În așteptare</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--danger)' }}>{rejected.length}</div><div className="stat-label">Respinse</div></div>
        <div className="stat-card"><div className="stat-num">{apps.length}</div><div className="stat-label">Total</div></div>
      </div>

      {apps.length === 0 ? (
        <div className="empty-state">
          <h3>Nicio aplicație trimisă</h3>
          <p>Explorează joburile disponibile și aplică la ce te interesează.</p>
          <Link to="/explore" className="btn btn-primary" style={{ marginTop: '1rem' }}>Explorează</Link>
        </div>
      ) : (
        <>
          {accepted.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title">✅ Joburi acceptate</h2>
              <div className="ma-list">
                {accepted.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    reviewedIds={reviewedIds}
                    onWithdraw={id => setConfirmPending(id)}
                    onReview={setReviewTarget}
                  />
                ))}
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title">⏳ În așteptare</h2>
              <div className="ma-list">
                {pending.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    reviewedIds={reviewedIds}
                    onWithdraw={id => setConfirmPending(id)}
                    onReview={setReviewTarget}
                  />
                ))}
              </div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h2 className="section-title">❌ Respinse</h2>
              <div className="ma-list">
                {rejected.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    reviewedIds={reviewedIds}
                    onWithdraw={id => setConfirmPending(id)}
                    onReview={setReviewTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface AppCardProps {
  app: JobApplication;
  reviewedIds: Set<number>;
  onWithdraw: (id: number) => void;
  onReview: (target: ReviewTarget) => void;
}

const AppCard: React.FC<AppCardProps> = ({ app, reviewedIds, onWithdraw, onReview }) => {
  const jobCompleted = app.jobPost?.status === 'Completed';
  const employerId  = app.jobPost?.userId;
  const alreadyReviewed = employerId !== undefined && reviewedIds.has(employerId);

  return (
    <div className={`ma-card card ma-card-${app.jobApplicationStatus.toLowerCase()}`}>
      <div className="ma-card-header">
        <Link to={`/jobs/${app.jobPostId}`} className="ma-card-title">
          {app.jobPost?.title ?? `Job #${app.jobPostId}`}
        </Link>
        <span className={`badge badge-${app.jobApplicationStatus.toLowerCase()}`}>
          {app.jobApplicationStatus === 'Accepted' ? 'Acceptat' : app.jobApplicationStatus === 'Rejected' ? 'Respins' : 'În așteptare'}
        </span>
      </div>

      <div className="ma-card-meta">
        {app.jobPost?.budget !== undefined && <span>💰 {app.jobPost.budget} RON</span>}
        {app.jobPost?.location && <span>📍 {app.jobPost.location}</span>}
        {app.jobPost?.status && (
          <span className={`badge badge-${app.jobPost.status.toLowerCase()}`}>
            {STATUS_LABELS[app.jobPost.status as keyof typeof STATUS_LABELS] ?? app.jobPost.status}
          </span>
        )}
        <span>📅 Aplicat: {new Date(app.createdAt).toLocaleDateString('ro-RO')}</span>
      </div>

      <p className="ma-msg">Mesajul tău: <em>"{app.message}"</em></p>

      <div className="ma-card-actions">
        <Link to={`/jobs/${app.jobPostId}`} className="btn btn-ghost btn-sm">
          Vezi job
        </Link>
        {app.jobApplicationStatus === 'Pending' && (
          <button className="btn btn-danger btn-sm" onClick={() => onWithdraw(app.id)}>
            Retrage
          </button>
        )}
        {app.jobApplicationStatus === 'Accepted' && jobCompleted && employerId !== undefined && (
          alreadyReviewed ? (
            <span className="review-given-badge">✓ Recenzie trimisă</span>
          ) : (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onReview({ userId: employerId, userName: 'Angajatorul' })}
            >
              ★ Recenzează angajatorul
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default MyApplications;
