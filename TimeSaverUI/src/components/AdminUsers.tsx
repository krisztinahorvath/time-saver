import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { AdminUser, PagedResult } from '../types';
import { AdminNav } from './AdminDashboard';
import './Admin.css';

const AdminUsers: React.FC = () => {
  const [result,       setResult]       = useState<PagedResult<AdminUser> | null>(null);
  const [page,         setPage]         = useState(1);
  const [keyword,      setKeyword]      = useState('');
  const [loading,      setLoading]      = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetch = useCallback(async (p = page, kw = keyword) => {
    setLoading(true);
    try {
      const res = await api.get<PagedResult<AdminUser>>('/Admin/users', {
        params: { page: p, pageSize: 20, keyword: kw || undefined },
      });
      setResult(res.data);
      setPage(p);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea utilizatorilor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetch(1, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetch(1, keyword);

  const suspend = async (id: number, suspend: boolean) => {
    try {
      await api.put(`/Admin/users/${id}/${suspend ? 'suspend' : 'unsuspend'}`);
      setNotification({ msg: suspend ? 'Utilizator suspendat.' : 'Utilizator reactivat.', type: 'success' });
      fetch();
    } catch (e) {
      setNotification({ msg: extractApiError(e, 'Eroare.'), type: 'error' });
    }
  };

  const users = result?.items ?? [];

  return (
    <div className="admin-layout">
      <AdminNav />
      <div className="admin-content">
        <h1 className="admin-page-title">Utilizatori</h1>

        {notification && (
          <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
            {notification.msg}
          </div>
        )}

        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Caută după nume sau email..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSearch}>Caută</button>
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
                    <th>Nume</th>
                    <th>Email</th>
                    <th>Tip</th>
                    <th>Joburi</th>
                    <th>Recenzii</th>
                    <th>Înregistrat</th>
                    <th>Status</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Niciun utilizator găsit.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td><Link to={`/users/${u.id}/profile`}>{u.name}</Link></td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>{u.userType}</td>
                      <td>{u.jobCount}</td>
                      <td>{u.reviewCount}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString('ro-RO')}</td>
                      <td>
                        {u.isSuspended
                          ? <span className="badge badge-suspended">Suspendat</span>
                          : <span className="badge badge-completed">Activ</span>
                        }
                      </td>
                      <td>
                        {u.userType !== 'Admin' && (
                          u.isSuspended
                            ? <button className="btn btn-outline btn-sm" onClick={() => suspend(u.id, false)}>Reactivează</button>
                            : <button className="btn btn-danger btn-sm"  onClick={() => suspend(u.id, true)}>Suspendă</button>
                        )}
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

export default AdminUsers;
