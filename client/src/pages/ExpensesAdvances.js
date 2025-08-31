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
  const [showCreateModal, setShowCreateModal] = useState(false); // إضافة الـ state هنا

  // Custom styles للـ react-select
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
    }),
    clearIndicator: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      ':hover': { color: '#78cc78' }
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      ':hover': { color: '#78cc78' }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#98ff98'
    })
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await axios.get('http://localhost:5000/api/users', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const itemsRes = await axios.get(`http://localhost:5000/api/expenses-advances?page=${currentPage}&search=${search}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Users response:', usersRes.data);
        console.log('Expenses/Advances response:', itemsRes.data);
        setUsers(usersRes.data);
        setItems(itemsRes.data.items.map(item => ({
          ...item,
          type: item.type || (item.details ? 'expense' : 'advance')
        })));
        setTotalPages(itemsRes.data.pages);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        setMessage('خطأ في جلب البيانات');
      }
    };
    fetchData();
  }, [currentPage, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // فحص البيانات قبل الإرسال
    if (formData.type === 'expense' && (!formData.details || !formData.amount)) {
      setMessage('تفاصيل المصروف والمبلغ مطلوبة');
      return;
    }
    if (formData.type === 'advance') {
      if (!formData.userId || !formData.amount) {
        setMessage('اسم الموظف والمبلغ مطلوبين');
        return;
      }
      const selectedUser = users.find(u => u._id === formData.userId);
      if (selectedUser && parseFloat(formData.amount) > selectedUser.remainingSalary) {
        setMessage('السلفة أكبر من المتبقي من الراتب');
        return;
      }
    }
    console.log('Submitting formData:', formData);
    try {
      if (editItem) {
        console.log('Updating item with ID:', editItem._id, 'Type:', editItem.type);
        const res = await axios.put(`http://localhost:5000/api/expenses-advances/${editItem._id}`, formData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Update response:', res.data);
        setItems(items.map(i => (i._id === editItem._id ? { ...res.data.item, type: res.data.type } : i)));
        setMessage(`تم تعديل ${res.data.type === 'expense' ? 'المصروف' : 'السلفة'} بنجاح`);
      } else {
        const res = await axios.post('http://localhost:5000/api/expenses-advances', formData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Create response:', res.data);
        setItems([res.data.item, ...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setMessage(`تم إضافة ${res.data.type === 'expense' ? 'المصروف' : 'السلفة'} بنجاح`);
      }
      setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
      setEditItem(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل العملية');
    }
  };

  const handleEdit = (item) => {
    console.log('Editing item:', item);
    setEditItem(item);
    setFormData({
      type: item.type || (item.details ? 'expense' : 'advance'),
      details: item.details || '',
      amount: item.amount || 0,
      userId: item.userId?._id || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !deleteItem._id || !deleteItem.type) {
      setMessage('خطأ: لا يمكن الحذف بسبب بيانات غير صالحة');
      setShowDeleteModal(false);
      return;
    }
    try {
      console.log('Deleting item with ID:', deleteItem._id, 'Type:', deleteItem.type);
      await axios.delete(`http://localhost:5000/api/expenses-advances/${deleteItem._id}?type=${deleteItem.type}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setItems(items.filter(i => i._id !== deleteItem._id));
      setMessage(`تم حذف ${deleteItem.type === 'expense' ? 'المصروف' : 'السلفة'} بنجاح`);
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handleShowDetails = (item) => {
    console.log('Showing details for item:', item);
    setCurrentDetails(item);
    setShowDetailsModal(true);
  };

  const handleSearch = async () => {
    try {
      console.log('Searching with query:', search);
      const res = await axios.get(`http://localhost:5000/api/expenses-advances?search=${search}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      console.log('Search response:', res.data);
      setItems(res.data.items.map(item => ({
        ...item,
        type: item.type || (item.details ? 'expense' : 'advance')
      })));
      setCurrentPage(1);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      setMessage('خطأ في البحث');
    }
  };

  return (
    <Container className="mt-5">
      <h2>إدارة المصروفات والسلف</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        <FontAwesomeIcon icon={faPlus} /> إضافة عملية جديدة
      </Button>
      <Row className="mt-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالاسم أو تفاصيل</Form.Label>
            <Form.Control
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو تفاصيل الصرف"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>
      </Row>
      <Button variant="primary" onClick={handleSearch} className="mt-2">بحث</Button>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'تعديل العملية' : 'إضافة عملية جديدة'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} className="form-row">
            <Col md={6}>
              <Form.Group>
                <Form.Label>نوع العملية</Form.Label>
                <Form.Control
                  as="select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, details: '', userId: '' })}
                >
                  <option value="expense">مصروف</option>
                  <option value="advance">سلفة</option>
                </Form.Control>
              </Form.Group>
            </Col>
            {formData.type === 'expense' ? (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>تفاصيل المصروف</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>المبلغ</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </>
            ) : (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>اسم الموظف</Form.Label>
                    <Select
                      options={users.map(user => ({ value: user._id, label: `${user.username} (المتبقي: ${user.remainingSalary} جنيه)` }))}
                      value={users.find(u => u._id === formData.userId) ? { value: formData.userId, label: `${users.find(u => u._id === formData.userId).username} (المتبقي: ${users.find(u => u._id === formData.userId).remainingSalary} جنيه)` } : null}
                      onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value : '' })}
                      isSearchable
                      placeholder="اختر الموظف..."
                      className="booking-services-select"
                      classNamePrefix="booking-services"
                      styles={customStyles}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>المبلغ</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </>
            )}
            <Col md={12}>
              <Button type="submit" className="mt-3">{editItem ? 'تعديل' : 'حفظ'}</Button>
              <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
                setEditItem(null);
                setShowCreateModal(false);
              }}>
                إلغاء
              </Button>
            </Col>
          </Form>
        </Modal.Body>
      </Modal>

      <h3>المصروفات والسلف</h3>
      <Row>
        {items.map(item => (
          <Col md={4} key={item._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{item.type === 'expense' ? 'مصروف' : 'سلفة'}</Card.Title>
                <Card.Text>
                  {item.type === 'expense' ? `التفاصيل: ${item.details || 'غير محدد'}` : `الموظف: ${item.userId?.username || 'غير محدد'}`}<br />
                  المبلغ: {item.amount || 0} جنيه<br />
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

      <Pagination className="justify-content-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>

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