import React, { useEffect, useState } from 'react';
import { Navbar as BootstrapNavbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Navbar({ user, setUser }) {
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const isDark = saved === 'dark';
      setDark(isDark);
      if (isDark) document.body.classList.add('theme-dark');
      else document.body.classList.remove('theme-dark');
    } catch (e) {
      // ignore when localStorage is not available
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.body.classList.add('theme-dark');
      try { localStorage.setItem('theme', 'dark'); } catch (e) {}
    } else {
      document.body.classList.remove('theme-dark');
      try { localStorage.setItem('theme', 'light'); } catch (e) {}
    }
  };

  const closeMenu = () => setExpanded(false);

  return (
    <BootstrapNavbar
      bg="transparent"
      variant={dark ? 'dark' : 'light'}
      expand="lg"
      className="app-navbar mb-4"
      data-bs-theme={dark ? 'dark' : 'light'}
      expanded={expanded}
      onToggle={(isOpen) => setExpanded(isOpen)}
    >
      <BootstrapNavbar.Brand>
        <img src="/logo.png" alt="Logo" className="logo" /> مرحباً بعودتك, {user.username}
      </BootstrapNavbar.Brand>
      <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" onClick={() => setExpanded(!expanded)} />
      <BootstrapNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          {user.role === 'admin' && (
            <>
              <Nav.Link as={Link} to="/dashboard" onClick={closeMenu}>شغل إنهاردة</Nav.Link>
              <Nav.Link as={Link} to="/hall-supervision" onClick={closeMenu}>اشراف الصالة</Nav.Link>
              <Nav.Link as={Link} to="/bookings" onClick={closeMenu}>الحجوزات</Nav.Link>
              <Nav.Link as={Link} to="/instant-services" onClick={closeMenu}>الخدمات الفورية</Nav.Link>
              <Nav.Link as={Link} to="/expenses-advances" onClick={closeMenu}>المصروفات والسلف</Nav.Link>
              <Nav.Link as={Link} to="/employee-reports" onClick={closeMenu}>تقارير الموظفين</Nav.Link>
              <Nav.Link as={Link} to="/packages-services" onClick={closeMenu}>إضافة باكدجات/خدمات</Nav.Link>
              <Nav.Link as={Link} to="/points-admin" onClick={closeMenu}>نقاط الموظفين</Nav.Link>
              <Nav.Link as={Link} to="/users" onClick={closeMenu}>الموظفين</Nav.Link>
              <Nav.Link as={Link} to="/daily-reports" onClick={closeMenu}>التقارير اليومية</Nav.Link>
            </>
          )}
          {(user.role === 'supervisor') && (
            <>
              <Nav.Link as={Link} to="/dashboard" onClick={closeMenu}>شغل إنهاردة</Nav.Link>
              <Nav.Link as={Link} to="/hall-supervision" onClick={closeMenu}>اشراف الصالة</Nav.Link>
              <Nav.Link as={Link} to="/bookings" onClick={closeMenu}>الحجوزات</Nav.Link>
              <Nav.Link as={Link} to="/instant-services" onClick={closeMenu}>الخدمات الفورية</Nav.Link>
              <Nav.Link as={Link} to="/expenses-advances" onClick={closeMenu}>المصروفات والسلف</Nav.Link>
              <Nav.Link as={Link} to="/employee-reports" onClick={closeMenu}>تقارير الموظفين</Nav.Link>
            </>
          )}
          {user.role === 'hallSupervisor' && (
            <>
              <Nav.Link as={Link} to="/hall-supervision" onClick={closeMenu}>اشراف الصالة</Nav.Link>
            </>
          )}
          {user.role === 'employee' && (
            <>
              <Nav.Link as={Link} to="/employee-dashboard" onClick={closeMenu}>لوحة الموظف</Nav.Link>
            </>
          )}
        </Nav>

        <Nav className="ms-auto align-items-center">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="تبديل الثيم"
            title={dark ? 'تفعيل الثيم الفاتح' : 'تفعيل الثيم الداكن'}
          >
            {dark ? '☀️ فاتح' : '🌙 داكن'}
          </button>

          <Nav.Link onClick={() => { closeMenu(); localStorage.removeItem('token'); if (setUser) setUser(null); window.location.href = '/login'; }}>
            تسجيل الخروج
          </Nav.Link>
        </Nav>
      </BootstrapNavbar.Collapse>
    </BootstrapNavbar>
  );
}

export default Navbar;