import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import type { JobPost, JobCategory } from '../types';
import { CATEGORY_LABELS, STATUS_LABELS } from '../types';
import './ExploreJobs.css';

const ExploreJobs: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myAppIds, setMyAppIds] = useState<Set<number>>(new Set());
  const [applyMsg, setApplyMsg] = useState<Record<number, string>>({});
  const [applyLoading, setApplyLoading] = useState<Record<number, boolean>>({});
  const [notification, setNotification] = useState<{ jobId: number; msg: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<JobCategory | ''>('');
  const [location, setLocation] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'budget-asc' | 'budget-desc'>('newest');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params: Record<string, string> = {};
      if (category)  params.category  = category;
      if (location)  params.location  = location;
      if (minBudget) params.minPrice  = minBudget;
      if (maxBudget) params.maxPrice  = maxBudget;

      const [jobsRes, appsRes] = await Promise.all([
        api.get<JobPost[]>('/JobPosts', { params }),
        api.get<{ jobPostId: number }[]>('/JobApplications'),
      ]);
      setJobs(jobsRes.data);
      setMyAppIds(new Set(appsRes.data.map(a => a.jobPostId)));
    } catch {
      setFetchError('Nu am putut încărca joburile. Verifică conexiunea și încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }, [category, location, minBudget, maxBudget]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = jobs
    .filter(j =>
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'budget-asc')  return a.budget - b.budget;
      if (sortBy === 'budget-desc') return b.budget - a.budget;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleApply = async (jobId: number) => {
    const msg = applyMsg[jobId]?.trim();
    if (!msg || msg.length < 10) {
      setNotification({ jobId, msg: 'Mesajul trebuie să aibă cel puțin 10 caractere.', type: 'error' });
      return;
    }
    setApplyLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      await api.post('/JobApplications', { jobPostId: jobId, message: msg });
      setMyAppIds(prev => new Set([...prev, jobId]));
      setApplyMsg(prev => ({ ...prev, [jobId]: '' }));
      setNotification({ jobId, msg: 'Aplicație trimisă cu succes!', type: 'success' });
    } catch (e) {
      setNotification({ jobId, msg: extractApiError(e, 'Eroare la aplicare.'), type: 'error' });
    } finally {
      setApplyLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  return (
    <div className="page-wrap">
      <div className="explore-header">
        <div>
          <h1>Explorează joburi</h1>
          <p className="text-muted">Găsește taskuri disponibile în zona ta</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="filter-row">
          <div className="form-group filter-search">
            <label>Caută</label>
            <input
              type="text"
              placeholder="Titlu sau descriere..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Categorie</label>
            <select value={category} onChange={e => setCategory(e.target.value as JobCategory | '')}>
              <option value="">Toate categoriile</option>
              {(Object.entries(CATEGORY_LABELS) as [JobCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Locație</label>
            <input
              type="text"
              placeholder="ex: Cluj-Napoca"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Buget min (RON)</label>
            <input type="number" min="0" placeholder="0" value={minBudget} onChange={e => setMinBudget(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Buget max (RON)</label>
            <input type="number" min="0" placeholder="∞" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Sortare</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="newest">Cele mai noi</option>
              <option value="budget-asc">Buget crescător</option>
              <option value="budget-desc">Buget descrescător</option>
            </select>
          </div>

          <button className="btn btn-primary filter-btn" onClick={fetchData}>
            Filtrează
          </button>
        </div>
      </div>

      {fetchError ? (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {fetchError}
          <button
            className="btn btn-outline btn-sm"
            onClick={fetchData}
            style={{ marginLeft: '1rem' }}
          >
            Reîncearcă
          </button>
        </div>
      ) : loading ? (
        <div className="loading-wrap">Se încarcă joburile...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job găsit</h3>
          <p>Încearcă să modifici filtrele sau revino mai târziu.</p>
          {(search || category || location || minBudget || maxBudget) && (
            <button
              className="btn btn-outline"
              style={{ marginTop: '1rem' }}
              onClick={() => { setSearch(''); setCategory(''); setLocation(''); setMinBudget(''); setMaxBudget(''); }}
            >
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            {filtered.length} job{filtered.length !== 1 ? 'uri' : ''} găsite
          </p>
          <div className="jobs-grid">
            {filtered.map(job => {
              const alreadyApplied = myAppIds.has(job.id);
              const isOwn = job.userId === user?.userId;
              const notif = notification?.jobId === job.id ? notification : null;

              return (
                <div key={job.id} className="job-card card">
                  <div className="jc-top">
                    <div className="jc-category">{CATEGORY_LABELS[job.category] ?? job.category}</div>
                    <span className={`badge badge-${job.status.toLowerCase()}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>

                  <Link to={`/jobs/${job.id}`} className="jc-title">{job.title}</Link>

                  <p className="jc-desc">{job.description.slice(0, 120)}{job.description.length > 120 ? '...' : ''}</p>

                  <div className="jc-meta">
                    <span>💰 <strong>{job.budget} RON</strong></span>
                    <span>📍 {job.location}</span>
                    <span>📅 {new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                    {job.deadline && <span>⏰ Termen: {new Date(job.deadline).toLocaleDateString('ro-RO')}</span>}
                  </div>

                  {job.user && (
                    <div className="jc-poster">
                      Postat de{' '}
                      <Link to={`/users/${job.userId}/profile`}>{job.user.name}</Link>
                    </div>
                  )}

                  {notif && (
                    <div className={`alert alert-${notif.type}`} style={{ marginTop: '0.75rem' }}>
                      {notif.msg}
                    </div>
                  )}

                  {!isOwn && job.status === 'Open' && (
                    <div className="jc-apply">
                      {alreadyApplied ? (
                        <div className="applied-notice">✓ Ai aplicat deja</div>
                      ) : (
                        <>
                          <textarea
                            placeholder="Mesajul tău de aplicare (min. 10 caractere)..."
                            rows={2}
                            value={applyMsg[job.id] ?? ''}
                            onChange={e => setApplyMsg(prev => ({ ...prev, [job.id]: e.target.value }))}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={applyLoading[job.id]}
                            onClick={() => handleApply(job.id)}
                          >
                            {applyLoading[job.id] ? 'Se trimite...' : 'Aplică'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {isOwn && (
                    <div className="jc-own-badge">Jobul tău</div>
                  )}

                  <Link to={`/jobs/${job.id}`} className="jc-details-link">
                    Vezi detalii →
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ExploreJobs;
