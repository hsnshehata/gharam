import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Container, Row, Col, Card, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import ReceiptPrint, { printReceiptElement } from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../components/ToastProvider';

function InstantServices({ user }) {
  const [formData, setFormData] = useState({ employeeId: '', services: [] });
  const [total, setTotal] = useState(0);
  const { showToast } = useToast();
  const setMessage = useCallback((msg) => {
    if (!msg) return;
    const text = msg.toString();
    const variant = text.includes('خطأ') ? 'danger' : text.includes('مطلوب') ? 'warning' : 'success';
    showToast(msg, variant);
  }, [showToast]);
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchNameReceipt, setSearchNameReceipt] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const tokenHeader = useMemo(() => ({ headers: { 'x-auth-token': localStorage.getItem('token') } }), []);

  const { data: servicesData, error: servicesError } = useSWR(
    '/api/packages/services',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 300000 }
  );

  const { data: usersData, error: usersError } = useSWR(
    '/api/users',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 300000 }
  );

  const listKey = useMemo(
    () => `/api/instant-services?page=${currentPage}&search=${encodeURIComponent(searchNameReceipt)}`,
    [currentPage, searchNameReceipt]
  );

  const { data: instantData, error: instantError, mutate: mutateInstant } = useSWR(
    listKey,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { revalidateOnFocus: true }
  );

  const services = useMemo(() => servicesData || [], [servicesData]);
  const users = usersData || [];
  const instantServices = instantData?.instantServices || [];
  const totalPages = instantData?.pages || 1;

  useEffect(() => {
    if (servicesError || usersError || instantError) {
      setMessage('خطأ في جلب البيانات');
    }
  }, [servicesError, usersError, instantError, setMessage]);

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
      textAlign: 'right'
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      borderRadius: '3px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'var(--text)',
      fontSize: '0.9rem',
      padding: '2px 4px'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      padding: '2px',
      ':hover': {
        backgroundColor: 'var(--border)',
        color: 'var(--text)'
      }
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
      ':hover': {
        color: 'var(--muted)'
      }
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      ':hover': {
        color: 'var(--muted)'
      }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--border)'
    })
  };

  useEffect(() => {
    const calculateTotal = () => {
      let tempTotal = 0;
      formData.services.forEach(id => {
        const srv = services.find(s => s._id === id.value);
        if (srv) tempTotal += srv.price;
      });
      setTotal(tempTotal);
    };
    calculateTotal();
  }, [formData.services, services]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.services.length) {
      setMessage('الرجاء اختيار خدمة واحدة على الأقل');
      return;
    }
    if (submitLoading) return;
    const submitData = {
      employeeId: formData.employeeId || null,
      services: formData.services.map(s => s.value)
    };
    setSubmitLoading(true);
    setShowCreateModal(false);
    try {
      if (editItem) {
        const res = await axios.put(`/api/instant-services/${editItem._id}`, submitData, tokenHeader);
        await mutateInstant();
        setMessage('تم تعديل الخدمة الفورية بنجاح');
        setCurrentReceipt(res.data.instantService);
        setShowReceiptModal(true);
      } else {
        const res = await axios.post('/api/instant-services', submitData, tokenHeader);
        setCurrentPage(1);
        await mutateInstant();
        setMessage('تم إضافة الخدمة الفورية بنجاح');
        setCurrentReceipt(res.data.instantService);
        setShowReceiptModal(true);
      }
      setFormData({ employeeId: '', services: [] });
      setEditItem(null);
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل الخدمة الفورية');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditItem(service);
    setFormData({
      employeeId: service.employeeId?._id || '',
      services: service.services.map((srv, index) => ({
        value: srv._id ? srv._id.toString() : `service-${index}`,
        label: srv.name || 'غير معروف'
      }))
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/instant-services/${deleteItem._id}`, tokenHeader);
      await mutateInstant();
      setMessage('تم حذف الخدمة الفورية بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handlePrint = (service) => {
    setCurrentReceipt(service);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    let visible = null;
    const modal = document.querySelector('.modal.show');
    if (modal) {
      const list = modal.querySelectorAll('.receipt-content');
      if (list.length) visible = list[list.length - 1];
    }
    if (!visible) visible = document.querySelector('.receipt-content');
    if (!visible) return;

    printReceiptElement(visible);
  };

  const handleShowDetails = (service) => {
    setCurrentDetails(service);
    setShowDetailsModal(true);
  };

  const handleSearch = async () => {
    setCurrentPage(1);
    await mutateInstant();
  };

  const renderPagination = () => {
    const maxButtons = 7;
    const pages = [];
    const pushPage = (page) => pages.push({ type: 'page', page });

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pushPage(i);
    } else {
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      pushPage(1);
      if (start > 2) pages.push({ type: 'ellipsis', key: 'start' });

      for (let i = start; i <= end; i++) pushPage(i);

      if (end < totalPages - 1) pages.push({ type: 'ellipsis', key: 'end' });
      pushPage(totalPages);
    }

    return (
      <Pagination className="justify-content-center mt-4 flex-wrap">
        <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} />
        {pages.map((item, idx) => {
          if (item.type === 'ellipsis') return <Pagination.Ellipsis key={`ellipsis-${item.key}-${idx}`} disabled />;
          return (
            <Pagination.Item
              key={item.page}
              active={item.page === currentPage}
              onClick={() => setCurrentPage(item.page)}
            >
              {item.page}
            </Pagination.Item>
          );
        })}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} />
      </Pagination>
    );
  };

  return (
    <Container className="mt-5">
      <h2>إدارة الخدمات الفورية</h2>
      {/* التنبيهات أصبحت عبر التوست */}
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        <FontAwesomeIcon icon={faPlus} /> شغل جديد
      </Button>
      <Row className="mt-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالاسم أو رقم الوصل</Form.Label>
            <Form.Control
              type="text"
              value={searchNameReceipt}
              onChange={(e) => setSearchNameReceipt(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الوصل"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>
      </Row>
      <Button variant="primary" onClick={handleSearch} className="mt-2">بحث</Button>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'تعديل خدمة فورية' : 'إنشاء خدمة فورية'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} className="form-row">
            <Col md={6}>
              <Form.Group>
                <Form.Label>اسم الموظف (اختياري)</Form.Label>
                <Form.Control
                  as="select"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">لا يوجد</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>الخدمات</Form.Label>
                <Select
                  isMulti
                  options={services.filter(srv => srv.type === 'instant').map(srv => ({
                    value: srv._id,
                    label: srv.name
                  }))}
                  value={formData.services}
                  onChange={(selected) => setFormData({ ...formData, services: selected })}
                  isSearchable
                  placeholder="اختر الخدمات..."
                  className="booking-services-select"
                  classNamePrefix="booking-services"
                  styles={customStyles}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>الإجمالي: {total} جنيه</Form.Label>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Button type="submit" className="mt-3" disabled={submitLoading}>
                {submitLoading ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
              </Button>
              <Button
                variant="secondary"
                className="mt-3 ms-2"
                onClick={() => {
                  setFormData({ employeeId: '', services: [] });
                  setEditItem(null);
                  setShowCreateModal(false);
                }}
              >
                إلغاء
              </Button>
            </Col>
          </Form>
        </Modal.Body>
      </Modal>

      <h3>الخدمات الفورية</h3>
      <Row>
        {instantServices.map(service => {
          const executedService = service.services.find(srv => srv.executed && srv.executedBy);
          const displayName = executedService ? executedService.executedBy.username : 'غير محدد';
          return (
            <Col md={4} key={service._id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{displayName}</Card.Title>
                  <Card.Text>
                    رقم الوصل: {service.receiptNumber}<br />
                    الخدمات: {service.services.map(srv => srv.name).join(', ') || 'غير محدد'}<br />
                    الإجمالي: {service.total} جنيه<br />
                    تاريخ: {new Date(service.createdAt).toLocaleDateString()}
                  </Card.Text>
                  <Button variant="primary" className="me-2" onClick={() => handlePrint(service)}>
                    <FontAwesomeIcon icon={faPrint} />
                  </Button>
                  <Button variant="primary" className="me-2" onClick={() => handleEdit(service)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </Button>
                  <Button variant="primary" className="me-2" onClick={() => handleShowDetails(service)}>
                    <FontAwesomeIcon icon={faEye} />
                  </Button>
                  <Button variant="danger" onClick={() => { setDeleteItem(service); setShowDeleteModal(true); }}>
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {renderPagination()}

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف الخدمة الفورية؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete}>حذف</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>وصل الخدمة الفورية</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ReceiptPrint data={currentReceipt} type="instant" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handlePrintReceipt}>طباعة</Button>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>إغلاق</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل الخدمة الفورية</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentDetails && (
            <div>
              <p>رقم الوصل: {currentDetails.receiptNumber}</p>
              <p>تاريخ الخدمة: {new Date(currentDetails.createdAt).toLocaleDateString()}</p>
              <p>الموظف: {currentDetails.services.find(srv => srv.executed && srv.executedBy) ? currentDetails.services.find(srv => srv.executed && srv.executedBy).executedBy.username : 'غير محدد'}</p>
              <h5>الخدمات:</h5>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>اسم الخدمة</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDetails.services.map((srv, index) => (
                    <tr key={srv._id ? srv._id.toString() : `service-${index}`}>
                      <td>{srv.name || 'غير معروف'}</td>
                      <td>{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                      <td>
                        {srv.executed ? (
                          `نفذت بواسطة ${srv.executedBy?.username || 'غير معروف'}`
                        ) : (
                          'لم يتم التنفيذ'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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

export default InstantServices;
