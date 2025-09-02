import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Pagination } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faEye, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

function ExpensesAdvances() {
  const [formData, setFormData] = useState({ type: 'expense', details: '', amount: 0, userId: '' });
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New loading state

  // Custom styles for react-select
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      border: '1px solid #98ff98',
      borderRadius: '4px',
      fontFamily: 'Tajawal, Arial, sans-serif',
      fontSize: '1rem',
      minHeight: '38px',
      padding: '0',
      lineHeight: '1.5',
      textAlign: 'right',
      direction: 'rtl',
      boxShadow: 'none'
    }),
    valueContainer: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      padding: '0.375rem 0.75rem',
      minHeight: '38px'
    }),
    input: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      fontSize: '1rem'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#fff',
      fontSize: '1rem',
      textAlign: 'right'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#fff',
      textAlign: 'right'
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      border: '1px solid #98ff98',
      borderRadius: '4px',
      zIndex: 1000,
      direction: 'rtl',
      textAlign: 'right'
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#98ff98' : state.isFocused ? '#78cc78' : '#2a7a78',
      color: state.isSelected || state.isFocused ? '#000' : '#fff',
      fontFamily: 'Tajawal, Arial, sans-serif',
      fontSize: '1rem',
      padding: '0.375rem 0.75rem'
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff'
    })
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, usersRes] = await Promise.all([
          axios.get(`/api/expenses-advances?page=${currentPage}&search=${search}`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          }),
          axios.get('/api/users', {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          })
        ]);
        setItems(itemsRes.data.expensesAdvances);
        setTotalPages(itemsRes.data.totalPages);
        setUsers(usersRes.data);
      } catch (err) {
        setMessage('خطأ في جلب البيانات');
      }
    };
    fetchData();
  }, [currentPage, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    setShowCreateModal(false); // Close modal immediately
    try {
      const res = await axios.post('/api/expenses-advances', formData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setItems([res.data.expenseAdvance, ...items]);
      setMessage(res.data.msg || 'تمت الإضافة بنجاح');
      setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في الإضافة');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      type: item.type,
      details: item.details || '',
      amount: item.amount,
      userId: item.userId?._id || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    setEditItem(null); // Close modal immediately
    try {
      const res = await axios.put(`/api/expenses-advances/${editItem._id}`, formData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setItems(items.map(item => (item._id === editItem._id ? res.data.expenseAdvance : item)));
      setMessage('تم التعديل بنجاح');
      setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في التعديل');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/expenses-advances/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setItems(items.filter(item => item._id !== deleteItem._id));
      setShowDeleteModal(false);
      setMessage('تم الحذف بنجاح');
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
    }
  };

  const handleShowDetails = (item) => {
    setCurrentDetails(item);
    setShowDetailsModal(true);
  };

  return (
    <Container className="mt-5">
      <h2>المصروفات والسلف</h2>
      <Button className="mb-3" onClick={() => setShowCreateModal(true)}>
        <FontAwesomeIcon icon={faPlus} /> إضافة مصروف/سلفة
      </Button>
      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="ابحث باسم العميل أو رقم الوصل"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Form.Group>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Row>
        {items.map(item => (
          <Col md={4} key={item._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{item.type === 'expense' ? 'مصروف' : 'سلفة'}</Card.Title>
                <Card.Text>
                  التفاصيل: {item.details || 'غير محدد'}<br />
                  المبلغ: {item.amount} جنيه<br />
                  {item.type === 'advance' && (
                    <>
                      الموظف: {item.userId?.username || 'غير محدد'}<br />
                      المتبقي من الراتب: {item.userId?.remainingSalary || 0} جنيه<br />
                    </>
                  )}
                  التاريخ: {new Date(item.createdAt).toLocaleDateString()}<br />
                  أضيف بواسطة: {item.createdBy?.username || item.userId?.username || 'غير معروف'}
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(item)}>
                  <FontAwesomeIcon icon={faEdit} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleShowDetails(item)}>
                  <FontAwesomeIcon icon={faEye} />
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem(item); setShowDeleteModal(true); }}>
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <Pagination(find: const [currentPage, setCurrentPage] = useState(1);) className="justify-content-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>إضافة مصروف/سلفة</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>النوع</Form.Label>
              <Form.Control
                as="select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="expense">مصروف</option>
                <option value="advance">سلفة</option>
              </Form.Control>
            </Form.Group>
            {formData.type === 'advance' && (
              <Form.Group className="mb-3">
                <Form.Label>اختر الموظف</Form.Label>
                <Select
                  options={users.map(user => ({ value: user._id, label: user.username }))}
                  value={users.find(user => user._id === formData.userId) ? { value: formData.userId, label: users.find(user => user._id === formData.userId)?.username } : null}
                  onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value : '' })}
                  styles={customStyles}
                  placeholder="اختر الموظف"
                  isClearable
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>التفاصيل</Form.Label>
              <Form.Control
                type="text"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>المبلغ</Form.Label>
              <Form.Control
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </Form.Group>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => setShowCreateModal(false)} disabled={isLoading}>
              إلغاء
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={editItem} onHide={() => setEditItem(null)}>
        <Modal.Header closeButton>
          <Modal.Title>تعديل {editItem?.type === 'expense' ? 'مصروف' : 'سلفة'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>النوع</Form.Label>
              <Form.Control
                as="select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="expense">مصروف</option>
                <option value="advance">سلفة</option>
              </Form.Control>
            </Form.Group>
            {formData.type === 'advance' && (
              <Form.Group className="mb-3">
                <Form.Label>اختر الموظف</Form.Label>
                <Select
                  options={users.map(user => ({ value: user._id, label: user.username }))}
                  value={users.find(user => user._id === formData.userId) ? { value: formData.userId, label: users.find(user => user._id === formData.userId)?.username } : null}
                  onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value : '' })}
                  styles={customStyles}
                  placeholder="اختر الموظف"
                  isClearable
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>التفاصيل</Form.Label>
              <Form.Control
                type="text"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>المبلغ</Form.Label>
              <Form.Control
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </Form.Group>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري التعديل...' : 'تعديل'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => setEditItem(null)} disabled={isLoading}>
              إلغاء
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف {deleteItem?.type === 'expense' ? 'المصروف' : 'السلفة'}؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete}>حذف</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل العملية</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentDetails && (
            <div>
              <p>النوع: {currentDetails.type === 'expense' ? 'مصروف' : 'سلفة'}</p>
              {currentDetails.type === 'expense' ? (
                <p>التفاصيل: {currentDetails.details || 'غير محدد'}</p>
              ) : (
                <>
                  <p>الموظف: {currentDetails.userId?.username || 'غير محدد'}</p>
                  <p>المتبقي من الراتب: {currentDetails.userId?.remainingSalary || 0} جنيه</p>
                </>
              )}
              <p>المبلغ: {currentDetails.amount || 0} جنيه</p>
              <p>التاريخ: {new Date(currentDetails.createdAt).toLocaleDateString()}</p>
              <p>أضيف بواسطة: {currentDetails.createdBy?.username || currentDetails.userId?.username || 'غير معروف'}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>إغلاق</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default ExpensesAdvances;
