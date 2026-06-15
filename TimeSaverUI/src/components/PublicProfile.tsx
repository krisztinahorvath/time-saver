import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { PublicProfile as PublicProfileType } from '../types';
import './Profile.css';

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PublicProfileType>(`/Users/${id}/public-profile`)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  const renderStars = (rating: number) =>
    '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  if (loading) return <div className="loading-wrap">Se încarcă profilul...</div>;
  if (!profile) return (
    <div className="page-wrap">
      <div className="empty-state">
        <h3>Profil negăsit</h3>
        <Link to="/explore">← Înapoi</Link>
      </div>
    </div>
  );

  return (
    <div className="page-wrap">
      <Link to="/explore" className="back-link" style={{ display: 'inline-block', marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
        ← Înapoi
      </Link>

      <div className="profile-layout">
        <div className="profile-main">
          <div className="card profile-card">
            <div className="profile-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="profile-name">{profile.name}</h2>
            <div className="profile-role-badge">
              {profile.userType === 'Worker' ? '🔧 Prestator' : '📋 Angajator'}
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-rating">
              <span className="stars">{renderStars(profile.averageRating)}</span>
              <span className="rating-val">{profile.averageRating.toFixed(1)}</span>
              <span className="rating-count">
                ({profile.reviewCount} {profile.reviewCount === 1 ? 'recenzie' : 'recenzii'})
              </span>
            </div>
          </div>
        </div>

        <div className="profile-reviews">
          <h2 className="section-title">Recenzii</h2>
          {profile.reviews.length === 0 ? (
            <div className="empty-state"><h3>Nicio recenzie</h3></div>
          ) : (
            <div className="reviews-list">
              {profile.reviews.map(r => (
                <div key={r.id} className="review-card card">
                  <div className="review-header">
                    <div className="review-author">{r.reviewerName ?? 'Utilizator'}</div>
                    <div>
                      <span className="stars">{renderStars(r.rating)}</span>
                      <span className="review-date">
                        {new Date(r.createdAt).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                  </div>
                  {r.comment && <p className="review-comment">"{r.comment}"</p>}
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
