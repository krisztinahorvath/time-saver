import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import type { AdminReport, PagedResult, ReportStatus } from '../types';
import { AdminNav } from './AdminDashboard';
import './Admin.css';

const STATUS_LABELS: Record<ReportStatus, string> = {
  Open:        'Deschis',
  UnderReview: 'În analiză',
  Resolved:    'Rezolvat',
  Rejected:    'Respins',
};

const TYPE_LABELS: Record<string, string> = {
  User:   'Utilizator',
  Review: 'Recenzie',
  Job:    'Job',
};

const AdminReports: React.FC = () => {
  const [result,       setResult]       = useState<PagedResult<AdminReport> | null>(null);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editId,       setEditId]       = useState<number | null>(null);
  const [editStatus,   setEditStatus]   = useState<ReportStatus>('Open');
  const [editNote,     setEditNote]     = useState('');
  const [saving,       setSaving]       = useState(false);

  const fetch = useCallback(async (p = page, st = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get<PagedResult<AdminReport>>('/Admin/reports', {
        params: { page: p, pageSize: 20, status: st || undefined },
      });
      setResult(res.data);
      setPage(p);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea rapoartelor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetch(1, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (report: AdminReport) => {
    setEditId(report.id);
    setEditStatus(report.status);
    setEditNote(report.adminNote ?? '');
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.put(`/Admin/reports/${editId}/status`, { status: editStatus, adminNote: editNote || null });
      setNotification({ msg: 'Raport actualizat.', type: 'success' });
      setEditId(null);
      fetch();
    } catch (e) {
      setNotification({ msg: extractApiError(e, 'Eroare la actualizare.'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const reports = result?.items ?? [];

  return (
    <div className="admin-layout">
      <AdminNav />
      <div className="admin-content">
        <h1 className="admin-page-title">Rapoarte</h1>

        {notification && (
          <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
            {notification.msg}
          </div>
        )}

        <div className="admin-toolbar">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetch(1, e.target.value); }}>
            <option value="">Toate statusurile</option>
            <option value="Open">Deschis</option>
            <option value="UnderReview">În analiză</option>
            <option value="Resolved">Rezolvat</option>
            <option value="Rejected">Respins</option>
          </select>
        </div>

        {/* Edit modal */}
        {editId !== null && (
          <div className="report-modal-overlay" onClick={() => setEditId(null)}>
            <div className="report-modal" onClick={e => e.stopPropagation()}>
              <h2>Actualizează raport #{editId}</h2>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as ReportStatus)}>
                  <option value="Open">Deschis</option>
                  <option value="UnderReview">În analiză</option>
                  <option value="Resolved">Rezolvat</option>
                  <option value="Rejected">Respins</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notă admin (opțional)</label>
                <textarea rows={3} value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Detalii despre decizie..." />
              </div>
              <div className="report-modal-actions">
                <button className="btn btn-ghost" onClick={() => setEditId(null)}>Anulează</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-wrap">Se încarcă...</div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tip</th>
                    <th>Reclamant</th>
                    <th>Entitate raportată</th>
                    <th>Motiv</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Niciun raport găsit.</td></tr>
                  ) : reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td><span className="badge">{TYPE_LABELS[r.type] ?? r.type}</span></td>
                      <td title={r.reporterEmail}>{r.reporterName}</td>
                      <td>
                        {r.type === 'User'   && r.reportedUserId   && <Link to={`/users/${r.reportedUserId}/profile`}>{r.reportedUserName ?? `#${r.reportedUserId}`}</Link>}
                        {r.type === 'Job'    && r.reportedJobPostId    && <Link to={`/jobs/${r.reportedJobPostId}`}>{r.reportedJobTitle ?? `#${r.reportedJobPostId}`}</Link>}
                        {r.type === 'Review' && r.reportedReviewId && `Recenzie #${r.reportedReviewId}`}
                      </td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.reason}>
                        {r.reason}
                      </td>
                      <td>
                        <span className={`badge badge-${r.status.toLowerCase()}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td>{new Date(r.createdAt).toLocaleDateString('ro-RO')}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
                          ✏ Editează
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(result?.totalPages ?? 0) > 1 && (
              <div className="pagination" style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => fetch(page - 1, statusFilter)}>← Anterioară</button>
                <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{page} / {result!.totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= (result?.totalPages ?? 1)} onClick={() => fetch(page + 1, statusFilter)}>Următoare →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
