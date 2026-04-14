import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import Login from './pages/Login';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import InstantServices from './pages/InstantServices';
import ExpensesAdvances from './pages/ExpensesAdvances';
import PackagesServices from './pages/PackagesServices';
import DailyReports from './pages/DailyReports';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeReports from './pages/EmployeeReports';
import HallSupervision from './pages/HallSupervision';
import Landing from './pages/Landing';
import PriceList from './pages/PriceList';
import MassageChair from './pages/MassageChair';
import Gallery from './pages/Gallery';
import GalleryAdmin from './pages/GalleryAdmin';
import AISettings from './pages/AISettings';
import PointsAdmin from './pages/PointsAdmin';
import NotFound from './pages/NotFound';
import AfrakoushToolViewer from './pages/AfrakoushToolViewer';
import AfrakoushToolsRegistry from './pages/AfrakoushToolsRegistry';
import GlobalAdminWidget from './components/GlobalAdminWidget';
import Navbar from './components/Navbar';
import AdminAIChat from './components/AdminAIChat';
import { ToastProvider } from './components/ToastProvider';
import './App.css';
import { API_BASE } from './utils/apiBase';

const getHomePath = (u) => {
  if (!u) return '/landing';
  if (u.role === 'employee') return '/employee-dashboard';
  if (u.role === 'hallSupervisor') return '/hall-supervision';
  return '/dashboard';
};

const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Disable ArrowUp and ArrowDown for number inputs globally to prevent accidental changes during scroll
    const handleNumberInputScroll = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
        }
      }
    };
    const handleWheel = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };

    window.addEventListener('keydown', handleNumberInputScroll);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleNumberInputScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  React.useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'x-auth-token': token }
        });
        if (!res.ok) {
          // token invalid or expired
          localStorage.removeItem('token');
          setAuthLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('token');
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    if (authLoading) return;
    // لو المستخدم لسه متسجل دخول ومتوقف على صفحة اللوجين، حوّله تلقائي لمساره
    if (user && location.pathname === '/login') {
      navigate(getHomePath(user), { replace: true });
    }
    // لو التطبيق متسطب كـ PWA/تطبيق على الموبايل افتح /login مباشرة بدل اللاندنج
    if (!user && isStandaloneApp()) {
      const isLanding = location.pathname === '/' || location.pathname === '/landing';
      if (isLanding) navigate('/login', { replace: true });
    }
  }, [authLoading, user, location.pathname, navigate]);

  const isPublicPage = ['/landing', '/prices', '/massage-chair', '/gallery'].some(p => location.pathname.toLowerCase().replace(/\/+$/, '').endsWith(p)) || location.pathname.toLowerCase().startsWith('/p/afrakoush/');

  return (
    <ToastProvider>
      <div className="App">
        {authLoading ? (
          // while checking auth, render centered spinner to indicate loading
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">جارٍ التحقق...</span>
            </Spinner>
          </div>
        ) : (
          <>
            {user && !isPublicPage && <Navbar user={user} setUser={setUser} />}
            {user && !isPublicPage && <GlobalAdminWidget />}
            <Routes>
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/prices" element={<PriceList />} />
              <Route path="/massage-chair" element={<MassageChair />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route
                path="/gallery-admin"
                element={user && user.role === 'admin' ? <GalleryAdmin /> : <Navigate to="/login" />}
              />
              <Route
                path="/ai-settings"
                element={user && user.role === 'admin' ? <AISettings /> : <Navigate to="/login" />}
              />
              <Route
                path="/users"
                element={user && user.role === 'admin' ? <Users /> : <Navigate to="/login" />}
              />
              <Route
                path="/bookings"
                element={user && (user.role === 'admin' || user.role === 'supervisor') ? <Bookings user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/instant-services"
                element={user && (user.role === 'admin' || user.role === 'supervisor') ? <InstantServices user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/expenses-advances"
                element={user && (user.role === 'admin' || user.role === 'supervisor') ? <ExpensesAdvances user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/packages-services"
                element={user && user.role === 'admin' ? <PackagesServices /> : <Navigate to="/login" />}
              />
              <Route
                path="/points-admin"
                element={user && user.role === 'admin' ? <PointsAdmin /> : <Navigate to="/login" />}
              />
              <Route
                path="/reports"
                element={user && user.role === 'admin' ? <DailyReports /> : <Navigate to="/login" />}
              />
              <Route
                path="/daily-reports"
                element={<Navigate to="/reports" replace />}
              />
              <Route
                path="/employee-reports"
                element={user && (user.role === 'admin' || user.role === 'supervisor') ? <EmployeeReports /> : <Navigate to="/login" />}
              />
              <Route
                path="/dashboard"
                element={user && (user.role === 'admin' || user.role === 'supervisor') ? <Dashboard user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/hall-supervision"
                element={user && (user.role === 'admin' || user.role === 'supervisor' || user.role === 'hallSupervisor') ? <HallSupervision /> : <Navigate to="/login" />}
              />
              <Route
                path="/employee-dashboard"
                element={user ? <EmployeeDashboard user={user} /> : <Navigate to="/login" />}
              />
              {/* Afrakoush Dynamic Routes */}
              <Route path="/p/afrakoush/:name" element={<AfrakoushToolViewer isPublic={true} />} />
              <Route
                path="/admin/afrakoush/:name"
                element={user ? <AfrakoushToolViewer isPublic={false} /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/afrakoush-registry"
                element={user && user.role === 'admin' ? <AfrakoushToolsRegistry /> : <Navigate to="/login" />}
              />
              <Route path="/" element={<Navigate to={getHomePath(user)} replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            {!isPublicPage && <AdminAIChat user={user} />}
          </>
        )}
      </div>
    </ToastProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
