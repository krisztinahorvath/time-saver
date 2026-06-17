import React from 'react';
import { Link } from 'react-router-dom';

const TopUpCancelPage: React.FC = () => (
  <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '2.5rem' }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
    <h2 style={{ marginBottom: '0.5rem' }}>Reîncărcare anulată</h2>
    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
      Plata a fost anulată. Nicio sumă nu a fost debitată din contul tău.
    </p>
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <Link to="/billing/top-up" className="btn btn-primary">➕ Încearcă din nou</Link>
      <Link to="/billing" className="btn btn-outline">↩ Înapoi la facturare</Link>
    </div>
  </div>
);

export default TopUpCancelPage;
