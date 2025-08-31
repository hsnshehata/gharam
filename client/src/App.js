import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import InstantServices from './pages/InstantServices';
import ExpensesAdvances from './pages/ExpensesAdvances';
import PackagesServices from './pages/PackagesServices';
import DailyReports from './pages/DailyReports';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} />}
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route
            path="/users"
            element={user && user.role === 'admin' ? <Users /> : <Navigate to="/login" />}
          />
          <Route
            path="/bookings"
            element={user && (user.role === 'admin' || user.role === 'supervisor') ? <Bookings /> : <Navigate to="/login" />}
          />
          <Route
            path="/instant-services"
            element={user && (user.role === 'admin' || user.role === 'supervisor') ? <InstantServices /> : <Navigate to="/login" />}
          />
          <Route
            path="/expenses-advances"
            element={user && (user.role === 'admin' || user.role === 'supervisor') ? <ExpensesAdvances /> : <Navigate to="/login" />}
          />
          <Route
            path="/packages-services"
            element={user && user.role === 'admin' ? <PackagesServices /> : <Navigate to="/login" />}
          />
          <Route
            path="/daily-reports"
            element={user && user.role === 'admin' ? <DailyReports /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard"
            element={user && (user.role === 'admin' || user.role === 'supervisor') ? <Dashboard user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/employee-dashboard"
            element={user && user.role === 'employee' ? <EmployeeDashboard user={user} /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;