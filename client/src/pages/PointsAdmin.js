import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge } from 'react-bootstrap';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';

const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 38000, 73000, 118000, 178000, 268000, 418000];
const MAX_LEVEL = 10;

const newId = (prefix = 'loc') => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const normalizeId = (entity) => (entity?._id || entity?.id || '').toString();

const getLevel = (totalPoints = 0) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return Math.min(i + 1, MAX_LEVEL);
    }
  }
  return 1;
};

const recomputeConvertible = (user) => {
  const coinsCount = (user.efficiencyCoins?.length || 0) + (user.coinsRedeemed?.length || 0);
  user.convertiblePoints = Math.max(0, (user.totalPoints || 0) - (coinsCount * 1000));
};

function PointsAdmin() {
  const { collections, queueOperation } = useRxdb() || {};
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!collections) return undefined;
    const sub = collections.users
      ?.find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => {
        setUsers(docs.map((d) => (d.toJSON ? d.toJSON() : d)));
      });
    return () => sub && sub.unsubscribe && sub.unsubscribe();
  }, [collections]);

  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const id = normalizeId(u);
      if (id) map.set(id, u);
    });
    return map;
  }, [users]);

  const selectedUser = useMemo(() => usersMap.get(selectedUserId) || null, [selectedUserId, usersMap]);

  const ensureArrays = (userDraft) => {
    if (!Array.isArray(userDraft.points)) userDraft.points = [];
    if (!Array.isArray(userDraft.efficiencyCoins)) userDraft.efficiencyCoins = [];
    if (!Array.isArray(userDraft.coinsRedeemed)) userDraft.coinsRedeemed = [];
  };

  const upsertUser = useCallback(async (userDraft) => {
    const col = collections?.users;
    if (!col) throw new Error('قاعدة البيانات غير جاهزة');
    const payload = { ...userDraft, updatedAt: new Date().toISOString() };
    await col.upsert(payload);
    if (queueOperation) await queueOperation('users', 'update', payload);
    return payload;
  }, [collections, queueOperation]);

  const mutateUser = useCallback(async (userId, mutator) => {
    const base = usersMap.get(userId);
    if (!base) throw new Error('الموظف غير موجود محلياً');
    const draft = {
      ...base,
      points: Array.isArray(base.points) ? [...base.points] : [],
      efficiencyCoins: Array.isArray(base.efficiencyCoins) ? [...base.efficiencyCoins] : [],
      coinsRedeemed: Array.isArray(base.coinsRedeemed) ? [...base.coinsRedeemed] : []
    };
    ensureArrays(draft);
    const updated = mutator(draft) || draft;
    recomputeConvertible(updated);
    updated.level = getLevel(updated.totalPoints || 0);
    return upsertUser(updated);
  }, [upsertUser, usersMap]);

  const pendingGifts = useMemo(() => (selectedUser?.points || []).filter((p) => p.type === 'gift' && p.status === 'pending'), [selectedUser]);

  const appliedPointsByMonth = useMemo(() => {
    const map = {};
    (selectedUser?.points || []).forEach((p) => {
      if (p.status === 'pending') return;
      const dt = p.date ? new Date(p.date) : null;
      if (!dt || Number.isNaN(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + Number(p.amount || 0);
    });
    return map;
  }, [selectedUser]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const keyNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const keyPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    let bestMonth = { key: '—', value: 0 };
    Object.entries(appliedPointsByMonth).forEach(([k, v]) => {
      if (v > bestMonth.value) bestMonth = { key: k, value: v };
    });
    return {
      current: appliedPointsByMonth[keyNow] || 0,
      previous: appliedPointsByMonth[keyPrev] || 0,
      best: bestMonth
    };
  }, [appliedPointsByMonth]);

  const recentMovements = useMemo(() => {
    const arr = (selectedUser?.points || []).slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return arr.slice(0, 10);
  }, [selectedUser]);

  const handleGift = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!sendToAll && !selectedUserId) {
      setMessage('اختار موظف أو فعّل إرسال للجميع');
      return;
    }
    if (!giftAmount) {
      setMessage('حدد قيمة الهدية');
      return;
    }
    try {
      setLoading(true);
      const amountValue = Number(giftAmount);
      const giftPayload = (note = giftNote || 'هدية نقاط') => ({
        _id: newId('gift'),
        amount: amountValue,
        date: new Date().toISOString(),
        type: 'gift',
        note,
        giftedByName: 'الإدارة',
        status: 'pending'
      });

      const targetIds = sendToAll ? users.map((u) => normalizeId(u)).filter(Boolean) : [selectedUserId];
      await Promise.all(targetIds.map((uid) => mutateUser(uid, (draft) => {
        draft.points.push(giftPayload(sendToAll ? 'هدية نقاط جماعية' : giftNote));
        return draft;
      })));

      showToast('تم إرسال الهدية (محفوظ أوفلاين)', 'success');
      setGiftAmount('');
      setGiftNote('');
      if (!sendToAll) setSelectedUserId('');
      setSendToAll(false);
    } catch (err) {
      console.error('Gift error:', err);
      const msg = err.message || 'تعذر إرسال الهدية محلياً';
      setMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeduct = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!selectedUserId || !deductAmount) {
      setMessage('اختار موظف وقيمة الخصم');
      return;
    }
    try {
      setLoading(true);
      const amountValue = Number(deductAmount);
      await mutateUser(selectedUserId, (draft) => {
        const currentPoints = Math.max(0, Number(draft.totalPoints || 0));
        const deduction = Math.min(amountValue, currentPoints);
        draft.points.push({
          _id: newId('ded'),
          amount: -deduction,
          date: new Date().toISOString(),
          type: 'deduction',
          note: deductReason || 'خصم نقاط إداري',
          giftedByName: 'الإدارة',
          status: 'applied'
        });
        draft.totalPoints = Math.max(0, currentPoints - deduction);
        return draft;
      });
      showToast('تم الخصم وتسجيله (أوفلاين)', 'success');
      setDeductAmount('');
      setDeductReason('');
    } catch (err) {
      console.error('Deduct error:', err);
      const msg = err.message || 'تعذر تنفيذ الخصم';
      setMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2 className="mb-4">إدارة الهدايا والخصم (أوفلاين)</h2>
      {message && <Alert variant="danger">{message}</Alert>}

      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>اختر الموظف</Form.Label>
            <Form.Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={sendToAll}>
              <option value="">-- اختر --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Check
            type="checkbox"
            id="send-all"
            className="mt-2"
            label="تحديد الكل (هدية جماعية لكل الحسابات)"
            checked={sendToAll}
            onChange={(e) => setSendToAll(e.target.checked)}
          />
          {selectedUser && (
            <Card className="mt-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="text-muted small">إجمالي النقاط</div>
                    <div className="fw-bold">{selectedUser.totalPoints || 0}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted small">رصيد قابل للتحويل</div>
                    <div className="fw-bold">{selectedUser.convertiblePoints || 0}</div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-3 mt-3">
                  <span className="badge bg-primary">المستوى L{selectedUser.level || 1}</span>
                  <span className="text-muted small">نقاط الشهر الحالي: {monthStats.current}</span>
                  <span className="text-muted small">نقاط الشهر السابق: {monthStats.previous}</span>
                  <span className="text-muted small">أعلى شهر: {monthStats.best.key} ({monthStats.best.value})</span>
                  <span className="text-muted small">رصيد العملات: {selectedUser.efficiencyCoins?.length || 0}</span>
                </div>
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
                <Button type="submit" disabled={loading || (!sendToAll && !selectedUserId)}>إرسال الهدية</Button>
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
                        <th>من</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingGifts.map((g) => (
                        <tr key={g._id || newId('gift-row')}>
                          <td>+{g.amount}</td>
                          <td>{g.note || 'هدية نقاط'}</td>
                          <td>{g.giftedByName || 'الإدارة'}</td>
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
                        <tr key={m._id || newId('move')}>
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
