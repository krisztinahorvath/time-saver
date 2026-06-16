import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isEmployer, isWorker, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const active = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/') ? 'nav-link active' : 'nav-link';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-logo">
          ⏱ <span>TimeSaver</span>
        </Link>

        {isAuthenticated ? (
          <>
            <button
              className="navbar-toggle"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              ☰
            </button>

            <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
              <li><Link to="/dashboard"       className={active('/dashboard')}>Dashboard</Link></li>
              <li><Link to="/explore"         className={active('/explore')}>Explorează</Link></li>
              {isEmployer && (
                <li><Link to="/post-job"      className={active('/post-job')}>Postează Job</Link></li>
              )}
              {isEmployer && (
                <li><Link to="/my-jobs"       className={active('/my-jobs')}>Joburile mele</Link></li>
              )}
              {isWorker && (
                <li><Link to="/my-applications" className={active('/my-applications')}>Aplicațiile mele</Link></li>
              )}
              {isAdmin && (
                <li><Link to="/admin"           className={active('/admin')}>Admin</Link></li>
              )}
              <li><Link to="/profile"         className={active('/profile')}>Profil</Link></li>
            </ul>

            <div className="navbar-user">
              <NotificationBell />
              <span className="navbar-name">{user?.name}</span>
              <span className="navbar-role">{user?.userType === 'Worker' ? 'Prestator' : 'Angajator'}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Deconectare
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login"    className="btn btn-ghost btn-sm">Conectare</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Înregistrare</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
