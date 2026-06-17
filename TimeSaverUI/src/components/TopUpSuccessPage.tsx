import React from 'react';
import { Link } from 'react-router-dom';

const TopUpSuccessPage: React.FC = () => (
  <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '2.5rem' }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
    <h2 style={{ marginBottom: '0.5rem' }}>Reîncărcare reușită!</h2>
    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
      Suma a fost adăugată cu succes în soldul tău TimeSaver. Poate dura câteva secunde până apare în cont.
    </p>
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <Link to="/billing" className="btn btn-primary">💰 Vezi soldul</Link>
      <Link to="/billing/top-up" className="btn btn-outline">➕ Altă reîncărcare</Link>
    </div>
  </div>
);

export default TopUpSuccessPage;
