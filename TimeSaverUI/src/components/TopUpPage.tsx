import React, { useState } from 'react';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';

const PRESETS = [10, 25, 50, 100, 200, 500];

const TopUpPage: React.FC = () => {
  const [amount,   setAmount]   = useState<number>(50);
  const [custom,   setCustom]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const effectiveAmount = custom ? parseFloat(custom) : amount;
  const isValid = !isNaN(effectiveAmount) && effectiveAmount >= 10 && effectiveAmount <= 5000;

  const handlePreset = (val: number) => {
    setAmount(val);
    setCustom('');
  };

  const handleTopUp = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ checkoutUrl: string }>('/billing/create-topup-checkout-session', {
        amount: effectiveAmount,
      });
      window.location.href = res.data.checkoutUrl;
    } catch (e) {
      setError(extractApiError(e, 'Eroare la crearea sesiunii de plată.'));
      setLoading(false);
    }
  };

  return (
    <div className="billing-topup-form">
      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>➕ Reîncărcare sold</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
          Alege suma pe care vrei să o adaugi în soldul tău TimeSaver. Plata se procesează securizat prin Stripe.
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-alt, #f8f9fa)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          ℹ️ Soldul reîncărcat este separat de plățile pentru taskuri. Taskurile se plătesc direct cu cardul la inițierea jobului.
        </div>

        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Sumă predefinită (RON)
        </label>
        <div className="billing-amount-presets" style={{ marginBottom: '1.25rem' }}>
          {PRESETS.map(p => (
            <button
              key={p}
              className={`billing-amount-preset${amount === p && !custom ? ' selected' : ''}`}
              onClick={() => handlePreset(p)}
            >
              {p} RON
            </button>
          ))}
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Sau introdu o sumă personalizată (10–5000 RON)</label>
          <input
            type="number"
            className="form-control"
            placeholder="ex: 150"
            value={custom}
            min={10}
            max={5000}
            onChange={e => { setCustom(e.target.value); setAmount(0); }}
            style={{ maxWidth: 200 }}
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleTopUp}
            disabled={loading || !isValid}
          >
            {loading ? 'Se procesează...' : `Plătește ${isValid ? effectiveAmount.toFixed(2) : '—'} RON`}
          </button>
          {!isValid && (
            <span style={{ fontSize: '0.82rem', color: 'var(--danger, #dc2626)' }}>
              Suma trebuie să fie între 10 și 5000 RON.
            </span>
          )}
        </div>

        <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          🔒 Plata este procesată securizat prin Stripe. TimeSaver nu stochează datele cardului.
        </p>
      </div>
    </div>
  );
};

export default TopUpPage;
