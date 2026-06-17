import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { JobApplication, GivenReviewEntry, ConnectStatus, PlusStatus } from '../types';
import PaymentStatusBadge from './PaymentStatusBadge';
import { STATUS_LABELS } from '../types';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';
import './MyApplications.css';

interface ReviewTarget {
  userId: number;
  userName: string;
  jobPostId: number;
}

const MyApplications: React.FC = () => {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [plusStatus,    setPlusStatus]    = useState<PlusStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmPending, setConfirmPending] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

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
      const res = await api.get<GivenReviewEntry[]>('/reviews/given');
      setReviewedIds(new Set(res.data.map(e => `${e.reviewedUserId}_${e.jobPostId}`)));
    } catch {
      // non-blocking
    }
  };

  const fetchConnectStatus = async () => {
    try {
      const res = await api.get<ConnectStatus>('/billing/connect/status');
      setConnectStatus(res.data);
    } catch {
      // non-blocking
    }
  };

  const fetchPlusStatus = async () => {
    try {
      const res = await api.get<PlusStatus>('/plus/status');
      setPlusStatus(res.data);
    } catch {
      // non-blocking
    }
  };

  const startConnectOnboarding = async () => {
    setConnectLoading(true);
    try {
      const res = await api.post<{ onboardingUrl: string }>('/billing/connect/onboarding');
      window.location.href = res.data.onboardingUrl;
    } catch (e) {
      setNotification({ msg: extractApiError(e, 'Eroare la configurarea contului de plăți.'), type: 'error' });
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchReviewedIds();
    fetchConnectStatus();
    fetchPlusStatus();
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
          jobPostId={reviewTarget.jobPostId}
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

      {/* Payout setup CTA — shown to workers without Connect configured */}
      {connectStatus !== null && !connectStatus.onboardingComplete && (
        <div className="card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <strong>🏦 Configurează contul de primire plăți</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              {connectStatus.connected
                ? 'Contul tău Stripe Connect necesită completarea înregistrării pentru a primi plăți de la angajatori.'
                : 'Adaugă un cont bancar prin Stripe Connect pentru a primi plăți securizate de la angajatori.'}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={startConnectOnboarding} disabled={connectLoading}>
            {connectLoading ? 'Se procesează...' : connectStatus.connected ? 'Completează înregistrarea' : 'Configurează acum'}
          </button>
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
                    workerIsPlus={plusStatus?.isPlusSubscriber ?? false}
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
                    workerIsPlus={plusStatus?.isPlusSubscriber ?? false}
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
                    workerIsPlus={plusStatus?.isPlusSubscriber ?? false}
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
  reviewedIds: Set<string>;
  onWithdraw: (id: number) => void;
  onReview: (target: ReviewTarget) => void;
  workerIsPlus: boolean;
}

const AppCard: React.FC<AppCardProps> = ({ app, reviewedIds, onWithdraw, onReview, workerIsPlus }) => {
  const jobCompleted = app.jobPost?.status === 'Completed';
  const employerId  = app.jobPost?.userId;
  const alreadyReviewed = employerId !== undefined && reviewedIds.has(`${employerId}_${app.jobPostId}`);

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
        {app.jobPost?.budget !== undefined && (
          <>
            <span>💰 {app.jobPost.budget} RON</span>
            {app.jobApplicationStatus === 'Accepted' && app.jobPost?.payment?.workerAmount !== undefined ? (
              <span style={{ color: 'var(--success, #22c55e)', fontWeight: 600 }}>
                Vei primi: {app.jobPost.payment.workerAmount.toFixed(2)} RON
                {app.jobPost.payment.platformFeeAmount === 0 && ' ⭐'}
              </span>
            ) : app.jobApplicationStatus === 'Accepted' ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {workerIsPlus
                  ? `⭐ Vei primi: ${app.jobPost.budget.toFixed(2)} RON (0% comision Plus)`
                  : `Vei primi: ~${(app.jobPost.budget * 0.95).toFixed(2)} RON (5% comision)`}
              </span>
            ) : null}
          </>
        )}
        {app.jobPost?.location && <span>📍 {app.jobPost.location}</span>}
        {app.jobPost?.status && (
          <span className={`badge badge-${app.jobPost.status.toLowerCase()}`}>
            {STATUS_LABELS[app.jobPost.status as keyof typeof STATUS_LABELS] ?? app.jobPost.status}
          </span>
        )}
        <span>📅 Aplicat: {new Date(app.createdAt).toLocaleDateString('ro-RO')}</span>
      </div>

      <p className="ma-msg">Mesajul tău: <em>"{app.message}"</em></p>

      {/* Payment status — visible when accepted and employer has initiated payment */}
      {app.jobApplicationStatus === 'Accepted' && app.jobPost?.payment && app.jobPost.payment.status !== 'NotStarted' && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <PaymentStatusBadge
            status={app.jobPost.payment.status}
            workerAmount={app.jobPost.payment.workerAmount}
            hasTransfer={!!app.jobPost.payment.stripeTransferId}
          />
          {app.jobPost.payment.status === 'PaidHeld' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {(app.jobPost.payment.workerAmount ?? app.jobPost.payment.amount).toFixed(2)} RON în escrow
            </span>
          )}
          {app.jobPost.payment.status === 'ReleasedToWorker' && !app.jobPost.payment.stripeTransferId && (
            <Link to="/billing/business" style={{ fontSize: '0.78rem' }}>
              Configurează cont plăți
            </Link>
          )}
        </div>
      )}

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
              onClick={() => onReview({ userId: employerId, userName: 'Angajatorul', jobPostId: app.jobPostId })}
            >
              ★ Trimite o recenzie clientului
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default MyApplications;
