// Legacy redirect component — App.tsx redirects /home → /dashboard
import { Navigate } from 'react-router-dom';
const Home = () => <Navigate to="/dashboard" replace />;
export default Home;
