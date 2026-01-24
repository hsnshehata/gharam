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
import PointsAdmin from './pages/PointsAdmin';
import Navbar from './components/Navbar';
import { ToastProvider } from './components/ToastProvider';
import { RxdbProvider } from './db/RxdbProvider';
import SyncStatusFloating from './components/SyncStatusFloating';
import './App.css';

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

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
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const loadUser = async () => {
      const existingToken = localStorage.getItem('token');
      if (!existingToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'x-auth-token': existingToken }
        });
        if (!res.ok) {
          // token invalid or expired
          localStorage.removeItem('token');
          setToken(null);
          setAuthLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setToken(existingToken);
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('token');
        setToken(null);
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

  return (
    <RxdbProvider token={token}>
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
            {user && <Navbar user={user} setUser={setUser} setToken={setToken} />}
            <Routes>
          <Route path="/login" element={<Login setUser={setUser} setToken={setToken} />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/prices" element={<PriceList />} />
          <Route path="/massage-chair" element={<MassageChair />} />
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
          <Route path="/" element={<Navigate to={getHomePath(user)} replace />} />
            </Routes>
            {user && <SyncStatusFloating />}
          </>
        )}
      </div>
      </ToastProvider>
    </RxdbProvider>
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