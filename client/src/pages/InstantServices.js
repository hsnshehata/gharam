import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import ReceiptPrint from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

function InstantServices({ user }) {
  const [formData, setFormData] = useState({ employeeId: '', services: [] });
  const [instantServices, setInstantServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchNameReceipt, setSearchNameReceipt] = useState('');

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
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#98ff98',
      color: '#000',
      borderRadius: '3px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#000',
      fontSize: '0.9rem',
      padding: '2px 4px'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      backgroundColor: '#98ff98',
      color: '#000',
      padding: '2px',
      ':hover': {
        backgroundColor: '#78cc78',
        color: '#000'
      }
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
      ':hover': {
        color: '#78cc78'
      }
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      backgroundColor: '#2a7a78',
      color: '#fff',
      ':hover': {
        color: '#78cc78'
      }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#98ff98'
    })
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const srvRes = await axios.get('http://localhost:5000/api/packages/services', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const usersRes = await axios.get('http://localhost:5000/api/users', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const instantRes = await axios.get(`http://localhost:5000/api/instant-services?page=${currentPage}&search=${searchNameReceipt}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Services response:', srvRes.data);
        console.log('Users response:', usersRes.data);
        console.log('Instant services response:', instantRes.data);
        setServices(srvRes.data);
        setUsers(usersRes.data);
        setInstantServices(instantRes.data.instantServices);
        setTotalPages(instantRes.data.pages);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        setMessage('خطأ في جلب البيانات');
      }
    };
    fetchData();
  }, [currentPage, searchNameReceipt]);

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
    const submitData = {
      employeeId: formData.employeeId || null,
      services: formData.services.map(s => s.value)
    };
    try {
      if (editItem) {
        const res = await axios.put(`http://localhost:5000/api/instant-services/${editItem._id}`, submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setInstantServices(instantServices.map(s => (s._id === editItem._id ? res.data.instantService : s)));
        setMessage('تم تعديل الخدمة الفورية بنجاح');
        setCurrentReceipt(res.data.instantService);
        setShowReceiptModal(true);
      } else {
        const res = await axios.post('http://localhost:5000/api/instant-services', submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setInstantServices([res.data.instantService, ...instantServices]);
        setMessage('تم إضافة الخدمة الفورية بنجاح');
        setCurrentReceipt(res.data.instantService);
        setShowReceiptModal(true);
      }
      setFormData({ employeeId: '', services: [] });
      setEditItem(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل الخدمة الفورية');
    }
  };

  const handleEdit = (service) => {
    console.log('Editing service:', service);
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
      await axios.delete(`http://localhost:5000/api/instant-services/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setInstantServices(instantServices.filter(s => s._id !== deleteItem._id));
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
    console.log('Printing service:', service);
    setCurrentReceipt(service);
    setShowReceiptModal(true);
  };

  const handleShowDetails = (service) => {
    console.log('Showing details for service:', service);
    setCurrentDetails(service);
    setShowDetailsModal(true);
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/instant-services?search=${searchNameReceipt}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      console.log('Search response:', res.data);
      setInstantServices(res.data.instantServices);
      setCurrentPage(1);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في البحث');
    }
  };

  return (
    <Container className="mt-5">
      <h2>إدارة الخدمات الفورية</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
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
              <Button type="submit" className="mt-3">{editItem ? 'تعديل' : 'حفظ'}</Button>
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

      <Pagination className="justify-content-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item
            key={i + 1}
            active={i + 1 === currentPage}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>

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
          <Button variant="primary" onClick={() => window.print()}>طباعة</Button>
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