import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { AdminStats } from '../types';
import { STATUS_LABELS } from '../types';
import './Admin.css';

const AdminNav: React.FC = () => {
  const loc = useLocation();
  const active = (path: string) => loc.pathname === path ? 'admin-nav-link active' : 'admin-nav-link';
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-title">Admin</div>
      <Link to="/admin"          className={active('/admin')}>📊 Statistici</Link>
      <Link to="/admin/users"    className={active('/admin/users')}>👥 Utilizatori</Link>
      <Link to="/admin/jobs"     className={active('/admin/jobs')}>💼 Joburi</Link>
      <Link to="/admin/reports"  className={active('/admin/reports')}>🚩 Rapoarte</Link>
    </aside>
  );
};

export { AdminNav };

const AdminDashboard: React.FC = () => {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.get<AdminStats>('/Admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-layout">
      <AdminNav />
      <div className="admin-content">
        <h1 className="admin-page-title">Statistici platformă</h1>

        {loading && <div className="loading-wrap">Se încarcă...</div>}
        {error   && <div className="alert alert-error">Nu am putut încărca statisticile.</div>}

        {stats && (
          <>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-num">{stats.totalUsers}</div>
                <div className="admin-stat-label">Utilizatori</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num" style={{ color: 'var(--danger)' }}>{stats.suspendedUsers}</div>
                <div className="admin-stat-label">Suspendați</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num">{stats.totalJobs}</div>
                <div className="admin-stat-label">Joburi total</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num" style={{ color: 'var(--primary)' }}>{stats.openJobs}</div>
                <div className="admin-stat-label">Joburi active</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num" style={{ color: 'var(--success)' }}>{stats.completedJobs}</div>
                <div className="admin-stat-label">Finalizate</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num">{stats.totalReviews}</div>
                <div className="admin-stat-label">Recenzii</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num" style={{ color: stats.openReports > 0 ? 'var(--warning)' : undefined }}>{stats.openReports}</div>
                <div className="admin-stat-label">Rapoarte deschise</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-num">{stats.totalMessages}</div>
                <div className="admin-stat-label">Mesaje</div>
              </div>
            </div>

            <div className="admin-recent-grid">
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Utilizatori recenți</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Nume</th><th>Tip</th><th>Înregistrat</th></tr></thead>
                    <tbody>
                      {stats.recentUsers.map(u => (
                        <tr key={u.id}>
                          <td><Link to={`/users/${u.id}/profile`}>{u.name}</Link></td>
                          <td>{u.userType}</td>
                          <td>{new Date(u.createdAt).toLocaleDateString('ro-RO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Joburi recente</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Titlu</th><th>Status</th><th>Buget</th></tr></thead>
                    <tbody>
                      {stats.recentJobs.map(j => (
                        <tr key={j.id}>
                          <td><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                          <td><span className={`badge badge-${j.status.toLowerCase()}`}>{STATUS_LABELS[j.status] ?? j.status}</span></td>
                          <td>{j.budget} RON</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
