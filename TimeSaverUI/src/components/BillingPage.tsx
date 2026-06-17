import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { BillingSummary, BillingTransaction } from '../types';

function txIcon(type: string): string {
  switch (type) {
    case 'TopUp':               return '💰';
    case 'WalletDebitTask':     return '📤';
    case 'TaskPaymentReceived': return '💸';
    case 'TaskPaymentEscrow':   return '🔒';
    case 'TaskPaymentHeld':     return '📤';
    case 'TaskPaymentReleased': return '✅';
    default:                    return '📋';
  }
}

function txSign(type: string): string {
  switch (type) {
    case 'TopUp':
    case 'TaskPaymentReceived': return '+';
    case 'WalletDebitTask':
    case 'TaskPaymentHeld':
    case 'TaskPaymentReleased': return '-';
    default:                    return '';
  }
}

function txColorClass(type: string): string {
  switch (type) {
    case 'TopUp':
    case 'TaskPaymentReceived': return 'positive';
    case 'WalletDebitTask':
    case 'TaskPaymentHeld':
    case 'TaskPaymentReleased': return 'negative';
    default:                    return '';
  }
}

function txLabel(type: string): string {
  switch (type) {
    case 'TopUp':               return 'Reîncărcare sold';
    case 'WalletDebitTask':     return 'Plată task din sold';
    case 'TaskPaymentReceived': return 'Încasare task primită';
    case 'TaskPaymentEscrow':   return 'Plată task securizată (în escrow)';
    case 'TaskPaymentHeld':     return 'Plată task efectuată';
    case 'TaskPaymentReleased': return 'Plată task eliberată prestatorului';
    default:                    return type;
  }
}

const BillingPage: React.FC = () => {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    api.get<BillingSummary>('/billing/summary')
      .then(r => setSummary(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;
  if (error)   return <div className="empty-state"><h3>Eroare la încărcarea datelor de facturare.</h3></div>;

  const walletBalance      = summary?.walletBalance      ?? 0;
  const walletDebits       = summary?.walletDebits       ?? 0;
  const earningsBalance    = summary?.earningsBalance    ?? 0;
  const pendingHeld        = summary?.pendingHeldPayments ?? 0;
  const taskPaymentsHeld   = summary?.taskPaymentsHeld   ?? 0;
  const taskPaymentsRel    = summary?.taskPaymentsReleased ?? 0;

  const hasWorkerData   = earningsBalance > 0 || pendingHeld > 0;
  const hasEmployerData = taskPaymentsHeld > 0 || taskPaymentsRel > 0;

  return (
    <>
      {/* Money model explanation */}
      <div className="alert" style={{
        background: 'var(--bg-alt, #f8f9fa)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text)' }}>Cum funcționează plățile în TimeSaver?</strong><br />
        Soldul reîncărcat și plățile pentru taskuri sunt <strong>separate</strong>.
        Taskurile se plătesc direct cu cardul prin Stripe — soldul reîncărcat nu este dedus.
        Câștigurile prestatorilor sunt virate direct în contul bancar prin Stripe Connect.
      </div>

      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Wallet (top-up balance minus wallet task debits) */}
        <div className="billing-balance-card">
          <div className="billing-balance-label">Sold reîncărcat</div>
          <div className="billing-balance-amount">{walletBalance.toFixed(2)}</div>
          <div className="billing-balance-currency">RON</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
            Utilizabil pentru taskuri și abonament Plus
            {walletDebits > 0 && (
              <span style={{ display: 'block' }}>
                Utilizat pentru taskuri: {walletDebits.toFixed(2)} RON
              </span>
            )}
          </div>
          <Link to="/billing/top-up" className="btn btn-sm" style={{ marginTop: '0.75rem' }}>
            ➕ Reîncarcă
          </Link>
        </div>

        {/* Worker: money in escrow (employer paid, not yet released) */}
        {pendingHeld > 0 && (
          <div className="billing-balance-card" style={{ borderColor: 'var(--primary)' }}>
            <div className="billing-balance-label">Reținut în escrow</div>
            <div className="billing-balance-amount" style={{ color: 'var(--primary)' }}>
              {pendingHeld.toFixed(2)}
            </div>
            <div className="billing-balance-currency">RON</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Plătit de angajator, eliberat la finalizare
            </div>
          </div>
        )}

        {/* Worker: total already transferred to bank */}
        {earningsBalance > 0 && (
          <div className="billing-balance-card" style={{ borderColor: 'var(--success, #22c55e)' }}>
            <div className="billing-balance-label">Total câștigat</div>
            <div className="billing-balance-amount" style={{ color: 'var(--success, #22c55e)' }}>
              {earningsBalance.toFixed(2)}
            </div>
            <div className="billing-balance-currency">RON</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Virati în contul bancar prin Stripe
            </div>
          </div>
        )}

        {/* Employer: payments in escrow */}
        {taskPaymentsHeld > 0 && (
          <div className="billing-balance-card" style={{ borderColor: 'var(--warning, #f59e0b)' }}>
            <div className="billing-balance-label">Plăți task în escrow</div>
            <div className="billing-balance-amount" style={{ color: 'var(--warning, #f59e0b)' }}>
              {taskPaymentsHeld.toFixed(2)}
            </div>
            <div className="billing-balance-currency">RON</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Reținute până la eliberare
            </div>
          </div>
        )}

        {/* Employer: payments released */}
        {taskPaymentsRel > 0 && (
          <div className="billing-balance-card" style={{ borderColor: 'var(--text-muted)' }}>
            <div className="billing-balance-label">Plăți task eliberate</div>
            <div className="billing-balance-amount" style={{ color: 'var(--text-muted)' }}>
              {taskPaymentsRel.toFixed(2)}
            </div>
            <div className="billing-balance-currency">RON</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Eliberate prestatorilor
            </div>
          </div>
        )}

        {/* Show placeholder cards if no activity yet */}
        {!hasWorkerData && !hasEmployerData && (
          <div className="billing-balance-card" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
            <div className="billing-balance-label">Activitate taskuri</div>
            <div className="billing-balance-amount">0.00</div>
            <div className="billing-balance-currency">RON</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Nicio plată de task încă
            </div>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Tranzacții recente</h3>
          <Link to="/billing/invoices" className="btn btn-ghost btn-sm">Vezi toate</Link>
        </div>

        {!summary?.recentTransactions?.length ? (
          <div className="empty-state" style={{ padding: '1.5rem 0' }}>
            <p>Nicio tranzacție înregistrată.</p>
            <Link to="/billing/top-up" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              Fă prima reîncărcare
            </Link>
          </div>
        ) : (
          <div className="billing-tx-list">
            {summary.recentTransactions.map((tx: BillingTransaction) => (
              <div key={`${tx.type}_${tx.id}`} className="billing-tx-item">
                <div className="billing-tx-icon">{txIcon(tx.type)}</div>
                <div className="billing-tx-info">
                  <div className="billing-tx-desc">
                    {tx.description ?? txLabel(tx.type)}
                    {tx.jobPostId && (
                      <Link
                        to={`/jobs/${tx.jobPostId}`}
                        style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'var(--primary)' }}
                      >
                        →
                      </Link>
                    )}
                  </div>
                  <div className="billing-tx-date">
                    {new Date(tx.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className={`billing-tx-amount ${txColorClass(tx.type)}`}>
                  {txSign(tx.type)}{tx.amount.toFixed(2)} {tx.currency.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BillingPage;
