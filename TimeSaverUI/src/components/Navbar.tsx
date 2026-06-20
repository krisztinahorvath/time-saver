import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlus } from '../context/PlusContext';
import NotificationBell from './NotificationBell';
import PlusBadge from './PlusBadge';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isEmployer, isWorker, isAdmin } = useAuth();
  const { isVerified: isPlusVerified } = usePlus();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchVal,   setSearchVal]   = useState('');
  const searchRef  = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const active = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'nav-link active' : 'nav-link';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/explore?keyword=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
      setSearchOpen(false);
    }
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const initials = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-logo">
          <span className="logo-time">Time</span><span className="logo-saver">Saver</span>
        </Link>

        {isAuthenticated ? (
          <>
            {/* Hamburger */}
            <button
              className="navbar-toggle"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Meniu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>

            {/* Nav links */}
            <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
              <li><Link to="/dashboard"         className={active('/dashboard')}>Dashboard</Link></li>
              <li><Link to="/explore"           className={active('/explore')}>Explorează</Link></li>
              {isEmployer && (
                <li><Link to="/post-job"        className={active('/post-job')}>Postează Job</Link></li>
              )}
              {isEmployer && (
                <li><Link to="/my-jobs"         className={active('/my-jobs')}>Joburile mele</Link></li>
              )}
              {isWorker && (
                <li><Link to="/my-applications" className={active('/my-applications')}>Aplicațiile mele</Link></li>
              )}
              {isAdmin && (
                <li><Link to="/admin"           className={active('/admin')}>⚙ Admin</Link></li>
              )}
            </ul>

            {/* Right icons */}
            <div className="navbar-actions">

              {/* Search */}
              <div className={`navbar-search-wrap ${searchOpen ? 'open' : ''}`}>
                {searchOpen ? (
                  <form onSubmit={handleSearch} className="navbar-search-form">
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchVal}
                      onChange={e => setSearchVal(e.target.value)}
                      placeholder="Caută joburi..."
                      className="navbar-search-input"
                    />
                    <button type="submit" className="navbar-icon-btn" aria-label="Caută">🔍</button>
                    <button
                      type="button"
                      className="navbar-icon-btn"
                      onClick={() => setSearchOpen(false)}
                      aria-label="Închide"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    className="navbar-icon-btn"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Caută joburi"
                    title="Caută joburi"
                  >
                    🔍
                  </button>
                )}
              </div>

              {/* Plus button */}
              <Link
                to="/plus"
                className={`navbar-icon-btn navbar-plus-btn${isPlusVerified ? ' navbar-plus-active' : ''}`}
                title={isPlusVerified ? 'TimeSaver Plus activ' : 'TimeSaver Plus'}
                aria-label="TimeSaver Plus"
              >
                ⭐
              </Link>

              {/* Notification bell */}
              <NotificationBell />

              {/* Profile dropdown */}
              <div className="navbar-profile-wrap" ref={profileRef}>
                <button
                  className="navbar-avatar-btn"
                  onClick={() => setProfileOpen(o => !o)}
                  aria-label="Meniu profil"
                  title={user?.name}
                >
                  {initials}
                </button>

                {profileOpen && (
                  <div className="navbar-dropdown" onClick={() => setProfileOpen(false)}>
                    <div className="navbar-dropdown-header">
                      <div className="navbar-dropdown-name" style={{ display: 'flex', alignItems: 'center' }}>
                        {user?.name}
                        {isPlusVerified && <PlusBadge size="sm" />}
                      </div>
                      <div className="navbar-dropdown-role">
                        {user?.userType === 'Worker'
                          ? 'Prestator'
                          : user?.userType === 'Admin'
                            ? 'Admin'
                            : 'Angajator'}
                      </div>
                    </div>
                    <div className="navbar-dropdown-divider" />
                    <Link to="/profile"       className="navbar-dropdown-item">👤 Profilul meu</Link>
                    <Link to="/notifications" className="navbar-dropdown-item">🔔 Notificări</Link>
                    <Link to="/billing"       className="navbar-dropdown-item">💳 Plăți și facturare</Link>
                    {isAdmin && (
                      <Link to="/admin"       className="navbar-dropdown-item">⚙ Panou admin</Link>
                    )}
                    <div className="navbar-dropdown-divider" />
                    <button
                      className="navbar-dropdown-item navbar-dropdown-logout"
                      onClick={handleLogout}
                    >
                      ↩ Deconectare
                    </button>
                  </div>
                )}
              </div>
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
