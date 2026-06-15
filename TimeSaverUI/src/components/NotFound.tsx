import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    background: 'var(--bg)',
  }}>
    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
      Pagina nu a fost găsită
    </h1>
    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
      Adresa pe care o cauți nu există sau a fost mutată.
    </p>
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Link to="/" className="btn btn-primary">Pagina principală</Link>
      <Link to="/explore" className="btn btn-outline">Explorează joburi</Link>
    </div>
  </div>
);

export default NotFound;
