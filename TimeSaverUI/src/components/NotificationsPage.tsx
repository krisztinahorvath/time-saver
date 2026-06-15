import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { Notification, PagedResult } from '../types';
import { NOTIFICATION_ICONS } from '../types';
import './NotificationsPage.css';

const PAGE_SIZE = 20;

const NotificationsPage: React.FC = () => {
  const [result,  setResult]  = useState<PagedResult<Notification> | null>(null);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<PagedResult<Notification>>('/Notifications', {
        params: { page: p, pageSize: PAGE_SIZE },
      });
      setResult(res.data);
      setPage(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const markRead = async (id: number) => {
    try {
      await api.put(`/Notifications/${id}/read`);
      setResult(prev => prev ? {
        ...prev,
        items: prev.items.map(n => n.id === id ? { ...n, isRead: true } : n),
      } : prev);
      window.dispatchEvent(new Event('notifications-read'));
    } catch { /* non-blocking */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/Notifications/read-all');
      setResult(prev => prev ? {
        ...prev,
        items: prev.items.map(n => ({ ...n, isRead: true })),
      } : prev);
      window.dispatchEvent(new Event('notifications-read'));
    } catch { /* non-blocking */ }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ro-RO', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const notifications = result?.items ?? [];
  const hasUnread = notifications.some(n => !n.isRead);
  const totalPages = result?.totalPages ?? 0;

  return (
    <div className="page-wrap">
      <div className="notif-header">
        <div>
          <h1>Notificări</h1>
          <p className="text-muted">Activitatea recentă pe platformă</p>
        </div>
        {hasUnread && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            Marchează toate ca citite
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-wrap">Se încarcă...</div>
      ) : error ? (
        <div className="alert alert-error">
          Nu am putut încărca notificările.
          <button className="btn btn-outline btn-sm" onClick={() => fetchPage(page)} style={{ marginLeft: '1rem' }}>
            Reîncearcă
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h3>Nicio notificare</h3>
          <p>Vei fi notificat când se întâmplă ceva important.</p>
          <Link to="/explore" className="btn btn-outline" style={{ marginTop: '1rem' }}>
            Explorează joburi
          </Link>
        </div>
      ) : (
        <>
          <div className="notif-list">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`card notif-card ${n.isRead ? 'notif-read' : 'notif-unread'}`}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
              >
                <div className="notif-icon">
                  {NOTIFICATION_ICONS[n.type] ?? '🔔'}
                </div>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-date">{formatDate(n.createdAt)}</div>
                </div>
                <div className="notif-actions">
                  {n.relatedJobPostId && (
                    <Link
                      to={`/jobs/${n.relatedJobPostId}`}
                      className="btn btn-outline btn-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      Vezi job
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); markRead(n.id); }}
                    >
                      Marcheaza citit
                    </button>
                  )}
                </div>
                {!n.isRead && <div className="notif-dot" />}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => fetchPage(page - 1)}
              >
                Anterioară
              </button>
              <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => fetchPage(page + 1)}
              >
                Următoare
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
