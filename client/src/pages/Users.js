import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

function Users() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setUsers(res.data);
      } catch (err) {
        setMessage('خطأ في جلب الموظفين');
      }
    };
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addFormData.password !== addFormData.confirmPassword) {
      setMessage('كلمات المرور غير متطابقة');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/users', addFormData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setUsers([res.data.user, ...users]);
      setMessage(res.data.msg);
      setAddFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في إضافة الموظف');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      setMessage('كلمات المرور غير متطابقة');
      return;
    }
    try {
      const updateData = {
        username: editFormData.username,
        role: editFormData.role,
        monthlySalary: editFormData.monthlySalary,
        phone: editFormData.phone
      };
      if (editFormData.password) {
        updateData.password = editFormData.password;
        updateData.confirmPassword = editFormData.confirmPassword;
      }
      const res = await axios.put(`http://localhost:5000/api/users/${editItem._id}`, updateData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setUsers(users.map(user => (user._id === editItem._id ? res.data.user : user)));
      setMessage('تم تعديل الموظف بنجاح');
      setEditItem(null);
      setEditFormData({ username: '', password: '', confirmPassword: '', role: 'employee', monthlySalary: 0, phone: '' });
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في تعديل الموظف');
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
      await axios.delete(`http://localhost:5000/api/users/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setUsers(users.filter(user => user._id !== deleteItem._id));
      setMessage('تم حذف الموظف بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
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
              <Button type="submit" className="mt-3">
                <FontAwesomeIcon icon={faPlus} /> إضافة
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
                <Button type="submit" className="mt-3">تعديل</Button>
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