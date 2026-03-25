import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Container, Row, Col, Card, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import ReceiptPrint, { printReceiptElement } from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEye, faTrash, faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { useToast } from '../components/ToastProvider';

function InstantServices({ user }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchNameReceipt, setSearchNameReceipt] = useState('');
  const { showToast } = useToast();
  const setMessage = useCallback((msg, variant = 'success') => {
    showToast(msg, variant);
  }, [showToast]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [instantServiceFormData, setInstantServiceFormData] = useState({ services: [], customServices: [], paymentMethod: 'cash' });
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const tokenHeader = useMemo(() => ({ headers: { 'x-auth-token': localStorage.getItem('token') } }), []);

  const { data: servicesData } = useSWR(
    '/api/packages/services',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const reactSelectStyles = {
    control: (provided) => ({ ...provided, backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }),
    menu: (provided) => ({ ...provided, backgroundColor: 'var(--surface)', zIndex: 9999 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isFocused ? 'var(--border)' : 'var(--bg)', color: 'var(--text)' }),
    singleValue: (provided) => ({ ...provided, color: 'var(--text)' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: 'var(--surface)' }),
    multiValueLabel: (provided) => ({ ...provided, color: 'var(--text)' })
  };

  const listKey = useMemo(
    () => `/api/instant-services?page=${currentPage}&search=${encodeURIComponent(searchNameReceipt)}`,
    [currentPage, searchNameReceipt]
  );

  const { data: instantData, error: instantError, mutate: mutateInstant } = useSWR(
    listKey,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { revalidateOnFocus: true }
  );

  const instantServices = instantData?.instantServices || [];
  const totalPages = instantData?.pages || 1;

  useEffect(() => {
    if (instantError) {
      setMessage('خطأ في جلب البيانات', 'danger');
    }
  }, [instantError, setMessage]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/instant-services/${deleteItem._id}`, tokenHeader);
      await mutateInstant();
      setMessage('تم حذف الخدمة الفورية بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في الحذف', 'danger');
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

  const handleEditClick = (service) => {
    setEditItem(service);
    const mappedServices = service.services.filter(s => !s.isCustom).map(s => ({ value: s._id, label: s.name, price: s.price }));
    const customSrvs = service.services.filter(s => s.isCustom).map(s => ({ _id: s._id, name: s.name, price: s.price }));
    setInstantServiceFormData({
      employeeId: service.employeeId?._id || service.employeeId,
      services: mappedServices,
      customServices: customSrvs,
      paymentMethod: service.paymentMethod || 'cash'
    });
    setShowEditModal(true);
  };

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) return setMessage('اسم وسعر الخدمة مطلوبة', 'warning');
    const newSrv = { _id: `temp-${Date.now()}`, name: customServiceName, price: Number(customServicePrice) };
    setInstantServiceFormData(prev => ({ ...prev, customServices: [...prev.customServices, newSrv] }));
    setCustomServiceName('');
    setCustomServicePrice('');
  };

  const handleRemoveCustomService = (idToRemove) => {
    setInstantServiceFormData(prev => ({ ...prev, customServices: prev.customServices.filter(s => s._id !== idToRemove) }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!instantServiceFormData.services.length && !instantServiceFormData.customServices.length) {
      return setMessage('يجب اختيار خدمة واحدة على الأقل', 'warning');
    }
    setEditSubmitting(true);
    try {
      const payload = {
        employeeId: instantServiceFormData.employeeId,
        services: instantServiceFormData.services.map(s => s.value),
        customServices: instantServiceFormData.customServices,
        paymentMethod: instantServiceFormData.paymentMethod
      };
      await axios.put(`/api/instant-services/${editItem._id}`, payload, tokenHeader);
      setMessage('تم تعديل الخدمة الفورية بنجاح');
      setShowEditModal(false);
      setEditItem(null);
      mutateInstant();
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في التعديل', 'danger');
    } finally {
      setEditSubmitting(false);
    }
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

      <h3 className="mt-4">الخدمات الفورية</h3>
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
                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={() => handlePrint(service)}>
                      <FontAwesomeIcon icon={faPrint} />
                    </Button>
                    <Button variant="primary" onClick={() => handleShowDetails(service)}>
                      <FontAwesomeIcon icon={faEye} />
                    </Button>
                    {user?.role === 'admin' && (
                      <>
                        <Button variant="primary" onClick={() => handleEditClick(service)}>
                          <FontAwesomeIcon icon={faEdit} />
                        </Button>
                        <Button variant="danger" onClick={() => { setDeleteItem(service); setShowDeleteModal(true); }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </>
                    )}
                  </div>
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
              <p>الموظف: {currentDetails.employeeId?.username || 'غير محدد'}</p>
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
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>إغلاق          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تعديل الخدمة الفورية ({editItem?.receiptNumber})</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>الخدمات المتاحة</Form.Label>
              <Select
                isMulti
                options={(servicesData || []).map(s => ({ value: s._id, label: s.name, price: s.price }))}
                value={instantServiceFormData.services}
                onChange={(selected) => setInstantServiceFormData({ ...instantServiceFormData, services: selected || [] })}
                placeholder="اختر الخدمات..."
                styles={reactSelectStyles}
                noOptionsMessage={() => 'لا توجد خدمات مطابقة'}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>إضافة خدمة خاصة (غير مسجلة بالقائمة)</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="اسم الخدمة"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                />
                <Form.Control
                  type="number"
                  placeholder="السعر"
                  value={customServicePrice}
                  onChange={(e) => setCustomServicePrice(e.target.value)}
                />
                <Button variant="secondary" onClick={handleAddCustomService}>
                  <FontAwesomeIcon icon={faPlus} />
                </Button>
              </div>
            </Form.Group>

            {instantServiceFormData.customServices.length > 0 && (
              <div className="mb-3">
                <Form.Label>الخدمات الخاصة المضافة:</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {instantServiceFormData.customServices.map((srv) => (
                    <div key={srv._id} className="badge bg-secondary p-2 d-flex align-items-center gap-2">
                      {srv.name} ({srv.price} جنيه)
                      <FontAwesomeIcon
                        icon={faTrash}
                        style={{ cursor: 'pointer', color: '#ffb3b3' }}
                        onClick={() => handleRemoveCustomService(srv._id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>طريقة الدفع</Form.Label>
              <Form.Select
                value={instantServiceFormData.paymentMethod}
                onChange={(e) => setInstantServiceFormData({ ...instantServiceFormData, paymentMethod: e.target.value })}
              >
                <option value="cash">كاش</option>
                <option value="vodafone">فودافون كاش</option>
                <option value="visa">فيزا</option>
                <option value="instapay">انستاباي</option>
              </Form.Select>
            </Form.Group>
            
            <p className="fw-bold fs-5 mt-3">
              الإجمالي التقريبي للتعديل: {
                instantServiceFormData.services.reduce((a, b) => a + (b.price || 0), 0) + 
                instantServiceFormData.customServices.reduce((a, b) => a + (b.price || 0), 0)
              } جنيه
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>إلغاء</Button>
            <Button variant="primary" type="submit" disabled={editSubmitting}>حفظ التعديلات</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
}

export default InstantServices;
