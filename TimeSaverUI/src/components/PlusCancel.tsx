import React from 'react';
import { Link } from 'react-router-dom';

const PlusCancel: React.FC = () => (
  <div className="page-wrap" style={{ textAlign: 'center', paddingTop: '4rem' }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>↩</div>
    <h1>Plată anulată</h1>
    <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '1rem auto' }}>
      Nu a fost efectuată nicio plată. Poți reveni oricând la pagina Plus pentru a activa abonamentul.
    </p>
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
      <Link to="/plus" className="btn btn-primary">⭐ Înapoi la Plus</Link>
      <Link to="/dashboard" className="btn btn-outline">Dashboard</Link>
    </div>
  </div>
);

export default PlusCancel;
