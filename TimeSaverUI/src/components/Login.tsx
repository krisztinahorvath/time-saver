import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import type { LoginResponse } from '../types';
import './Auth.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>('/Users/Login', credentials);
      const { accessToken, token, refreshToken, userId, name, userType } = response.data;
      login(accessToken ?? token, { userId, name, userType }, refreshToken);
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirect);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Email sau parolă incorecte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Link to="/"><span className="logo-time">Time</span><span className="logo-saver">Saver</span></Link>
        </div>
        <h2>Bun venit înapoi</h2>
        <p className="auth-subtitle">Intră în contul tău</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="email@exemplu.com"
              value={credentials.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Parolă</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={credentials.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Se conectează...' : 'Conectare'}
          </button>
        </form>

        <div className="auth-social">
          <div className="auth-divider"><span>sau</span></div>
          <button type="button" disabled className="btn btn-outline btn-full auth-social-btn">
            <span className="auth-social-icon">G</span>
            Continuă cu Google
            <span className="auth-soon-badge">În curând</span>
          </button>
          <button type="button" disabled className="btn btn-outline btn-full auth-social-btn">
            <span className="auth-social-icon">M</span>
            Continuă cu Microsoft
            <span className="auth-soon-badge">În curând</span>
          </button>
        </div>

        <p className="auth-footer">
          Nu ai cont? <Link to="/register">Înregistrează-te</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
