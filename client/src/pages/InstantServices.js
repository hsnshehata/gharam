import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import Select from 'react-select';
import ReceiptPrint, { printReceiptElement } from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';

const PAGE_SIZE = 9;

function InstantServices({ user }) {
  const [formData, setFormData] = useState({ employeeId: '', services: [] });
  const [instantServices, setInstantServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
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
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchNameReceipt, setSearchNameReceipt] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const { collections, queueOperation } = useRxdb() || {};

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

  // تحميل البيانات محلياً من RxDB مع فلترة وباجينج
  useEffect(() => {
    if (!collections?.services || !collections?.users || !collections?.instantServices) return;

    const svcSub = collections.services
      .find({ selector: { _deleted: { $ne: true }, type: 'instant' } })
      .$.subscribe((docs) => setServices(docs.map((d) => d.toJSON())));

    const usrSub = collections.users
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => setUsers(docs.map((d) => d.toJSON())));

    const instSub = collections.instantServices
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => {
        const all = docs.map((d) => d.toJSON());
        const filtered = all.filter((item) => {
          const q = searchNameReceipt.trim();
          if (!q) return true;
          const hasText = (item.receiptNumber || '').includes(q) || (item.services || []).some((s) => (s.name || '').includes(q));
          return hasText;
        });
        const sorted = filtered.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
        const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
        const current = Math.min(currentPage, pages);
        const start = (current - 1) * PAGE_SIZE;
        const pageItems = sorted.slice(start, start + PAGE_SIZE);
        setTotalPages(pages);
        setCurrentPage(current);
        setInstantServices(pageItems);
      });

    return () => {
      svcSub?.unsubscribe();
      usrSub?.unsubscribe();
      instSub?.unsubscribe();
    };
  }, [collections, currentPage, searchNameReceipt]);

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

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `inst-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const upsertLocal = async (doc, op = 'update') => {
    if (!collections?.instantServices) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await collections.instantServices.upsert(withTs);
    if (queueOperation) await queueOperation('instantServices', op, withTs);
    return withTs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.services.length) {
      setMessage('الرجاء اختيار خدمة واحدة على الأقل');
      return;
    }
    if (submitLoading) return;

    const selectedServices = formData.services.map((s) => s.value);
    const resolvedServices = selectedServices.map((id) => {
      const srv = services.find((s) => s._id === id);
      return srv
        ? { _id: srv._id, name: srv.name, price: srv.price, executed: false, executedBy: null, executedAt: null }
        : { _id: id, name: 'خدمة', price: 0, executed: false };
    });
    const totalPrice = resolvedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    setSubmitLoading(true);
    setShowCreateModal(false);
    try {
      if (editItem) {
        const updated = {
          ...editItem,
          employeeId: formData.employeeId || null,
          services: resolvedServices,
          total: totalPrice
        };
        const saved = await upsertLocal(updated, 'update');
        setCurrentReceipt(saved);
        setMessage('تم تعديل الخدمة الفورية محلياً وسيتم رفعها عند الاتصال');
      } else {
        const newDoc = {
          _id: newId(),
          employeeId: formData.employeeId || null,
          services: resolvedServices,
          total: totalPrice,
          createdAt: new Date().toISOString(),
          receiptNumber: '',
          barcode: ''
        };
        const saved = await upsertLocal(newDoc, 'insert');
        setCurrentReceipt(saved);
        setMessage('تم إضافة الخدمة الفورية محلياً وسيتم رفعها عند الاتصال');
      }
      setShowReceiptModal(true);
      setFormData({ employeeId: '', services: [] });
      setEditItem(null);
    } catch (err) {
      console.error('Submit error:', err);
      setMessage('خطأ في إضافة/تعديل الخدمة الفورية');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditItem(service);
    setFormData({
      employeeId: service.employeeId?._id || service.employeeId || '',
      services: service.services.map((srv, index) => ({
        value: srv._id ? srv._id.toString() : `service-${index}`,
        label: srv.name || 'غير معروف'
      }))
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    try {
      if (!deleteItem) return;
      await upsertLocal({ ...deleteItem, _deleted: true }, 'delete');
      setMessage('تم حذف الخدمة الفورية محلياً وسيتم رفعها عند الاتصال');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err);
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handlePrint = (service) => {
    console.log('Printing service:', service);
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
    console.log('Showing details for service:', service);
    setCurrentDetails(service);
    setShowDetailsModal(true);
  };

  const handleSearch = () => {
    setCurrentPage(1);
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