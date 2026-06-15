import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { JobPost } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS } from '../types';
import './MyJobs.css';

function statusBadge(status: string) {
  return (
    <span className={`badge badge-${status.toLowerCase().replace('inprogress', 'inprogress')}`}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </span>
  );
}

function appBadge(status: string) {
  const label = status === 'Accepted' ? 'Acceptat' : status === 'Rejected' ? 'Respins' : 'În așteptare';
  return <span className={`badge badge-${status.toLowerCase()}`}>{label}</span>;
}

const MyJobs: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await api.get<JobPost[]>('/JobPosts/mine');
      setJobs(res.data);
    } catch {
      setNotification({ msg: 'Eroare la încărcarea joburilor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const acceptApp = async (jobId: number, appId: number) => {
    if (!confirm('Accepți această aplicație? Celelalte vor fi respinse automat.')) return;
    try {
      await api.put(`/JobPosts/${jobId}/accept`, { applicationId: appId });
      setNotification({ msg: 'Aplicație acceptată cu succes!', type: 'success' });
      fetchJobs();
    } catch (e: unknown) {
      const err = e as { response?: { data?: string | { message?: string } } };
      const errData = err.response?.data;
      const msg = typeof errData === 'string' ? errData : errData?.message ?? 'Eroare la acceptare.';
      setNotification({ msg, type: 'error' });
    }
  };

  const completeJob = async (jobId: number) => {
    if (!confirm('Marchezi jobul ca finalizat?')) return;
    try {
      await api.put(`/JobPosts/${jobId}/complete`);
      setNotification({ msg: 'Job finalizat!', type: 'success' });
      fetchJobs();
    } catch {
      setNotification({ msg: 'Eroare la finalizare.', type: 'error' });
    }
  };

  const deleteJob = async (jobId: number) => {
    if (!confirm('Ștergi acest job?')) return;
    try {
      await api.delete(`/JobPosts/${jobId}`);
      setNotification({ msg: 'Job șters.', type: 'success' });
      fetchJobs();
    } catch {
      setNotification({ msg: 'Eroare la ștergere (jobul poate fi deja în desfășurare).', type: 'error' });
    }
  };

  if (loading) return <div className="loading-wrap">Se încarcă joburile...</div>;

  return (
    <div className="page-wrap">
      <div className="mj-header">
        <div>
          <h1>Joburile mele</h1>
          <p className="text-muted">Gestionează taskurile postate</p>
        </div>
        <Link to="/post-job" className="btn btn-primary">+ Job nou</Link>
      </div>

      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ marginBottom: '1rem' }}>
          {notification.msg}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job postat</h3>
          <p>Postează primul tău task pentru a primi oferte de la prestatori.</p>
          <Link to="/post-job" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Postează acum
          </Link>
        </div>
      ) : (
        <div className="mj-list">
          {jobs.map(job => (
            <div key={job.id} className="mj-card card">
              <div className="mj-card-header">
                <div className="mj-title-row">
                  <Link to={`/jobs/${job.id}`} className="mj-title">{job.title}</Link>
                  {statusBadge(job.status)}
                </div>
                <div className="mj-meta">
                  <span>💰 {job.budget} RON</span>
                  <span>📍 {job.location}</span>
                  <span>🏷️ {CATEGORY_LABELS[job.category] ?? job.category}</span>
                  <span>📅 {new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                  {job.deadline && <span>⏰ Termen: {new Date(job.deadline).toLocaleDateString('ro-RO')}</span>}
                </div>

                <div className="mj-actions">
                  {job.status === 'InProgress' && (
                    <button className="btn btn-success btn-sm" onClick={() => completeJob(job.id)}>
                      ✓ Finalizează
                    </button>
                  )}
                  {job.status === 'Open' && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteJob(job.id)}>
                      🗑 Șterge
                    </button>
                  )}
                </div>
              </div>

              {/* Accepted worker info */}
              {job.status === 'InProgress' && job.acceptedByUser && (
                <div className="mj-accepted-info">
                  ✅ Prestator acceptat:{' '}
                  <Link to={`/users/${job.acceptedByUserId}/profile`}>
                    <strong>{job.acceptedByUser.name}</strong>
                  </Link>
                </div>
              )}

              {/* Applications */}
              <div className="mj-apps-section">
                <h4>Aplicații ({job.jobApplications?.length ?? 0})</h4>
                {!job.jobApplications || job.jobApplications.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nicio aplicație primită.</p>
                ) : (
                  <div className="mj-apps-list">
                    {job.jobApplications.map(app => (
                      <div key={app.id} className={`mj-app-row ${app.jobApplicationStatus.toLowerCase()}`}>
                        <div className="mj-app-user">
                          <Link to={`/users/${app.userId}/profile`}>
                            👤 {app.user?.name ?? `User #${app.userId}`}
                          </Link>
                          {appBadge(app.jobApplicationStatus)}
                        </div>
                        <p className="mj-app-msg">"{app.message}"</p>
                        {job.status === 'Open' && app.jobApplicationStatus === 'Pending' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => acceptApp(job.id, app.id)}
                          >
                            Acceptă
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyJobs;
