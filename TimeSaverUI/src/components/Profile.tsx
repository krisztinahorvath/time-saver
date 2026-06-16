import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, ReviewsResponse } from '../types';
import './Profile.css';

function renderStars(rating: number) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [reviews,     setReviews]     = useState<ReviewsResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [editForm,    setEditForm]    = useState({ name: '', bio: '', phoneNumber: '' });
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
      setEditForm({ name: profRes.data.name, bio: profRes.data.bio ?? '', phoneNumber: profRes.data.phoneNumber ?? '' });
    } catch {
      setNotification({ msg: 'Eroare la încărcarea profilului.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await api.put<UserProfile>('/Users/me', editForm);
      setProfile(prev => prev ? { ...prev, name: res.data.name, bio: res.data.bio, phoneNumber: res.data.phoneNumber } : null);
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

  if (loading) return <div className="loading-wrap">Se încarcă profilul...</div>;
  if (!profile) return (
    <div className="page-wrap">
      <div className="empty-state"><h3>Profilul nu a putut fi încărcat.</h3></div>
    </div>
  );

  const initials = profile.name.charAt(0).toUpperCase();
  const roleLabel = profile.userType === 'Worker' ? '🔧 Prestator' : '📋 Angajator';
  const avgRating = reviews?.averageRating ?? 0;

  return (
    <div className="page-wrap">
      <h1 className="page-title">Profilul meu</h1>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
          {notification.msg}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: '0.75rem' }}
            onClick={() => setNotification(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="profile-layout">

        {/* ── Left sidebar ── */}
        <div className="profile-sidebar">

          {/* Main card */}
          <div className="card profile-card">
            <div className="profile-avatar">{initials}</div>

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
                  <label>Descriere</label>
                  <textarea
                    rows={4}
                    placeholder="Descrie-te pe scurt, experiența ta, serviciile oferite..."
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Număr de telefon <span className="text-muted">(opțional, vizibil pe profilul public)</span></label>
                  <input
                    type="tel"
                    maxLength={20}
                    placeholder="ex: 07xx xxx xxx"
                    value={editForm.phoneNumber}
                    onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))}
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
                <div className="profile-role-badge">{roleLabel}</div>

                {/* Rating */}
                <div className="profile-rating">
                  <span className="stars">{renderStars(avgRating)}</span>
                  <span className="rating-val">{avgRating.toFixed(1)}</span>
                  <span className="rating-count">
                    ({reviews?.reviewCount ?? 0} {(reviews?.reviewCount ?? 0) === 1 ? 'recenzie' : 'recenzii'})
                  </span>
                </div>

                {/* Descriere */}
                {profile.bio ? (
                  <div className="profile-descriere">
                    <span className="profile-section-label">Descriere</span>
                    <p className="profile-bio-text">"{profile.bio}"</p>
                  </div>
                ) : (
                  <p className="profile-no-bio">Nicio descriere adăugată.</p>
                )}

                <button
                  className="btn btn-outline"
                  onClick={() => setEditing(true)}
                  style={{ marginTop: '1.25rem', width: '100%' }}
                >
                  ✏️ Editează profilul
                </button>
              </>
            )}
          </div>

          {/* Account info — clearly labeled, separate from the public card */}
          {!editing && (
            <div className="card profile-account-info">
              <h3 className="profile-account-title">Informații cont</h3>
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-val">{profile.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Tip cont</span>
                <span className="profile-info-val">
                  {profile.userType === 'Worker' ? 'Prestator (Worker)' : 'Angajator (Employer)'}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Telefon</span>
                <span className="profile-info-val">
                  {profile.phoneNumber ?? <em style={{ color: 'var(--text-muted)' }}>Neadăugat</em>}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Reviews ── */}
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
