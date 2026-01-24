import React, { useState } from 'react';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';

function AddUser() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    monthlySalary: 0,
    phone: ''
  });
  const { showToast } = useToast();
  const { collections, queueOperation } = useRxdb() || {};

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const upsertLocal = async (doc, op = 'update') => {
    if (!collections?.users) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await collections.users.upsert(withTs);
    if (queueOperation) await queueOperation('users', op, withTs);
    return withTs;
  };
  const setMessage = (msg) => {
    if (!msg) return;
    const variant = msg.includes('خطأ') ? 'danger' : 'success';
    showToast(msg, variant);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage('كلمات المرور غير متطابقة');
      return;
    }
    try {
      const newUser = {
        _id: newId(),
        username: formData.username,
        password: formData.password,
        role: formData.role,
        monthlySalary: Number(formData.monthlySalary) || 0,
        remainingSalary: Number(formData.monthlySalary) || 0,
        phone: formData.phone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false,
        points: [],
        efficiencyCoins: [],
        coinsRedeemed: [],
        totalPoints: 0,
        convertiblePoints: 0,
        level: 1
      };
      await upsertLocal(newUser, 'insert');
      setMessage('تم إضافة الموظف محلياً وسيتم رفعه عند الاتصال');
      setFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage('خطأ في إضافة الموظف محلياً');
    }
  };

  return (
    <Container className="mt-5">
      <h2>إضافة موظف</h2>
      {/* التنبيهات أصبحت عبر التوست */}
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
            <option value="hallSupervisor">مشرف صالة</option>
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