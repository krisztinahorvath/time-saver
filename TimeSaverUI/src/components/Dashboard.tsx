import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import type { JobPost, JobApplication } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS } from '../types';
import './Dashboard.css';

function statusBadge(status: string) {
  const cls = status.toLowerCase().replace('inprogress', 'inprogress');
  return <span className={`badge badge-${cls}`}>{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}</span>;
}

function appBadge(status: string) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status === 'Accepted' ? 'Acceptat' : status === 'Rejected' ? 'Respins' : 'În așteptare'}</span>;
}

const EmployerDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const { user } = useAuth();

  const fetchJobs = async () => {
    try {
      const res = await api.get<JobPost[]>('/JobPosts/mine');
      setJobs(res.data);
    } catch {
      setMsg('Eroare la încărcarea joburilor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const acceptApp = async (jobId: number, appId: number) => {
    if (!confirm('Accepți această aplicație? Celelalte vor fi respinse automat.')) return;
    try {
      await api.put(`/JobPosts/${jobId}/accept`, { applicationId: appId });
      setMsg('Aplicație acceptată cu succes!');
      await fetchJobs();
    } catch (e: unknown) {
      const err = e as { response?: { data?: string | { message?: string } } };
      const errData = err.response?.data;
      setMsg(typeof errData === 'string' ? errData : errData?.message ?? 'Eroare la acceptare.');
    }
  };

  const completeJob = async (jobId: number) => {
    if (!confirm('Marchezi jobul ca finalizat?')) return;
    try {
      await api.put(`/JobPosts/${jobId}/complete`);
      setMsg('Job marcat ca finalizat!');
      await fetchJobs();
    } catch {
      setMsg('Eroare la finalizare.');
    }
  };

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;

  const openJobs      = jobs.filter(j => j.status === 'Open');
  const activeJobs    = jobs.filter(j => j.status === 'InProgress');
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  return (
    <div>
      <div className="dash-header">
        <div>
          <h1>Bun venit, {user?.name}! 👋</h1>
          <p className="text-muted">Gestionează taskurile și aplicațiile primite</p>
        </div>
        <Link to="/post-job" className="btn btn-primary">+ Postează job nou</Link>
      </div>

      {msg && <div className={`alert ${msg.includes('succes') || msg.includes('finalizat') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <div className="dash-stats">
        <div className="stat-card"><div className="stat-num">{openJobs.length}</div><div className="stat-label">Joburi active</div></div>
        <div className="stat-card"><div className="stat-num">{activeJobs.length}</div><div className="stat-label">În desfășurare</div></div>
        <div className="stat-card"><div className="stat-num">{completedJobs.length}</div><div className="stat-label">Finalizate</div></div>
        <div className="stat-card"><div className="stat-num">{jobs.reduce((s,j) => s + (j.jobApplications?.length || 0), 0)}</div><div className="stat-label">Aplicații primite</div></div>
      </div>

      <h2 className="section-title">Joburile mele</h2>
      {jobs.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job postat încă</h3>
          <p>Postează primul tău task și primești aplicații de la prestatori locali.</p>
          <Link to="/post-job" className="btn btn-primary" style={{ marginTop: '1rem' }}>Postează acum</Link>
        </div>
      ) : (
        <div className="dash-jobs">
          {jobs.map(job => (
            <div key={job.id} className="dash-job-card">
              <div className="djc-header">
                <div>
                  <div className="djc-title">
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                    {statusBadge(job.status)}
                  </div>
                  <div className="djc-meta">
                    <span>💰 {job.budget} RON</span>
                    <span>📍 {job.location}</span>
                    <span>🏷️ {CATEGORY_LABELS[job.category] ?? job.category}</span>
                    <span>📅 {new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>
                {job.status === 'InProgress' && (
                  <button className="btn btn-success btn-sm" onClick={() => completeJob(job.id)}>
                    ✓ Marchează finalizat
                  </button>
                )}
              </div>

              <div className="djc-apps">
                <h4>Aplicații ({job.jobApplications?.length ?? 0})</h4>
                {!job.jobApplications || job.jobApplications.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nicio aplicație încă.</p>
                ) : (
                  <div className="apps-list">
                    {job.jobApplications.map(app => (
                      <div key={app.id} className="app-row">
                        <div className="app-info">
                          <div className="app-user">
                            <Link to={`/users/${app.userId}/profile`}>👤 {app.user?.name ?? `User #${app.userId}`}</Link>
                            {appBadge(app.jobApplicationStatus)}
                          </div>
                          <p className="app-msg">"{app.message}"</p>
                        </div>
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

const WorkerDashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get<JobApplication[]>('/JobApplications')
      .then(res => setApplications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrap">Se încarcă...</div>;

  const pending   = applications.filter(a => a.jobApplicationStatus === 'Pending');
  const accepted  = applications.filter(a => a.jobApplicationStatus === 'Accepted');
  const rejected  = applications.filter(a => a.jobApplicationStatus === 'Rejected');

  return (
    <div>
      <div className="dash-header">
        <div>
          <h1>Bun venit, {user?.name}! 👋</h1>
          <p className="text-muted">Urmărește aplicațiile și joburile acceptate</p>
        </div>
        <Link to="/explore" className="btn btn-primary">Explorează joburi</Link>
      </div>

      <div className="dash-stats">
        <div className="stat-card"><div className="stat-num">{pending.length}</div><div className="stat-label">În așteptare</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{accepted.length}</div><div className="stat-label">Acceptate</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--danger)' }}>{rejected.length}</div><div className="stat-label">Respinse</div></div>
        <div className="stat-card"><div className="stat-num">{applications.length}</div><div className="stat-label">Total aplicații</div></div>
      </div>

      {accepted.length > 0 && (
        <>
          <h2 className="section-title">✅ Joburi acceptate</h2>
          <div className="dash-apps-list accepted-list">
            {accepted.map(app => (
              <div key={app.id} className="app-card accepted">
                <div className="app-card-header">
                  <Link to={`/jobs/${app.jobPostId}`} className="app-card-title">
                    {app.jobPost?.title ?? `Job #${app.jobPostId}`}
                  </Link>
                  {appBadge(app.jobApplicationStatus)}
                </div>
                <div className="app-card-meta">
                  <span>💰 {app.jobPost?.budget} RON</span>
                  <span>📍 {app.jobPost?.location}</span>
                  {statusBadge(app.jobPost?.status ?? '')}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Toate aplicațiile mele</h2>
      {applications.length === 0 ? (
        <div className="empty-state">
          <h3>Nicio aplicație trimisă</h3>
          <p>Explorează joburile disponibile și aplică la cele care te interesează.</p>
          <Link to="/explore" className="btn btn-primary" style={{ marginTop: '1rem' }}>Explorează</Link>
        </div>
      ) : (
        <div className="dash-apps-list">
          {applications.map(app => (
            <div key={app.id} className={`app-card ${app.jobApplicationStatus.toLowerCase()}`}>
              <div className="app-card-header">
                <Link to={`/jobs/${app.jobPostId}`} className="app-card-title">
                  {app.jobPost?.title ?? `Job #${app.jobPostId}`}
                </Link>
                {appBadge(app.jobApplicationStatus)}
              </div>
              <div className="app-card-meta">
                <span>💰 {app.jobPost?.budget} RON</span>
                <span>📍 {app.jobPost?.location}</span>
                <span>📅 {new Date(app.createdAt).toLocaleDateString('ro-RO')}</span>
              </div>
              <p className="app-message">Mesajul tău: "{app.message}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { isEmployer } = useAuth();
  return (
    <div className="page-wrap">
      {isEmployer ? <EmployerDashboard /> : <WorkerDashboard />}
    </div>
  );
};

export default Dashboard;
