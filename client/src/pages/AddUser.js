import React, { useState } from 'react';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import axios from 'axios';

function AddUser() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    monthlySalary: 0,
    phone: ''
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/users', formData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setMessage(res.data.msg);
      setFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage('خطأ في إضافة الموظف');
    }
  };

  return (
    <Container className="mt-5">
      <h2>إضافة موظف</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group>
          <Form.Label>اسم المستخدم</Form.Label>
          <Form.Control
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>كلمة المرور</Form.Label>
          <Form.Control
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>تأكيد كلمة المرور</Form.Label>
          <Form.Control
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>نوع الوظيفة</Form.Label>
          <Form.Control
            as="select"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="admin">أدمن</option>
            <option value="supervisor">مشرف</option>
            <option value="employee">موظف</option>
          </Form.Control>
        </Form.Group>
        <Form.Group>
          <Form.Label>الراتب الشهري</Form.Label>
          <Form.Control
            type="number"
            value={formData.monthlySalary}
            onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>رقم الهاتف</Form.Label>
          <Form.Control
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </Form.Group>
        <Button type="submit" className="mt-3">حفظ</Button>
        <Button variant="secondary" className="mt-3 ms-2" onClick={() => setFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' })}>
          إلغاء
        </Button>
      </Form>
    </Container>
  );
}

export default AddUser;