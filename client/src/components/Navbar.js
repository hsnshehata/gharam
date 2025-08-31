import React from 'react';
import { Navbar as BootstrapNavbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Navbar({ user }) {
  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <BootstrapNavbar.Brand>
        <img src="/logo.png" alt="Logo" className="logo" /> مرحباً بعودتك, {user.username}
      </BootstrapNavbar.Brand>
      <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BootstrapNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          {user.role === 'admin' && (
            <>
              <Nav.Link as={Link} to="/dashboard">شغل إنهاردة</Nav.Link>
              <Nav.Link as={Link} to="/bookings">الحجوزات</Nav.Link>
              <Nav.Link as={Link} to="/instant-services">الخدمات الفورية</Nav.Link>
              <Nav.Link as={Link} to="/expenses-advances">المصروفات والسلف</Nav.Link>
              <Nav.Link as={Link} to="/packages-services">إضافة باكدجات/خدمات</Nav.Link>
              <Nav.Link as={Link} to="/users">الموظفين</Nav.Link>
              <Nav.Link as={Link} to="/daily-reports">التقارير اليومية</Nav.Link>
            </>
          )}
          {(user.role === 'supervisor') && (
            <>
              <Nav.Link as={Link} to="/dashboard">شغل إنهاردة</Nav.Link>
              <Nav.Link as={Link} to="/bookings">الحجوزات</Nav.Link>
              <Nav.Link as={Link} to="/instant-services">الخدمات الفورية</Nav.Link>
              <Nav.Link as={Link} to="/expenses-advances">المصروفات والسلف</Nav.Link>
            </>
          )}
          {user.role === 'employee' && (
            <>
              <Nav.Link as={Link} to="/employee-dashboard">لوحة الموظف</Nav.Link>
            </>
          )}
          <Nav.Link onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>
            تسجيل الخروج
          </Nav.Link>
        </Nav>
      </BootstrapNavbar.Collapse>
    </BootstrapNavbar>
  );
}

export default Navbar;