import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';

const PaymentMethodsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ portalUrl: string }>('/billing/create-customer-portal-session');
      window.location.href = res.data.portalUrl;
    } catch (e) {
      setError(extractApiError(e, 'Eroare la deschiderea portalului Stripe.'));
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2 style={{ marginBottom: '0.5rem' }}>💳 Metode de plată</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Gestionează cardurile salvate, adresele de facturare și abonamentele active prin portalul securizat Stripe.
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <p style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>
            Portalul Stripe necesită un cont asociat. Activează{' '}
            <Link to="/plus">TimeSaver Plus</Link> sau fă o{' '}
            <Link to="/billing/top-up">reîncărcare</Link> mai întâi.
          </p>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={openPortal}
        disabled={loading}
        style={{ marginBottom: '1.25rem' }}
      >
        {loading ? 'Se deschide portalul...' : '🔗 Deschide portalul Stripe'}
      </button>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong>Ce poți face în portalul Stripe:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
          <li>Adaugă sau șterge carduri de plată</li>
          <li>Actualizează adresa de facturare</li>
          <li>Vizualizează și descarcă facturi</li>
          <li>Anulează abonamentul TimeSaver Plus</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentMethodsPage;
