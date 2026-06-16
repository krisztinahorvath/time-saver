import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { PublicProfile as PublicProfileType, PublicJobItem, GivenReviewEntry } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import { useAuth } from '../context/AuthContext';
import ReportModal from './ReportModal';
import ContactModal from './ContactModal';
import './PublicProfile.css';

function renderStars(rating: number, size: 'sm' | 'md' | 'lg' = 'md') {
  const full = Math.round(rating);
  return (
    <span className={`stars-row stars-${size}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? 'star-filled' : 'star-empty'}>★</span>
      ))}
    </span>
  );
}

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2020) return 'Dată necunoscută';
  return d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
}

const TABS = ['Recenzii', 'Joburi'] as const;
type Tab = typeof TABS[number];

const PublicProfile: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { user, isAuthenticated, isEmployer, isWorker } = useAuth();

  const [profile,        setProfile]        = useState<PublicProfileType | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [activeTab,      setActiveTab]      = useState<Tab>('Recenzii');

  // Public jobs
  const [publicJobs,     setPublicJobs]     = useState<PublicJobItem[]>([]);
  const [jobsLoading,    setJobsLoading]    = useState(false);

  // Review form
  const [givenReviews,   setGivenReviews]   = useState<GivenReviewEntry[]>([]);
  const [reviewRating,   setReviewRating]   = useState(5);
  const [reviewComment,  setReviewComment]  = useState('');
  const [reviewJobId,    setReviewJobId]    = useState<number | ''>('');
  const [sharedJobs,     setSharedJobs]     = useState<{ id: number; title: string; status: string }[]>([]);
  const [reviewLoading,  setReviewLoading]  = useState(false);
  const [reviewMsg,      setReviewMsg]      = useState<{ text: string; ok: boolean } | null>(null);

  // Share / contact
  const [copied,         setCopied]         = useState(false);

  // Contact modal
  const [contactOpen,    setContactOpen]    = useState(false);

  // Report
  const [reportUser,     setReportUser]     = useState(false);
  const [reportReviewId, setReportReviewId] = useState<number | null>(null);
  const [reportSuccess,  setReportSuccess]  = useState('');

  const profileId = Number(id);
  const isSelf    = user?.userId === profileId;
  const canReport = isAuthenticated && !isSelf;

  // Per-job review check: true only when a specific job is selected and already reviewed for it
  const alreadyReviewedForJob = typeof reviewJobId === 'number'
    ? givenReviews.some(r => r.reviewedUserId === profileId && r.jobPostId === reviewJobId)
    : false;

  const completedSharedJobs = sharedJobs.filter(j => j.status === 'Completed');

  // Load profile
  useEffect(() => {
    setLoading(true); setError(false);
    api.get<PublicProfileType>(`/Users/${id}/public-profile`)
      .then(res => setProfile(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Load given reviews { reviewedUserId, jobPostId } pairs
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<GivenReviewEntry[]>('/reviews/given')
      .then(res => setGivenReviews(res.data))
      .catch(() => { /* non-critical */ });
  }, [isAuthenticated]);

  // Load shared completed jobs (for review job selector)
  useEffect(() => {
    if (!isAuthenticated || isSelf || sharedJobs.length > 0) return;
    api.get<{ id: number; title: string; status: string }[]>(`/Users/${profileId}/shared-jobs`)
      .then(res => setSharedJobs(res.data))
      .catch(() => { /* non-critical */ });
  }, [isAuthenticated, isSelf, profileId, sharedJobs.length]);

  // Load user's public jobs when Jobs tab opens
  const loadPublicJobs = useCallback(async () => {
    if (publicJobs.length > 0 || jobsLoading) return;
    setJobsLoading(true);
    try {
      const res = await api.get<PublicJobItem[]>(`/Users/${id}/public-jobs`);
      setPublicJobs(res.data);
    } catch {
      // non-critical
    } finally {
      setJobsLoading(false);
    }
  }, [id, publicJobs.length, jobsLoading]);

  useEffect(() => {
    if (activeTab === 'Joburi') loadPublicJobs();
  }, [activeTab, loadPublicJobs]);

  // Share profile
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.name, url });
        return;
      } catch {
        // user cancelled or not supported
      }
    }
    await navigator.clipboard.writeText(url).catch(() => { /* ignore */ });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Contact
  const handleContact = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setContactOpen(true);
  };

  const canContact = isAuthenticated && !isSelf &&
    ((isEmployer && profile?.userType === 'Worker') ||
     (isWorker  && profile?.userType === 'Employer'));

  // Submit review
  const handleReviewSubmit = async () => {
    if (!profile || reviewJobId === '') return;
    setReviewLoading(true); setReviewMsg(null);
    try {
      await api.post(`/users/${profileId}/review`, {
        rating:    reviewRating,
        comment:   reviewComment.trim(),
        jobPostId: reviewJobId,
      });
      setReviewMsg({ text: 'Recenzia a fost trimisă cu succes!', ok: true });
      const newEntry: GivenReviewEntry = {
        reviewedUserId: profileId,
        jobPostId: typeof reviewJobId === 'number' ? reviewJobId : null,
      };
      setGivenReviews(prev => [...prev, newEntry]);
      setReviewComment('');
      const updated = await api.get<PublicProfileType>(`/Users/${id}/public-profile`);
      setProfile(updated.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setReviewMsg({ text: err.response?.data?.message ?? 'Eroare la trimiterea recenziei.', ok: false });
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Render ──

  if (loading) return <div className="loading-wrap">Se încarcă profilul...</div>;

  if (error || !profile) return (
    <div className="page-wrap">
      <div className="empty-state">
        <h3>Profil negăsit</h3>
        <p>Utilizatorul nu există sau a fost șters.</p>
        <Link to="/explore" className="btn btn-outline" style={{ marginTop: '1rem' }}>← Înapoi la joburi</Link>
      </div>
    </div>
  );

  const isWorkerProfile = profile.userType === 'Worker';

  return (
    <div className="page-wrap">
      {/* Contact modal */}
      {contactOpen && (
        <ContactModal
          profileId={profileId}
          profileName={profile.name}
          profileUserType={profile.userType}
          isEmployer={isEmployer}
          isWorker={isWorker}
          phoneNumber={profile.phoneNumber}
          onClose={() => setContactOpen(false)}
        />
      )}

      {/* Report modals */}
      {reportUser && (
        <ReportModal type="User" targetId={profileId} targetLabel={profile.name}
          onClose={() => setReportUser(false)}
          onSuccess={() => { setReportUser(false); setReportSuccess('Raport trimis. Mulțumim!'); }} />
      )}
      {reportReviewId !== null && (
        <ReportModal type="Review" targetId={reportReviewId} targetLabel={`Recenzie #${reportReviewId}`}
          onClose={() => setReportReviewId(null)}
          onSuccess={() => { setReportReviewId(null); setReportSuccess('Raport trimis. Mulțumim!'); }} />
      )}

      <Link to="/explore" className="pp-back">← Înapoi la joburi</Link>

      {reportSuccess && (
        <div className="alert alert-success" style={{ margin: '0.5rem 0' }}>{reportSuccess}</div>
      )}

      {/* Suspended banner */}
      {profile.isSuspended && (
        <div className="alert alert-error" style={{ margin: '0.5rem 0' }}>
          Acest cont a fost suspendat de echipa TimeSaver.
        </div>
      )}

      <div className="pp-layout">

        {/* ── Sidebar ── */}
        <aside className="pp-sidebar">
          <div className="card pp-card">

            {/* Avatar */}
            <div className="pp-avatar-wrap">
              <div className="pp-avatar">{profile.name.charAt(0).toUpperCase()}</div>
              {profile.isSuspended && (
                <span className="pp-suspended-badge">Suspendat</span>
              )}
            </div>

            <h2 className="pp-name">{profile.name}</h2>
            <div className="pp-role-badge">
              {isWorkerProfile ? '🔧 Prestator' : '📋 Angajator'}
            </div>

            {profile.bio && (
              <div className="pp-descriere">
                <span className="pp-descriere-label">Descriere</span>
                <p className="pp-bio">"{profile.bio}"</p>
              </div>
            )}

            {/* Rating */}
            <div className="pp-rating-block">
              {profile.averageRating > 0 ? (
                <>
                  {renderStars(profile.averageRating, 'lg')}
                  <div className="pp-rating-num">{profile.averageRating.toFixed(1)}</div>
                  <div className="pp-rating-label">
                    din {profile.reviewCount} {profile.reviewCount === 1 ? 'recenzie' : 'recenzii'}
                  </div>
                </>
              ) : (
                <div className="pp-no-rating">Fără recenzii încă</div>
              )}
            </div>

            {/* Stats */}
            <div className="pp-stats">
              <div className="pp-stat">
                <span className="pp-stat-num">{profile.completedJobsCount}</span>
                <span className="pp-stat-label">{isWorkerProfile ? 'Joburi executate' : 'Joburi finalizate'}</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-num">{profile.reviewCount}</span>
                <span className="pp-stat-label">Recenzii</span>
              </div>
            </div>

            <div className="pp-member-since">📅 Membru din {formatMemberSince(profile.memberSince)}</div>

            {/* Action buttons */}
            <div className="pp-actions">
              {canContact && (
                <button className="btn btn-primary pp-action-btn" onClick={handleContact}>
                  💬 Contactează
                </button>
              )}

              <button className="btn btn-outline pp-action-btn" onClick={handleShare}>
                {copied ? '✓ Link copiat!' : '🔗 Distribuie profilul'}
              </button>

              {canReport && (
                <button
                  className="btn btn-ghost pp-action-btn pp-report-btn"
                  onClick={() => setReportUser(true)}
                >
                  🚩 Raportează utilizatorul
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="pp-main">

          {/* Tabs */}
          <div className="pp-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`pp-tab ${activeTab === tab ? 'pp-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Recenzii' && `Recenzii (${profile.reviews.length})`}
                {tab === 'Joburi'   && 'Joburi active'}
              </button>
            ))}
          </div>

          {/* ── Reviews tab ── */}
          {activeTab === 'Recenzii' && (
            <>
              {/* Write a review */}
              {isAuthenticated && !isSelf && (
                <div className="pp-review-form card">
                  <h3 className="pp-review-form-title">Lasă o recenzie</h3>
                  {completedSharedJobs.length === 0 ? (
                    <p className="pp-review-form-note">
                      Poți recenza doar utilizatori cu care ai finalizat un job împreună. Nu există joburi comune finalizate.
                    </p>
                  ) : (
                    <>
                      <p className="pp-review-form-note">Selectează jobul finalizat pentru care vrei să lași o recenzie:</p>
                      <select
                        className="pp-review-job-select"
                        value={reviewJobId}
                        onChange={e => {
                          setReviewJobId(e.target.value === '' ? '' : Number(e.target.value));
                          setReviewMsg(null);
                        }}
                      >
                        <option value="">-- Alege un job --</option>
                        {completedSharedJobs.map(j => (
                          <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                      </select>

                      {reviewJobId !== '' && alreadyReviewedForJob && (
                        <div className="pp-already-reviewed">
                          ✓ Ai recenzat deja acest utilizator pentru acest job.
                        </div>
                      )}

                      {reviewJobId !== '' && !alreadyReviewedForJob && (
                        <>
                          <div className="pp-star-picker">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                className={`pp-star-btn ${n <= reviewRating ? 'pp-star-on' : ''}`}
                                onClick={() => setReviewRating(n)}
                                aria-label={`${n} stele`}
                              >
                                ★
                              </button>
                            ))}
                            <span className="pp-star-label">{reviewRating}/5</span>
                          </div>

                          <textarea
                            className="pp-review-textarea"
                            rows={3}
                            placeholder="Descrie experiența ta cu acest utilizator (opțional)..."
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                          />

                          <button
                            className="btn btn-primary"
                            onClick={handleReviewSubmit}
                            disabled={reviewLoading}
                          >
                            {reviewLoading ? 'Se trimite...' : 'Trimite recenzia'}
                          </button>
                        </>
                      )}

                      {reviewMsg && (
                        <div className={`alert alert-${reviewMsg.ok ? 'success' : 'error'}`}>
                          {reviewMsg.text}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Reviews list */}
              {profile.reviews.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <h3>Nicio recenzie</h3>
                  <p>{isWorkerProfile ? 'Prestatorul nu a primit recenzii încă.' : 'Angajatorul nu a primit recenzii încă.'}</p>
                </div>
              ) : (
                <div className="pp-reviews-list">
                  {profile.reviews.map(r => (
                    <div key={r.id} className="card pp-review-card">
                      <div className="pp-review-header">
                        <div className="pp-review-author-wrap">
                          <div className="pp-review-avatar">
                            {(r.reviewerName ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="pp-review-author">{r.reviewerName ?? 'Utilizator'}</div>
                            <div className="pp-review-date">
                              {new Date(r.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="pp-review-stars">
                          {renderStars(r.rating, 'sm')}
                          <span className="pp-review-rating-num">{r.rating}/5</span>
                        </div>
                      </div>
                      {r.comment && <p className="pp-review-comment">"{r.comment}"</p>}
                      {canReport && r.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.78rem' }}
                          onClick={() => setReportReviewId(r.id)}
                        >
                          🚩 Raportează recenzia
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Jobs tab ── */}
          {activeTab === 'Joburi' && (
            <div className="pp-jobs-section">
              {jobsLoading ? (
                <div className="loading-wrap">Se încarcă joburile...</div>
              ) : publicJobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <h3>Niciun job activ</h3>
                  <p>Utilizatorul nu are anunțuri active momentan.</p>
                </div>
              ) : (
                <div className="pp-jobs-list">
                  {publicJobs.map(j => (
                    <Link key={j.id} to={`/jobs/${j.id}`} className="pp-job-card card">
                      <div className="pp-job-top">
                        <span className="jc-category">
                          {CATEGORY_ICONS[j.category]} {CATEGORY_LABELS[j.category] ?? j.category}
                        </span>
                        <span className="pp-job-price">💰 {j.budget} RON</span>
                      </div>
                      <div className="pp-job-title">{j.title}</div>
                      <div className="pp-job-meta">
                        <span>📍 {j.location}</span>
                        {j.deadline && (
                          <span>⏰ {new Date(j.deadline).toLocaleDateString('ro-RO')}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
