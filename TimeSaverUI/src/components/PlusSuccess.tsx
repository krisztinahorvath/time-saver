import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlus } from '../context/PlusContext';

const PlusSuccess: React.FC = () => {
  const { refresh } = usePlus();

  useEffect(() => {
    // Refresh Plus status after returning from Stripe; webhook may take a few seconds
    const t = setTimeout(refresh, 2000);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="page-wrap" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
      <h1>Plată efectuată cu succes!</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '1rem auto' }}>
        Abonamentul tău TimeSaver Plus este în curs de activare.
        Dacă badge-ul nu apare imediat, activarea poate dura câteva secunde — reîncarcă pagina.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/plus" className="btn btn-primary">⭐ Vezi statusul Plus</Link>
        <Link to="/dashboard" className="btn btn-outline">Dashboard</Link>
      </div>
    </div>
  );
};

export default PlusSuccess;
