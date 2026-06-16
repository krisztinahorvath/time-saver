import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { AdminJob, PagedResult } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS } from '../types';
import { AdminNav } from './AdminDashboard';
import './Admin.css';

const AdminJobs: React.FC = () => {
  const [result,       setResult]       = useState<PagedResult<AdminJob> | null>(null);
  const [page,         setPage]         = useState(1);
  const [keyword,      setKeyword]      = useState('');
  const [loading,      setLoading]      = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetch = useCallback(async (p = page, kw = keyword) => {
    setLoading(true);
    try {
      const res = await api.get<PagedResult<AdminJob>>('/Admin/jobs', {
        params: { page: p, pageSize: 20, keyword: kw || undefined },
      });
      setResult(res.data);
      setPage(p);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea joburilor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetch(1, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteJob = async (id: number, title: string) => {
    if (!window.confirm(`Ștergi definitiv jobul "${title}"?`)) return;
    try {
      await api.delete(`/Admin/jobs/${id}`);
      setNotification({ msg: 'Jobul a fost șters.', type: 'success' });
      fetch();
    } catch (e) {
      setNotification({ msg: extractApiError(e, 'Eroare la ștergere.'), type: 'error' });
    }
  };

  const jobs = result?.items ?? [];

  return (
    <div className="admin-layout">
      <AdminNav />
      <div className="admin-content">
        <h1 className="admin-page-title">Joburi</h1>

        {notification && (
          <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
            {notification.msg}
          </div>
        )}

        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Caută după titlu sau descriere..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetch(1, keyword)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => fetch(1, keyword)}>Caută</button>
        </div>

        {loading ? (
          <div className="loading-wrap">Se încarcă...</div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Titlu</th>
                    <th>Angajator</th>
                    <th>Categorie</th>
                    <th>Buget</th>
                    <th>Status</th>
                    <th>Postat</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Niciun job găsit.</td></tr>
                  ) : jobs.map(j => (
                    <tr key={j.id}>
                      <td>{j.id}</td>
                      <td><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                      <td>{j.userName ?? `#${j.userId}`}</td>
                      <td>{CATEGORY_LABELS[j.category] ?? j.category}</td>
                      <td>{j.budget} RON</td>
                      <td><span className={`badge badge-${j.status.toLowerCase()}`}>{STATUS_LABELS[j.status] ?? j.status}</span></td>
                      <td>{new Date(j.createdAt).toLocaleDateString('ro-RO')}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteJob(j.id, j.title)}>
                          🗑 Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(result?.totalPages ?? 0) > 1 && (
              <div className="pagination" style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => fetch(page - 1, keyword)}>← Anterioară</button>
                <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{page} / {result!.totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= (result?.totalPages ?? 1)} onClick={() => fetch(page + 1, keyword)}>Următoare →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminJobs;
