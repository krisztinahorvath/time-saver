import React from 'react';
import type { JobPaymentStatus } from '../types';

interface Props {
  status: JobPaymentStatus | undefined;
  workerAmount?: number;
  hasTransfer?: boolean;
  className?: string;
}

const LABELS: Record<JobPaymentStatus, string> = {
  NotStarted:       'Plată nepornită',
  CheckoutPending:  'Checkout în așteptare',
  PaidHeld:         'Plată securizată',
  ReleasedToWorker: 'Plată eliberată',
  RefundPending:    'Rambursare în așteptare',
  Refunded:         'Rambursat',
  Failed:           'Plată eșuată',
};

const COLORS: Record<JobPaymentStatus, string> = {
  NotStarted:       'var(--text-muted)',
  CheckoutPending:  'var(--warning)',
  PaidHeld:         'var(--primary)',
  ReleasedToWorker: 'var(--success)',
  RefundPending:    'var(--warning)',
  Refunded:         'var(--text-muted)',
  Failed:           'var(--danger)',
};

const PaymentStatusBadge: React.FC<Props> = ({ status, workerAmount, hasTransfer, className = '' }) => {
  if (!status || status === 'NotStarted') return null;

  const label = LABELS[status];
  const color = COLORS[status];

  let tooltip = label;
  if (status === 'PaidHeld') tooltip = 'Sumă reținută până la finalizare';
  if (status === 'ReleasedToWorker') {
    tooltip = hasTransfer === false
      ? 'Plată eliberată — transfer pending configurare cont prestator'
      : `Plată eliberată${workerAmount ? ` (${workerAmount.toFixed(2)} RON)` : ''}`;
  }

  return (
    <span
      className={`payment-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        color,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 6,
        padding: '0.2rem 0.55rem',
        whiteSpace: 'nowrap',
      }}
      title={tooltip}
    >
      {status === 'PaidHeld' ? '🔒' : status === 'ReleasedToWorker' ? '💸' : status === 'Failed' ? '❌' : '💳'}
      {label}
      {status === 'ReleasedToWorker' && hasTransfer === false && ' ⚠️'}
    </span>
  );
};

export default PaymentStatusBadge;
