import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import LookJobs from './components/LookJobs';
import PostJob from './components/PostJob';
import MyJobs from './components/MyJobs';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token: string | null = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/register" element={<Register />} />

                <Route path="/home" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />

                <Route path="/home" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />

                <Route path="/home" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />

                <Route path="/look-jobs" element={
                    <ProtectedRoute>
                        <LookJobs />
                    </ProtectedRoute>
                } />

                <Route path="/post-job" element={
                    <ProtectedRoute>
                        <PostJob />
                    </ProtectedRoute>
                } />

                <Route path="/my-jobs" element={
                    <ProtectedRoute>
                        <MyJobs />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;