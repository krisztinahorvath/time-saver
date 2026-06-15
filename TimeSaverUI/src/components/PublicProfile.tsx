import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { PublicProfile as PublicProfileType } from '../types';
import './PublicProfile.css';

function renderStars(rating: number) {
  const full = Math.round(rating);
  return (
    <span className="stars-row">
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

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get<PublicProfileType>(`/Users/${id}/public-profile`)
      .then(res => setProfile(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-wrap">Se încarcă profilul...</div>;

  if (error || !profile) return (
    <div className="page-wrap">
      <div className="empty-state">
        <h3>Profil negăsit</h3>
        <p>Utilizatorul nu există sau a fost șters.</p>
        <Link to="/explore" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          ← Înapoi la joburi
        </Link>
      </div>
    </div>
  );

  const isWorker = profile.userType === 'Worker';

  return (
    <div className="page-wrap">
      <Link to="/explore" className="pp-back">← Înapoi la joburi</Link>

      <div className="pp-layout">
        {/* Left: profile card */}
        <aside className="pp-sidebar">
          <div className="card pp-card">
            <div className="pp-avatar">{profile.name.charAt(0).toUpperCase()}</div>
            <h2 className="pp-name">{profile.name}</h2>
            <div className="pp-role-badge">
              {isWorker ? '🔧 Prestator' : '📋 Angajator'}
            </div>

            {profile.bio && <p className="pp-bio">"{profile.bio}"</p>}

            {/* Rating summary */}
            <div className="pp-rating-block">
              {profile.averageRating > 0 ? (
                <>
                  <div className="pp-rating-stars">{renderStars(profile.averageRating)}</div>
                  <div className="pp-rating-num">{profile.averageRating.toFixed(1)}</div>
                  <div className="pp-rating-label">
                    din {profile.reviewCount} {profile.reviewCount === 1 ? 'recenzie' : 'recenzii'}
                  </div>
                </>
              ) : (
                <div className="pp-no-rating">Fără recenzii încă</div>
              )}
            </div>

            {/* Trust stats */}
            <div className="pp-stats">
              <div className="pp-stat">
                <span className="pp-stat-num">{profile.completedJobsCount}</span>
                <span className="pp-stat-label">
                  {isWorker ? 'Joburi executate' : 'Joburi finalizate'}
                </span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-num">{profile.reviewCount}</span>
                <span className="pp-stat-label">Recenzii</span>
              </div>
            </div>

            <div className="pp-member-since">
              📅 Membru din {formatMemberSince(profile.memberSince)}
            </div>
          </div>
        </aside>

        {/* Right: reviews */}
        <div className="pp-reviews-col">
          <h2 className="section-title">
            Recenzii ({profile.reviews.length})
          </h2>

          {profile.reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <h3>Nicio recenzie</h3>
              <p>
                {isWorker
                  ? 'Prestatorul nu a primit recenzii încă.'
                  : 'Angajatorul nu a primit recenzii încă.'}
              </p>
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
                          {new Date(r.createdAt).toLocaleDateString('ro-RO', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="pp-review-stars">
                      {renderStars(r.rating)}
                      <span className="pp-review-rating-num">{r.rating}/5</span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="pp-review-comment">"{r.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
