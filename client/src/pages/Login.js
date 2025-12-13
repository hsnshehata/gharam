import React, { useState, useEffect } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('savedUsername');
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
    // if token exists, you may choose to auto-redirect
    const token = localStorage.getItem('token');
    if (token) {
      // optional: auto-redirect to dashboard if already logged in
      // navigate('/dashboard');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      console.log('Login response:', res.data);
      localStorage.setItem('token', res.data.token);
      if (remember) {
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('savedUsername');
      }
      setUser(res.data.user);
      // توجيه حسب الدور
      const destination = res.data.user.role === 'employee'
        ? '/employee-dashboard'
        : res.data.user.role === 'hallSupervisor'
        ? '/hall-supervision'
        : '/dashboard';
      navigate(destination);
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في تسجيل الدخول');
    }
  };

  return (
    <Container className="login-container">
      <div className="login-card">
        <img src="/logo.png" alt="Logo" className="login-logo" />
        <h2>مرحبًا بعودتك </h2>
        <Form onSubmit={handleSubmit} className="login-form">
          <Form.Group className="mb-3">
            <Form.Label>اسم المستخدم</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>كلمة المرور</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <div className="remember-row">
            <Form.Check
              type="checkbox"
              id="remember"
              label="تذكرني"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
          </div>
          {message && <div className="alert alert-danger mt-2">{message}</div>}
          <Button variant="primary" type="submit" className="mt-3">تسجيل الدخول</Button>
        </Form>
      </div>
    </Container>
  );
}

export default Login;