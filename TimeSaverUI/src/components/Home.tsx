import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import './Home.css';

// Define the shape of our component state
interface DashboardStats {
  totalUsers: number;
  activeTasks: number;
}

const Home: React.FC = () => {
  // Apply the interface to the useState hook
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, activeTasks: 0 });

  useEffect(() => {
    // This mimics fetching your API data safely with TypeScript
    setStats({ totalUsers: 12, activeTasks: 5 });
  }, []);

  return (
    <div className="home-container">
      <Navbar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Welcome to your Dashboard</h1>
          <p>Here is a quick overview of your TimeSaver account tracking.</p>
        </header>

        <section className="dashboard-grid">
          <div className="stat-card">
            <h3>Total Database Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>

          <div className="stat-card">
            <h3>System Status</h3>
            <p className="stat-status online">Connected to SQL</p>
          </div>

          <div className="stat-card action-card">
            <h3>Quick Actions</h3>
            <button className="action-btn" onClick={() => window.location.href='/users'}>
              View User Directory
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;