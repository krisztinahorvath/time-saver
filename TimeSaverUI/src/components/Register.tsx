import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import type { UserType } from '../types';
import './Auth.css';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  bio: string;
  userType: UserType;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    bio: '',
    userType: 'Worker',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    try {
      await api.post('/Users/Register', formData);
      setStatus({ type: 'success', msg: 'Cont creat cu succes! Te redirecționăm...' });
      setTimeout(() => navigate('/login'), 1200);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } };
      if (err.response?.status === 400 && err.response.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setStatus({ type: 'error', msg: 'Corectează erorile de mai jos.' });
      } else {
        setStatus({ type: 'error', msg: err.response?.data?.message || 'Eroare server. Încearcă din nou.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name: string) => fieldErrors[name]?.[0];

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <Link to="/"><span className="logo-time">Time</span><span className="logo-saver">Saver</span></Link>
        </div>
        <h2>Creează cont</h2>
        <p className="auth-subtitle">Alătură-te platformei noastre de servicii locale</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Nume complet</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ion Popescu"
              value={formData.name}
              onChange={handleChange}
              className={field('Name') ? 'input-error' : ''}
              required
            />
            {field('Name') && <span className="error-text">{field('Name')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              placeholder="email@exemplu.com"
              value={formData.email}
              onChange={handleChange}
              className={field('Email') ? 'input-error' : ''}
              required
            />
            {field('Email') && <span className="error-text">{field('Email')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Parolă</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              placeholder="Min. 8 caractere, o majusculă, o cifră"
              value={formData.password}
              onChange={handleChange}
              className={field('Password') ? 'input-error' : ''}
              required
            />
            {field('Password') && <span className="error-text">{field('Password')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="userType">Tip cont</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
            >
              <option value="Worker">Prestator (Worker) — ofer servicii</option>
              <option value="Employer">Angajator (Employer) — postez taskuri</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bio">
              Descriere{' '}
              {formData.userType === 'Worker' && <span className="required">*</span>}
            </label>
            <textarea
              id="bio"
              name="bio"
              placeholder={
                formData.userType === 'Worker'
                  ? 'Descrie serviciile pe care le oferi, experiența ta...'
                  : 'Opțional — prezintă-te pe scurt'
              }
              value={formData.bio}
              onChange={handleChange}
              className={field('Bio') ? 'input-error' : ''}
              rows={3}
            />
            {field('Bio') && <span className="error-text">{field('Bio')}</span>}
          </div>

          {status && (
            <div className={`alert alert-${status.type === 'success' ? 'success' : 'error'}`}>
              {status.msg}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Se creează contul...' : 'Creează cont'}
          </button>
        </form>

        <p className="auth-footer">
          Ai deja cont? <Link to="/login">Conectează-te</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
