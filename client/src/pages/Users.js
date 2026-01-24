import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useRxdb } from '../db/RxdbProvider';

function Users() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [addFormData, setAddFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    monthlySalary: 0,
    phone: ''
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    monthlySalary: 0,
    phone: ''
  });
  const { collections, queueOperation } = useRxdb() || {};

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const upsertLocal = async (doc, op = 'update') => {
    if (!collections?.users) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await collections.users.upsert(withTs);
    if (queueOperation) await queueOperation('users', op, withTs);
    return withTs;
  };

  useEffect(() => {
    if (!collections?.users) return;
    const sub = collections.users
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => setUsers(docs.map((d) => d.toJSON())));
    return () => sub?.unsubscribe();
  }, [collections]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addFormData.password !== addFormData.confirmPassword) {
      setMessage('كلمات المرور غير متطابقة');
      return;
    }
    if (addSubmitting) return;
    setAddSubmitting(true);
    try {
      const newUser = {
        _id: newId(),
        username: addFormData.username,
        password: addFormData.password, // سيُهش عند الرفع للسيرفر
        role: addFormData.role,
        monthlySalary: Number(addFormData.monthlySalary) || 0,
        phone: addFormData.phone || '',
        remainingSalary: Number(addFormData.monthlySalary) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false,
        points: [],
        efficiencyCoins: [],
        coinsRedeemed: []
      };
      await upsertLocal(newUser, 'insert');
      setMessage('تم إضافة الموظف محلياً وسيتم رفعه عند الاتصال');
      setAddFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage('خطأ في إضافة الموظف');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      setMessage('كلمات المرور غير متطابقة');
      return;
    }
    if (editSubmitting) return;
    setEditSubmitting(true);
    try {
      const updateData = {
        ...editItem,
        username: editFormData.username,
        role: editFormData.role,
        monthlySalary: Number(editFormData.monthlySalary) || 0,
        phone: editFormData.phone || '',
        remainingSalary: editItem.remainingSalary ?? editItem.monthlySalary,
      };
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }
      await upsertLocal(updateData, 'update');
      setMessage('تم تعديل الموظف محلياً وسيتم رفعه عند الاتصال');
      setEditItem(null);
      setEditFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage('خطأ في تعديل الموظف');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditItem(user);
    setEditFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      role: user.role,
      monthlySalary: user.monthlySalary,
      phone: user.phone || ''
    });
  };

  const handleDelete = async () => {
    try {
      await upsertLocal({ ...deleteItem, _deleted: true }, 'delete');
      setMessage('تم حذف الموظف محلياً وسيتم رفعه عند الاتصال');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2>الموظفين</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      
      <div className="mb-4">
        <h3>إضافة موظف</h3>
        <Form onSubmit={handleAddSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>اسم المستخدم</Form.Label>
                <Form.Control
                  type="text"
                  value={addFormData.username}
                  onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>كلمة المرور</Form.Label>
                <Form.Control
                  type="password"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>تأكيد كلمة المرور</Form.Label>
                <Form.Control
                  type="password"
                  value={addFormData.confirmPassword}
                  onChange={(e) => setAddFormData({ ...addFormData, confirmPassword: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>نوع الوظيفة</Form.Label>
                <Form.Control
                  as="select"
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                >
                  <option value="admin">أدمن</option>
                  <option value="supervisor">مشرف</option>
                  <option value="hallSupervisor">مشرف صالة</option>
                  <option value="employee">موظف</option>
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>الراتب الشهري</Form.Label>
                <Form.Control
                  type="number"
                  value={addFormData.monthlySalary}
                  onChange={(e) => setAddFormData({ ...addFormData, monthlySalary: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>رقم الهاتف</Form.Label>
                <Form.Control
                  type="text"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Button type="submit" className="mt-3" disabled={addSubmitting}>
                {addSubmitting ? 'جارٍ الحفظ...' : (<><FontAwesomeIcon icon={faPlus} /> إضافة</>)}
              </Button>
              <Button
                variant="secondary"
                className="mt-3 ms-2"
                onClick={() => setAddFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' })}
              >
                إلغاء
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      <h3>قائمة الموظفين</h3>
      <Row>
        {users.map(user => (
          <Col md={4} key={user._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{user.username}</Card.Title>
                <Card.Text>
                  الدور: {user.role === 'admin' ? 'أدمن' : user.role === 'supervisor' ? 'مشرف' : user.role === 'hallSupervisor' ? 'مشرف صالة' : 'موظف'}<br />
                  الراتب الشهري: {user.monthlySalary} جنيه<br />
                  رقم الهاتف: {user.phone || 'غير متوفر'}<br />
                  النقاط: {(user.points || []).reduce((sum, point) => sum + point.amount, 0)}<br />
                  تاريخ الإضافة: {new Date(user.createdAt).toLocaleDateString()}
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(user)}>
                  <FontAwesomeIcon icon={faEdit} /> تعديل
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem({ _id: user._id }); setShowDeleteModal(true); }}>
                  <FontAwesomeIcon icon={faTrash} /> حذف
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={editItem !== null} onHide={() => setEditItem(null)}>
        <Modal.Header closeButton>
          <Modal.Title>تعديل موظف</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>اسم المستخدم</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>كلمة المرور (اتركها فارغة إذا لم ترغب في التغيير)</Form.Label>
                  <Form.Control
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>تأكيد كلمة المرور</Form.Label>
                  <Form.Control
                    type="password"
                    value={editFormData.confirmPassword}
                    onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>نوع الوظيفة</Form.Label>
                  <Form.Control
                    as="select"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  >
                    <option value="admin">أدمن</option>
                    <option value="supervisor">مشرف</option>
                    <option value="hallSupervisor">مشرف صالة</option>
                    <option value="employee">موظف</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>الراتب الشهري</Form.Label>
                  <Form.Control
                    type="number"
                    value={editFormData.monthlySalary}
                    onChange={(e) => setEditFormData({ ...editFormData, monthlySalary: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>رقم الهاتف</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Button type="submit" className="mt-3" disabled={editSubmitting}>
                  {editSubmitting ? 'جارٍ الحفظ...' : 'تعديل'}
                </Button>
                <Button variant="secondary" className="mt-3 ms-2" onClick={() => setEditItem(null)}>
                  إلغاء
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف الموظف؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete}>حذف</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Users;