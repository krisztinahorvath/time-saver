import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { ConnectStatus } from '../types';

const BillingConnectReturnPage: React.FC = () => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ConnectStatus>('/billing/connect/status')
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap">Se verifică statusul contului...</div>;

  return (
    <div className="page-wrap" style={{ maxWidth: 520, margin: '3rem auto' }}>
      <div className="card">
        {status?.onboardingComplete ? (
          <>
            <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>✅ Cont configurat cu succes!</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Contul tău de plăți Stripe Connect este activ. Acum poți primi plăți de la angajatori
              pentru task-urile completate pe TimeSaver.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/my-applications" className="btn btn-primary">Aplicațiile mele</Link>
              <Link to="/billing/business" className="btn btn-outline">Detalii cont plăți</Link>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>⏳ Configurare în curs</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Contul tău Stripe Connect nu este complet configurat încă. Poți reveni oricând
              pentru a finaliza înregistrarea.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/billing/business" className="btn btn-primary">Completează configurarea</Link>
              <Link to="/my-applications" className="btn btn-outline">Aplicațiile mele</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingConnectReturnPage;
