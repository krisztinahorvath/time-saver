import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './Billing.css';

const BillingSidebar: React.FC = () => {
  const { pathname } = useLocation();

  const cls = (path: string) =>
    pathname === path ? 'active' : '';

  return (
    <nav className="billing-sidebar">
      <h3 className="billing-sidebar-title">Facturare</h3>
      <Link to="/billing"                  className={cls('/billing')}>💰 Sold & Rezumat</Link>
      <Link to="/billing/payment-methods"  className={cls('/billing/payment-methods')}>💳 Metode de plată</Link>
      <Link to="/billing/top-up"           className={cls('/billing/top-up')}>➕ Reîncărcare sold</Link>
      <Link to="/billing/invoices"         className={cls('/billing/invoices')}>🧾 Facturi</Link>
      <Link to="/billing/business"         className={cls('/billing/business')}>🏢 Primești plăți</Link>
    </nav>
  );
};

const BillingLayout: React.FC = () => (
  <div className="page-wrap">
    <h1 className="page-title">Plăți și facturare</h1>
    <div className="billing-layout">
      <BillingSidebar />
      <div className="billing-content">
        <Outlet />
      </div>
    </div>
  </div>
);

export default BillingLayout;
