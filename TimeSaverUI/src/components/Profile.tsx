import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, ReviewsResponse } from '../types';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      const [profRes, revRes] = await Promise.all([
        api.get<UserProfile>('/Users/me'),
        user?.userId ? api.get<ReviewsResponse>(`/users/${user.userId}/reviews`) : Promise.resolve(null),
      ]);
      setProfile(profRes.data);
      if (revRes) setReviews(revRes.data);
      setEditForm({ name: profRes.data.name, bio: profRes.data.bio });
    } catch {
      setNotification({ msg: 'Eroare la încărcarea profilului.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await api.put<UserProfile>('/Users/me', editForm);
      setProfile(prev => prev ? { ...prev, name: res.data.name, bio: res.data.bio } : null);
      if (user) {
        const token = localStorage.getItem('token') ?? '';
        login(token, { ...user, name: res.data.name });
      }
      setEditing(false);
      setNotification({ msg: 'Profil actualizat cu succes!', type: 'success' });
    } catch {
      setNotification({ msg: 'Eroare la salvare.', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  if (loading) return <div className="loading-wrap">Se încarcă profilul...</div>;
  if (!profile) return <div className="page-wrap"><div className="empty-state"><h3>Profilul nu a putut fi încărcat.</h3></div></div>;

  return (
    <div className="page-wrap">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem' }}>Profilul meu</h1>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
          {notification.msg}
        </div>
      )}

      <div className="profile-layout">
        <div className="profile-main">
          {/* Profile card */}
          <div className="card profile-card">
            <div className="profile-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="profile-edit-form">
                <div className="form-group">
                  <label>Nume</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Biografie</label>
                  <textarea
                    rows={4}
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                    Anulează
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saveLoading}>
                    {saveLoading ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="profile-name">{profile.name}</h2>
                <div className="profile-role-badge">
                  {profile.userType === 'Worker' ? '🔧 Prestator' : '📋 Angajator'}
                </div>
                <p className="profile-email">{profile.email}</p>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                <div className="profile-rating">
                  <span className="stars">{renderStars(reviews?.averageRating ?? 0)}</span>
                  <span className="rating-val">
                    {reviews?.averageRating?.toFixed(1) ?? '0.0'}
                  </span>
                  <span className="rating-count">
                    ({reviews?.reviewCount ?? 0} {(reviews?.reviewCount ?? 0) === 1 ? 'recenzie' : 'recenzii'})
                  </span>
                </div>

                <button className="btn btn-outline" onClick={() => setEditing(true)} style={{ marginTop: '1rem' }}>
                  ✏️ Editează profilul
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="profile-reviews">
          <h2 className="section-title">Recenzii primite</h2>

          {!reviews || reviews.reviewCount === 0 ? (
            <div className="empty-state">
              <h3>Nicio recenzie încă</h3>
              <p>Recenziile apar după finalizarea unui job.</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.reviews.map(r => (
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

export default Profile;
