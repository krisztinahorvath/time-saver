import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const username: string = localStorage.getItem('username') || 'User';

  const handleLogout = (): void => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('username');
    navigate('/login'); 
  };

  // Helper function to add an "active" class to the current page link
  const isActive = (path: string): string => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/home">TimeSaver<span>App</span></Link>
      </div>
      
      <ul className="navbar-links">
        <li>
          <Link to="/home" className={isActive('/home')}>Dashboard</Link>
        </li>
        <li>
          <Link to="/look-jobs" className={isActive('/look-jobs')}>Explore Jobs</Link>
        </li> 
        <li>
          <Link to="/post-job" className={isActive('/post-job')}>Post a Job</Link>
        </li>
      </ul>

      <div className="navbar-user">
        <span className="welcome-text">Welcome, <strong>{username}</strong></span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;