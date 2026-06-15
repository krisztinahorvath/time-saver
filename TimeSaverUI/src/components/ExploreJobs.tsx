import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { extractApiError } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import type { JobPostListItem, JobCategory, PagedResult } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS } from '../types';
import './ExploreJobs.css';

const PAGE_SIZE = 12;

type SortBy = 'newest' | 'budgetAsc' | 'budgetDesc';

const SORT_LABELS: Record<SortBy, string> = {
  newest:     'Cele mai noi',
  budgetAsc:  'Buget crescător',
  budgetDesc: 'Buget descrescător',
};

function renderStars(rating: number) {
  const full  = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

const ExploreJobs: React.FC = () => {
  const { user }            = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state — initialised from URL params so category links from LandingPage work
  const [keyword,   setKeyword]   = useState(searchParams.get('keyword')  ?? '');
  const [category,  setCategory]  = useState<JobCategory | ''>(
    (searchParams.get('category') as JobCategory) || ''
  );
  const [location,  setLocation]  = useState(searchParams.get('location') ?? '');
  const [minBudget, setMinBudget] = useState(searchParams.get('minBudget') ?? '');
  const [maxBudget, setMaxBudget] = useState(searchParams.get('maxBudget') ?? '');
  const [sortBy,    setSortBy]    = useState<SortBy>((searchParams.get('sortBy') as SortBy) || 'newest');
  const [page,      setPage]      = useState(parseInt(searchParams.get('page') ?? '1', 10));

  const [result,        setResult]        = useState<PagedResult<JobPostListItem> | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [myAppIds,      setMyAppIds]      = useState<Set<number>>(new Set());
  const [applyMsg,      setApplyMsg]      = useState<Record<number, string>>({});
  const [applyLoading,  setApplyLoading]  = useState<Record<number, boolean>>({});
  const [notification,  setNotification]  = useState<{ jobId: number; msg: string; type: 'success' | 'error' } | null>(null);

  // Core fetch — accepts overrides to allow immediate re-fetch after state changes
  const fetchWith = useCallback(async (overrides: {
    keyword?: string; category?: JobCategory | ''; location?: string;
    minBudget?: string; maxBudget?: string; sortBy?: SortBy; page?: number;
  } = {}) => {
    const kw  = overrides.keyword   !== undefined ? overrides.keyword   : keyword;
    const cat = overrides.category  !== undefined ? overrides.category  : category;
    const loc = overrides.location  !== undefined ? overrides.location  : location;
    const min = overrides.minBudget !== undefined ? overrides.minBudget : minBudget;
    const max = overrides.maxBudget !== undefined ? overrides.maxBudget : maxBudget;
    const srt = overrides.sortBy    !== undefined ? overrides.sortBy    : sortBy;
    const pg  = overrides.page      !== undefined ? overrides.page      : page;

    setLoading(true);
    setFetchError(null);
    try {
      const params: Record<string, string | number> = { page: pg, pageSize: PAGE_SIZE };
      if (kw)              params.keyword   = kw;
      if (cat)             params.category  = cat;
      if (loc)             params.location  = loc;
      if (min)             params.minPrice  = min;
      if (max)             params.maxPrice  = max;
      if (srt !== 'newest') params.sortBy   = srt;

      // Sync URL for shareability
      const urlParams: Record<string, string> = {};
      if (kw)              urlParams.keyword   = kw;
      if (cat)             urlParams.category  = cat;
      if (loc)             urlParams.location  = loc;
      if (min)             urlParams.minBudget = min;
      if (max)             urlParams.maxBudget = max;
      if (srt !== 'newest') urlParams.sortBy   = srt;
      if (pg  > 1)         urlParams.page      = pg.toString();
      setSearchParams(urlParams, { replace: true });

      const [jobsRes, appsRes] = await Promise.all([
        api.get<PagedResult<JobPostListItem>>('/JobPosts', { params }),
        api.get<{ jobPostId: number }[]>('/JobApplications'),
      ]);
      setResult(jobsRes.data);
      setMyAppIds(new Set(appsRes.data.map(a => a.jobPostId)));
    } catch {
      setFetchError('Nu am putut încărca joburile. Verifică conexiunea și încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }, [keyword, category, location, minBudget, maxBudget, sortBy, page, setSearchParams]);

  // Initial load
  useEffect(() => { fetchWith(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryClick = (cat: JobCategory | '') => {
    setCategory(cat);
    setPage(1);
    fetchWith({ category: cat, page: 1 });
  };

  const handleSortChange = (srt: SortBy) => {
    setSortBy(srt);
    setPage(1);
    fetchWith({ sortBy: srt, page: 1 });
  };

  const handleFilter = () => {
    setPage(1);
    fetchWith({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchWith({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const resetFilters = () => {
    setKeyword('');
    setCategory('');
    setLocation('');
    setMinBudget('');
    setMaxBudget('');
    setSortBy('newest');
    setPage(1);
    fetchWith({ keyword: '', category: '', location: '', minBudget: '', maxBudget: '', sortBy: 'newest', page: 1 });
  };

  const jobs  = result?.items ?? [];
  const total = result?.totalCount ?? 0;
  const totalPages = result?.totalPages ?? 0;
  const hasFilters = !!(keyword || category || location || minBudget || maxBudget || sortBy !== 'newest');

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="explore-header">
        <div>
          <h1>Explorează joburi</h1>
          <p className="text-muted">Găsește taskuri disponibile în zona ta</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="explore-search-bar">
        <input
          type="text"
          className="explore-search-input"
          placeholder="Caută joburi: curățenie, reparații, meditații..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFilter()}
        />
        <button className="btn btn-primary explore-search-btn" onClick={handleFilter}>
          🔍 Caută
        </button>
      </div>

      {/* Category chips */}
      <div className="category-chips-wrap">
        <button
          className={`chip ${category === '' ? 'chip-active' : ''}`}
          onClick={() => handleCategoryClick('')}
        >
          Toate
        </button>
        {(Object.entries(CATEGORY_LABELS) as [JobCategory, string][]).map(([k, v]) => (
          <button
            key={k}
            className={`chip ${category === k ? 'chip-active' : ''}`}
            onClick={() => handleCategoryClick(k)}
          >
            {CATEGORY_ICONS[k]} {v}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="filters-bar card">
        <div className="filter-row">
          <div className="form-group">
            <label>Locație</label>
            <input
              type="text"
              placeholder="ex: Cluj-Napoca"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilter()}
            />
          </div>

          <div className="form-group">
            <label>Buget min (RON)</label>
            <input
              type="number" min="0" placeholder="0"
              value={minBudget}
              onChange={e => setMinBudget(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Buget max (RON)</label>
            <input
              type="number" min="0" placeholder="∞"
              value={maxBudget}
              onChange={e => setMaxBudget(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Sortare</label>
            <select value={sortBy} onChange={e => handleSortChange(e.target.value as SortBy)}>
              {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="filter-actions">
            <button className="btn btn-primary filter-btn" onClick={handleFilter}>
              Filtrează
            </button>
            {hasFilters && (
              <button className="btn btn-ghost filter-btn" onClick={resetFilters}>
                Resetează
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {fetchError ? (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {fetchError}
          <button className="btn btn-outline btn-sm" onClick={handleFilter} style={{ marginLeft: '1rem' }}>
            Reîncearcă
          </button>
        </div>
      ) : loading ? (
        <div className="loading-wrap">Se încarcă joburile...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <h3>Niciun job găsit</h3>
          <p>Încearcă să modifici filtrele sau revino mai târziu.</p>
          {hasFilters && (
            <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={resetFilters}>
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="explore-count">
            {total} job{total !== 1 ? 'uri' : ''} găsite
            {category ? ` în ${CATEGORY_LABELS[category]}` : ''}
          </p>

          <div className="jobs-grid">
            {jobs.map(job => {
              const alreadyApplied = myAppIds.has(job.id);
              const isOwn          = job.userId === user?.userId;
              const notif          = notification?.jobId === job.id ? notification : null;

              return (
                <div key={job.id} className="job-card card">
                  {/* Top row: category + status */}
                  <div className="jc-top">
                    <span className="jc-category">
                      {CATEGORY_ICONS[job.category]} {CATEGORY_LABELS[job.category] ?? job.category}
                    </span>
                    <span className={`badge badge-${job.status.toLowerCase()}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>

                  <Link to={`/jobs/${job.id}`} className="jc-title">{job.title}</Link>

                  <p className="jc-desc">
                    {job.description.slice(0, 120)}{job.description.length > 120 ? '...' : ''}
                  </p>

                  <div className="jc-meta">
                    <span>💰 <strong>{job.budget} RON</strong></span>
                    <span>📍 {job.location}</span>
                    {job.deadline && (
                      <span>⏰ {new Date(job.deadline).toLocaleDateString('ro-RO')}</span>
                    )}
                    {job.applicationCount > 0 && (
                      <span className="jc-app-count">
                        👥 {job.applicationCount} aplicant{job.applicationCount !== 1 ? 'ți' : ''}
                      </span>
                    )}
                  </div>

                  {/* Employer info + rating */}
                  {job.userName && (
                    <div className="jc-poster">
                      <Link to={`/users/${job.userId}/profile`} className="jc-poster-name">
                        {job.userName.charAt(0).toUpperCase()}
                      </Link>
                      <div className="jc-poster-info">
                        <Link to={`/users/${job.userId}/profile`}>{job.userName}</Link>
                        {job.employerAverageRating > 0 ? (
                          <span className="jc-rating">
                            <span className="stars">{renderStars(job.employerAverageRating)}</span>
                            <span>{job.employerAverageRating.toFixed(1)}</span>
                            <span className="jc-rating-count">({job.employerReviewCount})</span>
                          </span>
                        ) : (
                          <span className="jc-rating jc-rating-none">Fără recenzii</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notification for this card */}
                  {notif && (
                    <div className={`alert alert-${notif.type}`} style={{ marginTop: '0.5rem' }}>
                      {notif.msg}
                    </div>
                  )}

                  {/* Apply section */}
                  {!isOwn && job.status === 'Open' && (
                    <div className="jc-apply">
                      {alreadyApplied ? (
                        <div className="applied-notice">✓ Ai aplicat deja</div>
                      ) : (
                        <>
                          <textarea
                            placeholder="Mesajul tău (min. 10 caractere)..."
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

                  {isOwn && <div className="jc-own-badge">Jobul tău</div>}

                  <Link to={`/jobs/${job.id}`} className="jc-details-link">
                    Vezi detalii →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ← Anterioară
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...'
                      ? <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                      : <button
                          key={p}
                          className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => handlePageChange(p as number)}
                        >
                          {p}
                        </button>
                  )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Următoare →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExploreJobs;
