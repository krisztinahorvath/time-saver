import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { BillingTransaction, StripeInvoice, JobPaymentReceipt } from '../types';

function receiptStatusLabel(status: string): string {
  switch (status) {
    case 'PaidHeld':         return 'Securizat';
    case 'ReleasedToWorker': return 'Eliberat';
    case 'Refunded':         return 'Rambursat';
    case 'Failed':           return 'Eșuat';
    default:                 return status;
  }
}

function receiptBadgeClass(status: string): string {
  switch (status) {
    case 'PaidHeld':         return 'badge-open';
    case 'ReleasedToWorker': return 'badge-completed';
    case 'Refunded':         return 'badge-cancelled';
    case 'Failed':           return 'badge-cancelled';
    default:                 return 'badge-open';
  }
}

const InvoicesPage: React.FC = () => {
  const [transactions, setTransactions]   = useState<BillingTransaction[]>([]);
  const [invoices,     setInvoices]       = useState<StripeInvoice[]>([]);
  const [jobPayments,  setJobPayments]    = useState<JobPaymentReceipt[]>([]);
  const [loading,      setLoading]        = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ items: BillingTransaction[] }>('/billing/transactions'),
      api.get<{ invoices: StripeInvoice[] }>('/billing/invoices'),
      api.get<{ items: JobPaymentReceipt[] }>('/billing/job-payments'),
    ]).then(([txRes, invRes, jpRes]) => {
      setTransactions(txRes.data.items);
      setInvoices(invRes.data.invoices);
      setJobPayments(jpRes.data.items);
    }).catch(() => {
      // show whatever loaded
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap">Se încarcă documentele...</div>;

  return (
    <>
      {/* Stripe invoices (subscription) */}
      {invoices.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>🧾 Facturi Stripe (abonament Plus)</h3>
          <div className="billing-invoice-list">
            {invoices.map(inv => (
              <div key={inv.id} className="billing-invoice-item card">
                <div>
                  <div className="billing-invoice-num">{inv.number ?? inv.id}</div>
                  <div className="billing-invoice-date">
                    {new Date(inv.created).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="billing-invoice-amount">
                    {inv.amountPaid.toFixed(2)} {inv.currency?.toUpperCase() ?? 'RON'}
                  </span>
                  <span className={`badge badge-${inv.status === 'paid' ? 'completed' : 'open'}`}>
                    {inv.status === 'paid' ? 'Plătit' : inv.status ?? 'N/A'}
                  </span>
                  <div className="billing-invoice-actions">
                    {inv.invoicePdfUrl && (
                      <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                        📄 PDF
                      </a>
                    )}
                    {inv.hostedUrl && (
                      <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        🔗 Detalii
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task payment receipts */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: '0.25rem' }}>💳 Chitanțe task</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Documente interne pentru plățile de task — nu sunt facturi fiscale.
        </p>
        {jobPayments.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 0' }}>
            <p>Nicio plată de task înregistrată.</p>
          </div>
        ) : (
          <div className="billing-invoice-list">
            {jobPayments.map(jp => {
              const isEmployer = jp.role === 'employer';
              const displayAmt = isEmployer ? jp.amount : (jp.workerAmount ?? jp.amount);
              const roleLabel  = isEmployer ? 'Angajator' : 'Prestator';
              const dateVal    = jp.releasedAt ?? jp.paidAt ?? jp.createdAt;
              return (
                <div key={`jp_${jp.id}`} className="billing-invoice-item card">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="billing-invoice-num" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {jp.jobTitle ?? `Task #${jp.jobPostId}`}
                      <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '0 0.3rem' }}>
                        {roleLabel}
                      </span>
                      {jp.paymentSource === 'Wallet' && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, padding: '0 0.3rem' }}>
                          💰 sold
                        </span>
                      )}
                    </div>
                    <div className="billing-invoice-date" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span>{new Date(dateVal).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {jp.platformFeeAmount !== undefined && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {jp.platformFeeAmount === 0
                            ? '⭐ Comision 0% — beneficiu Plus'
                            : `Comision platformă: ${jp.platformFeeAmount.toFixed(2)} RON (5%)`}
                          {jp.workerAmount !== undefined && (
                            <> · Prestator primește: {jp.workerAmount.toFixed(2)} RON</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span className="billing-invoice-amount">
                      {displayAmt.toFixed(2)} {jp.currency}
                    </span>
                    <span className={`badge ${receiptBadgeClass(jp.status)}`}>
                      {receiptStatusLabel(jp.status)}
                    </span>
                    <Link to={`/jobs/${jp.jobPostId}`} className="btn btn-ghost btn-sm">
                      → Job
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wallet top-up records */}
      <div className="card">
        <h3 style={{ marginBottom: '0.25rem' }}>💰 Reîncărcări sold</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Document tranzacție — confirmare reîncărcare sold TimeSaver.
        </p>
        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 0' }}>
            <p>Nicio reîncărcare înregistrată.</p>
            <Link to="/billing/top-up" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              Fă prima reîncărcare
            </Link>
          </div>
        ) : (
          <div className="billing-invoice-list">
            {transactions.map(tx => (
              <div key={tx.id} className="billing-invoice-item card">
                <div>
                  <div className="billing-invoice-num">{tx.description ?? 'Reîncărcare sold'}</div>
                  <div className="billing-invoice-date">
                    {new Date(tx.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="billing-invoice-amount">
                    {tx.amount.toFixed(2)} {tx.currency.toUpperCase()}
                  </span>
                  <span className={`badge badge-${tx.status === 'Succeeded' ? 'completed' : tx.status === 'Failed' ? 'cancelled' : 'open'}`}>
                    {tx.status === 'Succeeded' ? 'Reușit' : tx.status === 'Failed' ? 'Eșuat' : 'În procesare'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default InvoicesPage;
