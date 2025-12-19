import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';

function PointsAdmin() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    try {
      const res = await axios.get('/api/users', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      setUsers(res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في جلب الموظفين');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = useMemo(() => users.find((u) => u._id === selectedUserId), [selectedUserId, users]);
  const pendingGifts = useMemo(() => (selectedUser?.points || []).filter((p) => p.type === 'gift' && p.status === 'pending'), [selectedUser]);
  const recentMovements = useMemo(() => {
    const arr = (selectedUser?.points || []).slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return arr.slice(0, 10);
  }, [selectedUser]);

  const handleGift = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !giftAmount) {
      setMessage('اختار موظف وقيمة الهدية');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/users/gift', { userId: selectedUserId, amount: Number(giftAmount), note: giftNote }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      showToast(res.data.msg || 'تم إرسال الهدية', 'success');
      setGiftAmount('');
      setGiftNote('');
      await loadUsers();
    } catch (err) {
      const msg = err.response?.data?.msg || 'تعذر إرسال الهدية';
      setMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeduct = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !deductAmount) {
      setMessage('اختار موظف وقيمة الخصم');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/users/deduct', { userId: selectedUserId, amount: Number(deductAmount), reason: deductReason }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      showToast(res.data.msg || 'تم الخصم', 'success');
      setDeductAmount('');
      setDeductReason('');
      await loadUsers();
    } catch (err) {
      const msg = err.response?.data?.msg || 'تعذر تنفيذ الخصم';
      setMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2 className="mb-4">إدارة الهدايا والخصم</h2>
      {message && <Alert variant="danger">{message}</Alert>}

      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>اختر الموظف</Form.Label>
            <Form.Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">-- اختر --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
              ))}
            </Form.Select>
          </Form.Group>
          {selectedUser && (
            <Card className="mt-3">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted small">إجمالي النقاط</div>
                    <div className="fw-bold">{selectedUser.totalPoints || 0}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted small">رصيد قابل للتحويل</div>
                    <div className="fw-bold">{selectedUser.convertiblePoints || 0}</div>
                  </div>
                </div>
                <div className="text-muted small mt-2">رصيد العملات: {selectedUser.efficiencyCoins?.length || 0}</div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>هدية نقاط</Card.Title>
              <Form onSubmit={handleGift}>
                <Form.Group className="mb-2">
                  <Form.Label>القيمة</Form.Label>
                  <Form.Control type="number" min="1" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>السبب / الرسالة</Form.Label>
                  <Form.Control type="text" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} placeholder="مثال: مكافأة إنجاز" />
                </Form.Group>
                <Button type="submit" disabled={loading || !selectedUserId}>إرسال الهدية</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>خصم نقاط</Card.Title>
              <Form onSubmit={handleDeduct}>
                <Form.Group className="mb-2">
                  <Form.Label>القيمة</Form.Label>
                  <Form.Control type="number" min="1" value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>السبب</Form.Label>
                  <Form.Control type="text" value={deductReason} onChange={(e) => setDeductReason(e.target.value)} placeholder="مثال: تأخير عن العمل" />
                </Form.Group>
                <Button variant="danger" type="submit" disabled={loading || !selectedUserId}>تطبيق الخصم</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {selectedUser && (
        <Row>
          <Col md={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>هدايا معلّقة</Card.Title>
                {pendingGifts.length === 0 ? (
                  <div className="text-muted">لا يوجد هدايا منتظرة للفتح</div>
                ) : (
                  <Table striped bordered hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th>القيمة</th>
                        <th>السبب</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingGifts.map((g) => (
                        <tr key={g._id}>
                          <td>+{g.amount}</td>
                          <td>{g.note || 'هدية نقاط'}</td>
                          <td>{g.date ? new Date(g.date).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>آخر الحركات</Card.Title>
                {recentMovements.length === 0 ? (
                  <div className="text-muted">لا يوجد حركات مسجلة</div>
                ) : (
                  <Table striped bordered hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th>القيمة</th>
                        <th>النوع</th>
                        <th>ملاحظة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMovements.map((m) => (
                        <tr key={m._id}>
                          <td className={m.amount >= 0 ? 'text-success' : 'text-danger'}>{m.amount}</td>
                          <td>
                            <Badge bg={m.type === 'gift' ? 'info' : m.type === 'deduction' ? 'danger' : 'secondary'}>
                              {m.type === 'gift' ? 'هدية' : m.type === 'deduction' ? 'خصم' : 'عمل'}
                            </Badge>
                          </td>
                          <td>{m.note || '—'}</td>
                          <td>{m.date ? new Date(m.date).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default PointsAdmin;
