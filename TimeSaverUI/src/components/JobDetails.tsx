import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import type { JobPost } from '../types';
import { CATEGORY_LABELS, STATUS_LABELS } from '../types';
import './JobDetails.css';

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyStatus, setApplyStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchJob = async () => {
    try {
      const res = await api.get<JobPost>(`/JobPosts/${id}`);
      setJob(res.data);
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJob(); }, [id]);

  const isOwner   = job?.userId === user?.userId;
  const isWorker  = job?.acceptedByUserId === user?.userId;
  const applied   = job?.jobApplications?.some(a => a.userId === user?.userId) ?? false;

  const handleApply = async () => {
    if (!applyMsg.trim()) {
      setApplyStatus({ type: 'error', msg: 'Scrie un mesaj de aplicare.' });
      return;
    }
    setApplying(true);
    try {
      await api.post('/JobApplications', { jobPostId: Number(id), message: applyMsg });
      setApplyStatus({ type: 'success', msg: 'Aplicație trimisă cu succes!' });
      setApplyMsg('');
      fetchJob();
    } catch (e: unknown) {
      const err = e as { response?: { data?: string | { message?: string } } };
      const errData = err.response?.data;
      const msg = typeof errData === 'string' ? errData : errData?.message ?? 'Eroare la aplicare.';
      setApplyStatus({ type: 'error', msg });
    } finally {
      setApplying(false);
    }
  };

  const acceptApp = async (appId: number) => {
    if (!confirm('Accepți această aplicație?')) return;
    try {
      await api.put(`/JobPosts/${id}/accept`, { applicationId: appId });
      setNotification('Aplicație acceptată!');
      fetchJob();
    } catch { setNotification('Eroare la acceptare.'); }
  };

  const completeJob = async () => {
    if (!confirm('Marchezi jobul ca finalizat?')) return;
    try {
      await api.put(`/JobPosts/${id}/complete`);
      setNotification('Job finalizat!');
      fetchJob();
    } catch { setNotification('Eroare la finalizare.'); }
  };

  const deleteJob = async () => {
    if (!confirm('Ștergi acest job? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/JobPosts/${id}`);
      navigate('/my-jobs');
    } catch { setNotification('Eroare la ștergere.'); }
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;
  if (!job)    return (
    <div className="page-wrap">
      <div className="empty-state"><h3>Job negăsit</h3><p>Jobul nu există sau nu ai acces.</p><Link to="/explore">← Înapoi la explorare</Link></div>
    </div>
  );

  return (
    <div className="page-wrap">
      <Link to="/explore" className="back-link">← Înapoi la explorare</Link>

      {notification && (
        <div className={`alert ${notification.includes('Eroare') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
          {notification}
        </div>
      )}

      <div className="jd-layout">
        <div className="jd-main">
          <div className="card">
            <div className="jd-header">
              <div className="jd-category">{CATEGORY_LABELS[job.category] ?? job.category}</div>
              <span className={`badge badge-${job.status.toLowerCase().replace('inprogress', 'inprogress')}`}>
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </div>

            <h1 className="jd-title">{job.title}</h1>

            <div className="jd-meta">
              <div className="jd-meta-item"><span>💰</span><strong>{job.budget} RON</strong></div>
              <div className="jd-meta-item"><span>📍</span>{job.location}</div>
              <div className="jd-meta-item"><span>📅</span>{new Date(job.createdAt).toLocaleDateString('ro-RO')}</div>
              {job.deadline && (
                <div className="jd-meta-item"><span>⏰</span>Termen: {new Date(job.deadline).toLocaleDateString('ro-RO')}</div>
              )}
            </div>

            <div className="jd-section">
              <h3>Descriere</h3>
              <p>{job.description}</p>
            </div>

            {job.specialRequirements && (
              <div className="jd-section">
                <h3>Cerințe speciale</h3>
                <p>{job.specialRequirements}</p>
              </div>
            )}

            {job.images && job.images.length > 0 && (
              <div className="jd-section">
                <h3>Imagini</h3>
                <div className="jd-images">
                  {job.images.map(img => (
                    <img key={img.id} src={img.imageUrl} alt="job" className="jd-img" />
                  ))}
                </div>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="jd-owner-actions">
                {job.status === 'InProgress' && (
                  <button className="btn btn-success" onClick={completeJob}>✓ Marchează finalizat</button>
                )}
                {job.status === 'Open' && (
                  <button className="btn btn-danger btn-sm" onClick={deleteJob}>🗑 Șterge job</button>
                )}
              </div>
            )}

            {/* Worker complete */}
            {isWorker && job.status === 'InProgress' && !isOwner && (
              <div className="jd-owner-actions">
                <button className="btn btn-success" onClick={completeJob}>✓ Marchează finalizat</button>
              </div>
            )}
          </div>

          {/* Apply section — only for workers, non-owners, on open jobs */}
          {!isOwner && job.status === 'Open' && (
            <div className="card jd-apply-card">
              <h3>Aplică la acest job</h3>
              {applied ? (
                <div className="alert alert-success">✓ Ai aplicat deja la acest job.</div>
              ) : (
                <>
                  {applyStatus && (
                    <div className={`alert alert-${applyStatus.type}`}>{applyStatus.msg}</div>
                  )}
                  <div className="form-group">
                    <label>Mesajul tău *</label>
                    <textarea
                      rows={4}
                      placeholder="Descrie de ce ești potrivit pentru acest task, experiența ta relevantă..."
                      value={applyMsg}
                      onChange={e => { setApplyMsg(e.target.value); setApplyStatus(null); }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                    {applying ? 'Se trimite...' : '📩 Trimite aplicația'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="jd-sidebar">
          {job.user && (
            <div className="card jd-poster-card">
              <h3>Postat de</h3>
              <div className="jd-poster-name">{job.user.name}</div>
              <Link to={`/users/${job.userId}/profile`} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}>
                Vezi profil
              </Link>
            </div>
          )}

          {job.status === 'InProgress' && job.acceptedByUser && (
            <div className="card jd-accepted-card">
              <h3>Prestator acceptat</h3>
              <div className="jd-poster-name">{job.acceptedByUser.name}</div>
              <Link to={`/users/${job.acceptedByUserId}/profile`} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}>
                Vezi profil
              </Link>
            </div>
          )}

          {/* Applications (visible to owner) */}
          {isOwner && job.jobApplications && job.jobApplications.length > 0 && (
            <div className="card">
              <h3>Aplicații ({job.jobApplications.length})</h3>
              <div className="jd-apps-list">
                {job.jobApplications.map(app => (
                  <div key={app.id} className="jd-app-item">
                    <div className="jd-app-header">
                      <Link to={`/users/${app.userId}/profile`} className="jd-app-name">
                        👤 {app.user?.name ?? `User #${app.userId}`}
                      </Link>
                      <span className={`badge badge-${app.jobApplicationStatus.toLowerCase()}`}>
                        {app.jobApplicationStatus === 'Accepted' ? 'Acceptat' : app.jobApplicationStatus === 'Rejected' ? 'Respins' : 'În așteptare'}
                      </span>
                    </div>
                    <p className="jd-app-msg">"{app.message}"</p>
                    {job.status === 'Open' && app.jobApplicationStatus === 'Pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => acceptApp(app.id)}>
                        Acceptă
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
