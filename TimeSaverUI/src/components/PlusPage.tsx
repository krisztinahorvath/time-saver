import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { usePlus } from '../context/PlusContext';
import './PlusPage.css';

const PlusPage: React.FC = () => {
  const { plusStatus, isVerified, loading, refresh } = usePlus();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setError(null);
    setCheckoutLoading(true);
    try {
      const res = await api.post<{ checkoutUrl: string }>('/plus/create-checkout-session');
      window.location.href = res.data.checkoutUrl;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Eroare la inițierea plății. Încearcă din nou.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="page-wrap plus-page">
      <div className="plus-hero">
        <div className="plus-badge-large">⭐</div>
        <h1 className="plus-title">TimeSaver <span className="plus-label">Plus</span></h1>
        <p className="plus-subtitle">Deblochează funcționalități premium și crește-ți șansele de succes</p>
      </div>

      {loading ? (
        <div className="plus-status-card card">Se verifică statusul...</div>
      ) : isVerified ? (
        <div className="plus-status-card card plus-active">
          <div className="plus-status-icon">✅</div>
          <h2>Plus activ</h2>
          <p>{plusStatus?.statusMessage}</p>
          {plusStatus?.plusExpiresAt && (
            <p className="plus-expires">
              Reînnoire: {new Date(plusStatus.plusExpiresAt).toLocaleDateString('ro-RO')}
            </p>
          )}
          <button className="btn btn-ghost" onClick={refresh}>Actualizează status</button>
        </div>
      ) : (
        <div className="plus-cta-card card">
          <h2>Activează TimeSaver Plus</h2>
          <p className="plus-price-hint">Abonament lunar • plată securizată prin Stripe</p>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button
            className="btn btn-primary btn-plus-activate"
            onClick={handleActivate}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? 'Se redirecționează...' : '⭐ Activează TimeSaver Plus'}
          </button>
          <p className="plus-stripe-note">Vei fi redirecționat către Stripe pentru plată securizată.</p>
        </div>
      )}

      <div className="plus-features">
        <h2>Ce primești cu Plus</h2>
        <div className="plus-features-grid">
          <div className="plus-feature-card card">
            <div className="plus-feature-icon">🥇</div>
            <h3>Prioritate la aplicații</h3>
            <p>Aplicațiile tale apar primele în lista angajatorului.</p>
          </div>
          <div className="plus-feature-card card">
            <div className="plus-feature-icon">✅</div>
            <h3>Insignă verificat</h3>
            <p>Badge auriu ⭐ pe profilul tău public — construiește mai multă încredere.</p>
          </div>
          <div className="plus-feature-card card">
            <div className="plus-feature-icon">👁️</div>
            <h3>Vizitatori profil</h3>
            <p>Vezi cine ți-a vizitat profilul în ultimele 30 de zile.</p>
          </div>
          <div className="plus-feature-card card">
            <div className="plus-feature-icon">💎</div>
            <h3>Joburi Plus Matching</h3>
            <p>
              <strong>Angajatori:</strong> postează joburi vizibile exclusiv pentru prestatori Plus.<br />
              <strong>Prestatori:</strong> accesează joburi premium rezervate Plus.
            </p>
          </div>
        </div>
      </div>

      <div className="plus-free-note">
        <p>Utilizatorii gratuiți păstrează accesul la toate funcționalitățile de bază ale marketplace-ului.</p>
        <Link to="/dashboard" className="btn btn-ghost btn-sm">Înapoi la Dashboard</Link>
      </div>
    </div>
  );
};

export default PlusPage;
