import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
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
  const [submitLoading, setSubmitLoading] = useState(false);

  const userOptions = useMemo(() => (
    users.map(user => ({
      value: user._id?.toString(),
      label: `${user.username} (المتبقي: ${user.remainingSalary} جنيه)`
    }))
  ), [users]);

  // Custom styles للـ react-select — neutralized to use CSS variables (black/white theme)
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
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
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      padding: '0.375rem 0.75rem',
      minHeight: '38px'
    }),
    input: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      fontSize: '1rem'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--muted)',
      fontSize: '1rem',
      textAlign: 'right'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text)',
      textAlign: 'right',
      opacity: 1,
      position: 'relative',
      zIndex: 2
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      zIndex: 1000,
      direction: 'rtl',
      textAlign: 'right'
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--text)' : state.isFocused ? 'var(--border)' : 'var(--bg)',
      color: state.isSelected ? 'var(--bg)' : 'var(--text)',
      fontFamily: 'Tajawal, Arial, sans-serif',
      fontSize: '1rem',
      padding: '0.375rem 0.75rem'
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)'
    }),
    clearIndicator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      ':hover': { color: 'var(--muted)' }
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      ':hover': { color: 'var(--muted)' }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--border)'
    })
  };

  const tokenHeader = useMemo(() => ({ headers: { 'x-auth-token': localStorage.getItem('token') } }), []);

  const { data: usersData, mutate: mutateUsers } = useSWR(
    '/api/users',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const itemsKey = `/api/expenses-advances?page=${currentPage}&search=${encodeURIComponent(search)}`;
  const { data: itemsData, error: itemsError, mutate: mutateItems } = useSWR(
    itemsKey,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (usersData) setUsers(usersData.map(u => ({ ...u, _id: u._id?.toString() })));
  }, [usersData]);

  useEffect(() => {
    if (itemsData) {
      setItems(itemsData.items.map(item => ({
        ...item,
        type: item.type || (item.details ? 'expense' : 'advance')
      })));
      setTotalPages(itemsData.pages || 1);
    }
  }, [itemsData]);

  useEffect(() => {
    if (itemsError) setMessage('خطأ في جلب البيانات');
  }, [itemsError]);

  const revalidateAll = useCallback(() => {
    mutateUsers();
    mutateItems();
  }, [mutateUsers, mutateItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // فحص البيانات قبل الإرسال
    if (formData.type === 'expense' && (!formData.details || !formData.amount)) {
      setMessage('تفاصيل المصروف والمبلغ مطلوبة');
      return;
    }
    if (formData.type === 'advance' || formData.type === 'deduction') {
      if (!formData.userId || !formData.amount) {
        setMessage('اسم الموظف والمبلغ مطلوبين');
        return;
      }
      if (formData.type === 'deduction' && !formData.details) {
        setMessage('سبب الخصم مطلوب');
        return;
      }
      const selectedUser = users.find(u => u._id === formData.userId);
      if (selectedUser && parseFloat(formData.amount) > selectedUser.remainingSalary) {
        setMessage(formData.type === 'advance' ? 'السلفة أكبر من المتبقي من الراتب' : 'الخصم أكبر من المتبقي من الراتب');
        return;
      }
    }
    if (submitLoading) return;
    setSubmitLoading(true);
    setShowCreateModal(false);
    console.log('Submitting formData:', formData);
    try {
      if (editItem) {
        console.log('Updating item with ID:', editItem._id, 'Type:', editItem.type);
        const res = await axios.put(`/api/expenses-advances/${editItem._id}`, formData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Update response:', res.data);
        setItems(items.map(i => (i._id === editItem._id ? { ...res.data.item, type: res.data.type } : i)));
        const typeLabel = res.data.type === 'expense' ? 'المصروف' : res.data.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
        setMessage(`تم تعديل ${typeLabel} بنجاح`);
      } else {
        const res = await axios.post('/api/expenses-advances', formData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Create response:', res.data);
        setItems([res.data.item, ...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        const typeLabel = res.data.type === 'expense' ? 'المصروف' : res.data.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
        setMessage(`تم إضافة ${typeLabel} بنجاح`);
      }
      revalidateAll();
      setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
      setEditItem(null);
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل العملية');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (item) => {
    console.log('Editing item:', item);
    setEditItem(item);
    setFormData({
      type: item.type || (item.details ? 'expense' : 'advance'),
      details: item.details || '',
      amount: item.amount || 0,
      userId: item.userId?._id?.toString() || ''
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
      await axios.delete(`/api/expenses-advances/${deleteItem._id}?type=${deleteItem.type}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setItems(items.filter(i => i._id !== deleteItem._id));
      const typeLabel = deleteItem.type === 'expense' ? 'المصروف' : deleteItem.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
      setMessage(`تم حذف ${typeLabel} بنجاح`);
      setShowDeleteModal(false);
      setDeleteItem(null);
      revalidateAll();
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
    setCurrentPage(1);
    revalidateAll();
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
                    <option value="deduction">خصم إداري</option>
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
              ) : formData.type === 'advance' ? (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>اسم الموظف</Form.Label>
                    <Select
                      options={userOptions}
                      value={userOptions.find(opt => opt.value === formData.userId?.toString()) || null}
                      onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value.toString() : '' })}
                      isSearchable
                      placeholder="اختر الموظف..."
                      className="booking-services-select"
                      classNamePrefix="react-select"
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
              ) : (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>اسم الموظف</Form.Label>
                      <Select
                        options={userOptions}
                        value={userOptions.find(opt => opt.value === formData.userId?.toString()) || null}
                        onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value.toString() : '' })}
                        isSearchable
                        placeholder="اختر الموظف..."
                        className="booking-services-select"
                        classNamePrefix="react-select"
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
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>سبب الخصم</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.details}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
            )}
            <Col md={12}>
              <Button type="submit" className="mt-3" disabled={submitLoading}>
                {submitLoading ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
              </Button>
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
                <Card.Title>
                  {item.type === 'expense' ? 'مصروف' : item.type === 'advance' ? 'سلفة' : 'خصم إداري'}
                </Card.Title>
                <Card.Text>
                  {item.type === 'expense'
                    ? `التفاصيل: ${item.details || 'غير محدد'}`
                    : `الموظف: ${item.userId?.username || 'غير محدد'}`}
                  <br />
                  {item.type === 'deduction' && `سبب الخصم: ${item.details || 'غير محدد'}`}<br />
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
              ) : currentDetails.type === 'advance' ? (
                <>
                  <p>الموظف: {currentDetails.userId?.username || 'غير محدد'}</p>
                  <p>المتبقي من الراتب: {currentDetails.userId?.remainingSalary || 0} جنيه</p>
                </>
              ) : (
                <>
                  <p>الموظف: {currentDetails.userId?.username || 'غير محدد'}</p>
                  <p>سبب الخصم: {currentDetails.details || 'غير محدد'}</p>
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