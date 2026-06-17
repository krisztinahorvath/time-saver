import React from 'react';
import './PlusBadge.css';

interface PlusBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlusBadge: React.FC<PlusBadgeProps> = ({ className = '', size = 'md' }) => (
  <span
    className={`plus-badge plus-badge-${size} ${className}`}
    title="TimeSaver Plus verificat"
    aria-label="Plus verificat"
  >
    ⭐
  </span>
);

export default PlusBadge;
