import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

import LandingPage    from './components/LandingPage';
import Login          from './components/Login';
import Register       from './components/Register';
import Navbar         from './components/Navbar';
import Dashboard      from './components/Dashboard';
import ExploreJobs    from './components/ExploreJobs';
import JobDetails     from './components/JobDetails';
import PostJob        from './components/PostJob';
import MyJobs         from './components/MyJobs';
import MyApplications from './components/MyApplications';
import Profile        from './components/Profile';
import PublicProfile      from './components/PublicProfile';
import NotificationsPage from './components/NotificationsPage';
import AdminDashboard    from './components/AdminDashboard';
import AdminUsers        from './components/AdminUsers';
import AdminJobs         from './components/AdminJobs';
import AdminReports      from './components/AdminReports';
import NotFound           from './components/NotFound';

// Redirects to /login and saves the intended path so Login can restore it.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Redirects non-admins to /dashboard.
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Redirects already-authenticated users away from login/register pages.
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
      <Route path="/users/:id/profile" element={<Layout><PublicProfile /></Layout>} />

      {/* Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/explore" element={
        <ProtectedRoute><Layout><ExploreJobs /></Layout></ProtectedRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute><Layout><JobDetails /></Layout></ProtectedRoute>
      } />
      <Route path="/post-job" element={
        <ProtectedRoute><Layout><PostJob /></Layout></ProtectedRoute>
      } />
      <Route path="/my-jobs" element={
        <ProtectedRoute><Layout><MyJobs /></Layout></ProtectedRoute>
      } />
      <Route path="/my-applications" element={
        <ProtectedRoute><Layout><MyApplications /></Layout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute><Layout><AdminUsers /></Layout></AdminRoute>
      } />
      <Route path="/admin/jobs" element={
        <AdminRoute><Layout><AdminJobs /></Layout></AdminRoute>
      } />
      <Route path="/admin/reports" element={
        <AdminRoute><Layout><AdminReports /></Layout></AdminRoute>
      } />

      {/* Legacy redirects */}
      <Route path="/home"      element={<Navigate to="/dashboard" replace />} />
      <Route path="/look-jobs" element={<Navigate to="/explore"   replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
