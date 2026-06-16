import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { JobCategory, CreateJobPostPayload } from '../types';
import { CATEGORY_LABELS } from '../types';
import { usePlus } from '../context/PlusContext';
import './PostJob.css';

interface FormState {
  title: string;
  description: string;
  budget: string;
  category: JobCategory;
  location: string;
  deadline: string;
  specialRequirements: string;
  isPlusOnly: boolean;
}

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const { isVerified: isPlusVerified } = usePlus();
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    budget: '',
    category: 'Other',
    location: '',
    deadline: '',
    specialRequirements: '',
    isPlusOnly: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      const next = { ...fieldErrors };
      delete next[e.target.name];
      setFieldErrors(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setStatus(null);
    setLoading(true);

    const payload: CreateJobPostPayload = {
      title: form.title,
      description: form.description,
      budget: parseFloat(form.budget),
      category: form.category,
      location: form.location,
      isPlusOnly: form.isPlusOnly,
    };
    if (form.deadline)            payload.deadline = new Date(form.deadline).toISOString();
    if (form.specialRequirements) payload.specialRequirements = form.specialRequirements;

    try {
      await api.post('/JobPosts', payload);
      setStatus({ type: 'success', msg: 'Job postat cu succes! Te redirecționăm...' });
      setTimeout(() => navigate('/my-jobs'), 1500);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } | string };
      };
      if (err.response?.status === 400) {
        const data = err.response.data;
        if (data && typeof data === 'object' && 'errors' in data && data.errors) {
          setFieldErrors(data.errors);
          setStatus({ type: 'error', msg: 'Corectează erorile de mai jos.' });
        } else {
          const msg = typeof data === 'string' ? data : (data as { message?: string })?.message ?? 'Date invalide.';
          setStatus({ type: 'error', msg });
        }
      } else {
        setStatus({ type: 'error', msg: 'Eroare server. Încearcă din nou.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name: string) => fieldErrors[name]?.[0];

  return (
    <div className="page-wrap">
      <div className="postjob-wrap">
        <h1 className="postjob-title">Postează un task</h1>
        <p className="text-muted" style={{ marginBottom: '1.75rem' }}>
          Descrie ce ai nevoie și primești oferte de la prestatori locali
        </p>

        {status && (
          <div className={`alert alert-${status.type === 'success' ? 'success' : 'error'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card postjob-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="title">Titlul taskului *</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="ex: Reparație robinet bucătărie"
                value={form.title}
                onChange={handleChange}
                className={field('Title') ? 'input-error' : ''}
                required
              />
              {field('Title') && <span className="error-text">{field('Title')}</span>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="budget">Buget (RON) *</label>
              <input
                id="budget"
                name="budget"
                type="number"
                min="1"
                step="0.01"
                placeholder="ex: 150"
                value={form.budget}
                onChange={handleChange}
                className={field('Budget') ? 'input-error' : ''}
                required
              />
              {field('Budget') && <span className="error-text">{field('Budget')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="category">Categorie *</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                {(Object.entries(CATEGORY_LABELS) as [JobCategory, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="location">Locație *</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="ex: Cluj-Napoca"
                value={form.location}
                onChange={handleChange}
                className={field('Location') ? 'input-error' : ''}
                required
              />
              {field('Location') && <span className="error-text">{field('Location')}</span>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="deadline">Termen limită (opțional)</label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descriere detaliată *</label>
            <textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Descrie taskul în detaliu: ce trebuie făcut, când, condiții speciale..."
              value={form.description}
              onChange={handleChange}
              className={field('Description') ? 'input-error' : ''}
              required
            />
            {field('Description') && <span className="error-text">{field('Description')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="specialRequirements">Cerințe speciale (opțional)</label>
            <textarea
              id="specialRequirements"
              name="specialRequirements"
              rows={2}
              placeholder="ex: Experiență minimă 3 ani, certificare..."
              value={form.specialRequirements}
              onChange={handleChange}
            />
          </div>

          {/* Plus Matching — only shown to active Plus employers */}
          {isPlusVerified && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isPlusOnly}
                  onChange={e => setForm(f => ({ ...f, isPlusOnly: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <span>⭐ Job Plus Matching (vizibil exclusiv pentru prestatori Plus)</span>
              </label>
              {form.isPlusOnly && (
                <p className="text-muted" style={{ fontSize: '0.83rem', marginTop: '0.25rem' }}>
                  Jobul va fi ascuns utilizatorilor fără abonament Plus.
                  Aplicanții Plus apar primii în lista ta.
                </p>
              )}
            </div>
          )}

          <div className="postjob-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Anulează
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Se postează...' : '📢 Publică taskul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJob;
