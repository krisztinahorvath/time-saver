import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { ConnectStatus } from '../types';

const FEATURES = [
  { icon: '💳', title: 'Plăți securizate', desc: 'Acceptă plăți online de la angajatori prin card, cu protecție Stripe.' },
  { icon: '📊', title: 'Rapoarte automate', desc: 'Vizualizează câștigurile, facturile și istoricul tranzacțiilor.' },
  { icon: '🔒', title: 'Fonduri protejate', desc: 'Banii sunt reținuți securizat până la finalizarea jobului.' },
  { icon: '⚡', title: 'Transfer rapid', desc: 'Transferul în cont bancar se face în 1–2 zile lucrătoare.' },
];

const BusinessBillingPage: React.FC = () => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get<ConnectStatus>('/billing/connect/status');
      setStatus(res.data);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const startOnboarding = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<{ onboardingUrl: string }>('/billing/connect/onboarding');
      window.location.href = res.data.onboardingUrl;
    } catch (e) {
      setError(extractApiError(e, 'Eroare la inițierea înregistrării.'));
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🏢 Primești plăți prin TimeSaver</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.7 }}>
          Ca <strong>prestator</strong> pe platforma TimeSaver, poți primi plăți direct de la angajatori pentru serviciile prestate.
          Totul se procesează securizat prin Stripe Connect, fără comisioane ascunse.
        </p>
        <div className="alert" style={{ background: 'var(--bg-alt, #f8f9fa)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '0.75rem', maxWidth: 540 }}>
          <strong>Doar pentru prestatori.</strong> Dacă folosești TimeSaver ca angajator (postezi joburi), nu ai nevoie de Stripe Connect — plățile se fac direct cu cardul la inițierea unui task.
        </div>
      </div>

      <div className="billing-biz-grid" style={{ marginBottom: '1.5rem' }}>
        {FEATURES.map(f => (
          <div key={f.title} className="card billing-biz-card">
            <div className="billing-biz-icon">{f.icon}</div>
            <div className="billing-biz-title">{f.title}</div>
            <div className="billing-biz-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Connect onboarding */}
      <div className="card" style={{ maxWidth: 540 }}>
        <h3 style={{ marginBottom: '0.5rem' }}>🔗 Configurare cont plăți Stripe Connect</h3>

        {loading ? (
          <p className="text-muted">Se verifică statusul contului...</p>
        ) : status?.onboardingComplete ? (
          <>
            <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>
              ✅ Contul tău de plăți este activ. Poți primi plăți de la angajatori.
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <div>ID cont: <code>{status.accountId}</code></div>
              {status.chargesEnabled && <div>Plăți: activate</div>}
              {status.payoutsEnabled && <div>Retrageri: activate</div>}
            </div>
            <button className="btn btn-outline btn-sm" onClick={startOnboarding} disabled={actionLoading}>
              {actionLoading ? 'Se procesează...' : 'Modifică contul'}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              {status?.connected
                ? 'Contul tău Stripe Connect a fost creat dar nu a fost finalizat. Completează înregistrarea pentru a primi plăți.'
                : 'Conectează un cont bancar prin Stripe Connect pentru a primi plăți de la angajatori pentru task-urile completate.'}
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
            <button className="btn btn-primary" onClick={startOnboarding} disabled={actionLoading}>
              {actionLoading
                ? 'Se procesează...'
                : status?.connected
                  ? '🔗 Completează înregistrarea'
                  : '🔗 Configurează contul de plăți'}
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Vei fi redirecționat pe platforma Stripe pentru a completa configurarea în siguranță.
              Stripe Connect este un serviciu reglementat de plăți — datele tale sunt protejate.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Link to="/my-applications">Aplicațiile mele</Link> afișează întotdeauna starea configurării contului.
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default BusinessBillingPage;
