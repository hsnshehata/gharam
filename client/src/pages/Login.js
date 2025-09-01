import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // فحص التوكن عند تحميل الصفحة
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios
        .get('/api/auth/validate-token', {
          headers: { 'x-auth-token': token },
        })
        .then((res) => {
          setUser(res.data.user);
          navigate(res.data.user.role === 'employee' ? '/employee-dashboard' : '/dashboard');
        })
        .catch((err) => {
          console.error('Token validation error:', err.response?.data || err.message);
          localStorage.removeItem('token'); // إزالة التوكن لو مش صالح
        });
    }
  }, [setUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      console.log('Login response:', res.data);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate(res.data.user.role === 'employee' ? '/employee-dashboard' : '/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في تسجيل الدخول');
    }
  };

  return (
    <Container className="login-container">
      <Row className="justify-content-md-center">
        <Col md={6} className="text-center">
          <img src="/logo.png" alt="Logo" className="login-logo" style={{ width: '190px' }} />
          <h2>لوحة الإدارة والتنفيذ</h2>
        </Col>
        <Col md={6}>
          <Form onSubmit={handleSubmit} className="login-form">
            <Form.Group className="mb-3">
              <Form.Label>اسم الموظف</Form.Label>
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
            {message && <div className="alert alert-danger">{message}</div>}
            <Button variant="primary" type="submit">تسجيل الدخول</Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
