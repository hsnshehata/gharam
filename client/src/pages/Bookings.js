import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Container, Row, Col, Card, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import ReceiptPrint, { printReceiptElement } from './ReceiptPrint';
import DateInput from '../components/DateInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faDollarSign, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../components/ToastProvider';


const formatDate = (dateString) => {
  if (!dateString) return 'غير متوفر';
  const d = new Date(dateString);
  if (isNaN(d)) return 'غير متوفر';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return day + '/' + month + '/' + year;
};
function Bookings({ user }) {
  const [formData, setFormData] = useState({
    packageId: '', hennaPackageId: '', photographyPackageId: '', returnedServices: [],
    extraServices: [], customExtraServices: [], hairStraightening: 'no', hairStraighteningPrice: 0,
    hairStraighteningDate: '', hairDye: 'no', hairDyePrice: 0, hairDyeDate: '',
    clientName: '', clientPhone: '', city: '', notes: '', eventDate: '', hennaDate: '', deposit: 0
  });
  const [customBookingServiceName, setCustomBookingServiceName] = useState('');
  const [customBookingServicePrice, setCustomBookingServicePrice] = useState('');
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedPackageServices, setSelectedPackageServices] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { showToast } = useToast();
  const setMessage = useCallback((msg) => {
    if (!msg) return;
    const text = msg.toString();
    const variant = text.includes('خطأ') ? 'danger' : text.includes('مطلوب') ? 'warning' : 'success';
    showToast(msg, variant);
  }, [showToast]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [installmentPaymentMethod, setInstallmentPaymentMethod] = useState('cash');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditInstallmentModal, setShowEditInstallmentModal] = useState(false);
  const [editInstallmentData, setEditInstallmentData] = useState({ id: '', bookingId: '', amount: 0, paymentMethod: 'cash' });
  const [isEditInstallmentSubmitting, setIsEditInstallmentSubmitting] = useState(false);
  
  const [searchNamePhone, setSearchNamePhone] = useState(''); // اسم/هاتف/وصل
  const [searchDate, setSearchDate] = useState('');
  const receiptRef = useRef(null); // للتحكم في طباعة الوصل
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [installmentSubmitting, setInstallmentSubmitting] = useState(false);

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
      ':hover': { backgroundColor: 'var(--border)', color: 'var(--text)' }
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

  const tokenHeader = useRef({ headers: { 'x-auth-token': localStorage.getItem('token') } });

  const { data: packagesData, mutate: mutatePackages } = useSWR(
    '/api/packages/packages',
    (url) => axios.get(url, tokenHeader.current).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const { data: servicesData, mutate: mutateServices } = useSWR(
    '/api/packages/services',
    (url) => axios.get(url, tokenHeader.current).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const trimmedQuery = searchNamePhone.trim();
  const isReceiptSearch = /^\d+$/.test(trimmedQuery) && trimmedQuery.length > 0;
  const queryParam = trimmedQuery
    ? isReceiptSearch
      ? `receiptNumber=${encodeURIComponent(trimmedQuery)}`
      : `search=${encodeURIComponent(trimmedQuery)}`
    : '';
  const bookingsKey = `/api/bookings?page=${currentPage}${queryParam ? `&${queryParam}` : ''}${searchDate ? `&date=${searchDate}` : ''}`;
  const { data: bookingsData, error: bookingsError, mutate: mutateBookings } = useSWR(
    bookingsKey,
    (url) => axios.get(url, tokenHeader.current).then(res => res.data),
    { dedupingInterval: 60000, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (packagesData) setPackages(packagesData);
  }, [packagesData]);

  useEffect(() => {
    if (servicesData) setServices(servicesData);
  }, [servicesData]);

  useEffect(() => {
    if (bookingsData) {
      setBookings(bookingsData.bookings || []);
      setTotalPages(bookingsData.pages || 1);
    }
  }, [bookingsData]);

  useEffect(() => {
    if (bookingsError) setMessage('خطأ في جلب البيانات');
  }, [bookingsError, setMessage]);

  const revalidateAll = useCallback(() => {
    mutateBookings();
    mutatePackages();
    mutateServices();
  }, [mutateBookings, mutatePackages, mutateServices]);

  useEffect(() => {
    // compute selected package services from already-loaded `services` state
    const selectedIds = [formData.packageId, formData.hennaPackageId, formData.photographyPackageId].filter(id => id);
    if (selectedIds.length > 0 && services && services.length) {
      const filteredServices = services.filter(srv => srv.packageId?._id && selectedIds.includes(srv.packageId._id.toString()));
      setSelectedPackageServices(filteredServices.map(srv => ({
        value: srv._id,
        label: `${srv.name} (${srv.packageId.name})`,
        price: srv.price
      })));
    } else {
      setSelectedPackageServices([]);
    }
  }, [formData.packageId, formData.hennaPackageId, formData.photographyPackageId, services]);

  // total/remaining calculation removed — these values are computed where needed

  // create/edit handlers removed from this page per requirements

  // edit handler removed — editing via modal removed from this page

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/bookings/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.filter(b => b._id !== deleteItem._id));
      setMessage('تم حذف الحجز بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
      revalidateAll();
    } catch (err) {
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handleEdit = (booking) => {
    setEditItem(booking);
    setFormData({
      packageId: booking.package?._id || '',
      hennaPackageId: booking.hennaPackage?._id || '',
      photographyPackageId: booking.photographyPackage?._id || '',
      returnedServices: booking.returnedServices?.map(srv => ({ value: srv._id, label: `${srv.name} (${srv.packageId?.name})` })) || [],
      extraServices: booking.extraServices?.map(srv => ({ value: srv._id, label: srv.name })) || [],
      customExtraServices: booking.customExtraServices || [],
      hairStraightening: booking.hairStraightening ? 'yes' : 'no',
      hairStraighteningPrice: booking.hairStraighteningPrice || 0,
      hairStraighteningDate: booking.hairStraighteningDate ? booking.hairStraighteningDate.split('T')[0] : '',
      hairDye: booking.hairDye ? 'yes' : 'no',
      hairDyePrice: booking.hairDyePrice || 0,
      hairDyeDate: booking.hairDyeDate ? booking.hairDyeDate.split('T')[0] : '',
      clientName: booking.clientName || '',
      clientPhone: booking.clientPhone || '',
      city: booking.city || '',
      notes: booking.notes || '',
      eventDate: booking.eventDate ? booking.eventDate.split('T')[0] : '',
      hennaDate: booking.hennaDate ? booking.hennaDate.split('T')[0] : '',
      deposit: booking.deposit || 0
    });
    setShowEditModal(true);
  };

  const handleAddCustomBookingService = () => {
    if (!customBookingServiceName.trim() || !customBookingServicePrice) {
      setMessage('الرجاء إدخال اسم وسعر الخدمة الخاصة', 'warning');
      return;
    }
    const newCustomService = {
      _id: `custom-${Date.now()}`,
      name: customBookingServiceName,
      price: Number(customBookingServicePrice)
    };
    setFormData(prev => ({
      ...prev,
      customExtraServices: [...(prev.customExtraServices || []), newCustomService]
    }));
    setCustomBookingServiceName('');
    setCustomBookingServicePrice('');
  };

  const handleRemoveCustomBookingService = (idToRemove) => {
    setFormData(prev => ({
      ...prev,
      customExtraServices: (prev.customExtraServices || []).filter(s => s._id !== idToRemove)
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem || editSubmitting) return;
    setEditSubmitting(true);
    setShowEditModal(false);
    // Clean any partial date values before submitting
    const cleanDate = (v) => (v && v.startsWith('__partial__')) ? '' : v;
    const submitData = {
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      city: formData.city,
      notes: formData.notes,
      eventDate: cleanDate(formData.eventDate),
      hennaDate: cleanDate(formData.hennaDate),
      deposit: parseFloat(formData.deposit) || 0,
      packageId: formData.packageId,
      hennaPackageId: formData.hennaPackageId,
      photographyPackageId: formData.photographyPackageId,
      extraServices: formData.extraServices.map(s => s.value),
      returnedServices: formData.returnedServices.map(s => s.value),
      customExtraServices: formData.customExtraServices,
      hairStraightening: formData.hairStraightening === 'yes',
      hairStraighteningPrice: parseFloat(formData.hairStraighteningPrice) || 0,
      hairStraighteningDate: cleanDate(formData.hairStraighteningDate) || '',
      hairDye: formData.hairDye === 'yes',
      hairDyePrice: parseFloat(formData.hairDyePrice) || 0,
      hairDyeDate: cleanDate(formData.hairDyeDate) || ''
    };
    try {
      const res = await axios.put(`/api/bookings/${editItem._id}`, submitData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(b => (b._id === editItem._id ? res.data.booking : b)));
      setMessage('تم تعديل الحجز بنجاح');
      setEditItem(null);
      revalidateAll();
    } catch (err) {
      setMessage('خطأ في تعديل الحجز');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddInstallment = async (bookingId) => {
    if (installmentSubmitting) return;
    setInstallmentSubmitting(true);
    setShowInstallmentModal(false);
    try {
      const res = await axios.post(`/api/bookings/${bookingId}/installment`, { 
        amount: parseFloat(installmentAmount),
        paymentMethod: installmentPaymentMethod
      }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(b => (b._id === bookingId ? res.data.booking : b)));
      setMessage('تم إضافة القسط بنجاح');
      setInstallmentAmount(0);
      setInstallmentPaymentMethod('cash');
      revalidateAll();
    } catch (err) {
      setMessage('خطأ في إضافة القسط');
    } finally {
      setInstallmentSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const target = receiptRef.current.querySelector('.receipt-content') || receiptRef.current;
    printReceiptElement(target);
  };

  const handleShowDetails = (booking) => {
    setCurrentDetails(booking);
    setShowDetailsModal(true);
  };

  const handleSearch = async () => {
    setCurrentPage(1);
    revalidateAll();
  };

  const handleDeleteInstallment = async (bookingId, installmentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسط؟')) return;
    try {
      const res = await axios.delete(`/api/bookings/${bookingId}/installment/${installmentId}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(b => (b._id === bookingId ? res.data.booking : b)));
      if (currentDetails && currentDetails._id === bookingId) setCurrentDetails(res.data.booking);
      setMessage('تم حذف القسط بنجاح');
      revalidateAll();
    } catch (err) {
      setMessage('خطأ في حذف القسط');
    }
  };

  const handleOpenEditInstallment = (bookingId, inst) => {
    setEditInstallmentData({ id: inst._id, bookingId, amount: inst.amount, paymentMethod: inst.paymentMethod || 'cash' });
    setShowEditInstallmentModal(true);
  };

  const handleUpdateInstallment = async () => {
    setIsEditInstallmentSubmitting(true);
    try {
      const res = await axios.put(`/api/bookings/${editInstallmentData.bookingId}/installment/${editInstallmentData.id}`, {
        amount: parseFloat(editInstallmentData.amount),
        paymentMethod: editInstallmentData.paymentMethod
      }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(b => (b._id === editInstallmentData.bookingId ? res.data.booking : b)));
      if (currentDetails && currentDetails._id === editInstallmentData.bookingId) setCurrentDetails(res.data.booking);
      setMessage('تم تعديل القسط بنجاح');
      setShowEditInstallmentModal(false);
      revalidateAll();
    } catch (err) {
      setMessage('خطأ في تعديل القسط');
    } finally {
      setIsEditInstallmentSubmitting(false);
    }
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
      <style>{``}</style>
      <h2>إدارة الحجوزات</h2>
      {/* التنبيهات أصبحت عبر التوست */}
      {/* إنشاء حجز جديد أزيل من صفحة الإدارة */}
      <Row className="mt-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالاسم أو رقم الهاتف أو رقم الوصل</Form.Label>
            <Form.Control
              type="text"
              value={searchNamePhone}
              onChange={(e) => setSearchNamePhone(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو رقم الوصل"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالتاريخ</Form.Label>
            <Form.Control
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      <Button variant="primary" onClick={handleSearch} className="mt-2">بحث</Button>

      <h3>الحجوزات</h3>
      <Row>
        {bookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName}
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  تاريخ المناسبة: {formatDate(booking.eventDate)}<br />
                  العربون: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => {
                  setCurrentReceipt(booking);
                  setShowReceiptModal(true);
                }}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(booking)}>
                  <FontAwesomeIcon icon={faEdit} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleShowDetails(booking)}>
                  <FontAwesomeIcon icon={faEye} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => { setDeleteItem(booking); setShowInstallmentModal(true); }}>
                  <FontAwesomeIcon icon={faDollarSign} />
                </Button>
                {user?.role === 'admin' && (
                  <Button variant="danger" className="me-2" onClick={() => { setDeleteItem(booking); setShowDeleteModal(true); }}>
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {renderPagination()}

      {/* Edit booking modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditItem(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تعديل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit} className="form-row">
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>نوع الباكدج</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.packageId}
                    onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                    required
                  >
                    <option value="">اختر باكدج</option>
                    {packages.filter(pkg => (pkg.isActive !== false && (!pkg.expiresAt || new Date(pkg.expiresAt) > new Date())) || formData.packageId === pkg._id).map(pkg => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>تاريخ المناسبة</Form.Label>
                  <DateInput
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>باكدج حنة (اختياري)</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.hennaPackageId}
                    onChange={(e) => setFormData({ ...formData, hennaPackageId: e.target.value })}
                  >
                    <option value="">لا يوجد</option>
                    {packages.filter(pkg => pkg.type === 'makeup' && ((pkg.isActive !== false && (!pkg.expiresAt || new Date(pkg.expiresAt) > new Date())) || formData.hennaPackageId === pkg._id)).map(pkg => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              {formData.hennaPackageId && (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>تاريخ الحنة</Form.Label>
                    <DateInput
                      value={formData.hennaDate}
                      onChange={(e) => setFormData({ ...formData, hennaDate: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>باكدج تصوير (اختياري)</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.photographyPackageId}
                    onChange={(e) => setFormData({ ...formData, photographyPackageId: e.target.value })}
                  >
                    <option value="">لا يوجد</option>
                    {packages.filter(pkg => pkg.type === 'photography' && ((pkg.isActive !== false && (!pkg.expiresAt || new Date(pkg.expiresAt) > new Date())) || formData.photographyPackageId === pkg._id)).map(pkg => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>مرتجع من الباكدجات (اختياري)</Form.Label>
                  <Select
                    isMulti
                    options={selectedPackageServices}
                    value={formData.returnedServices}
                    onChange={(selected) => setFormData({ ...formData, returnedServices: selected })}
                    isSearchable
                    placeholder="اختر الخدمات..."
                    className="booking-services-select"
                    classNamePrefix="booking-services"
                    styles={customStyles}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>خدمات إضافية (اختياري)</Form.Label>
                  <Select
                    isMulti
                    options={services.filter(srv => srv.type === 'instant' && ((srv.isActive !== false && (!srv.expiresAt || new Date(srv.expiresAt) > new Date())) || formData.extraServices.some(s => s.value === srv._id))).map(srv => ({ value: srv._id, label: srv.name, price: srv.price }))}
                    value={formData.extraServices}
                    onChange={(selected) => setFormData({ ...formData, extraServices: selected })}
                    isSearchable
                    placeholder="اختر الخدمات..."
                    className="booking-services-select"
                    classNamePrefix="booking-services"
                    styles={customStyles}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <div className="border p-3 rounded mb-3" style={{ borderColor: 'var(--border)' }}>
                  <h6 className="mb-3">إدخال حر (خدمة خاصة للإضافة على الحجز)</h6>
                  <Row className="g-2 align-items-end">
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label>اسم الخدمة المخصصة</Form.Label>
                        <Form.Control
                          type="text"
                          value={customBookingServiceName}
                          onChange={(e) => setCustomBookingServiceName(e.target.value)}
                          placeholder="مثال: تركيب أظافر"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>السعر</Form.Label>
                        <Form.Control
                          type="number"
                          value={customBookingServicePrice}
                          onChange={(e) => setCustomBookingServicePrice(e.target.value)}
                          placeholder="0"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Button variant="outline-success" className="w-100" onClick={handleAddCustomBookingService}>
                        إضافة الخدمة
                      </Button>
                    </Col>
                  </Row>
                  {formData.customExtraServices && formData.customExtraServices.length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-secondary" style={{ fontSize: '0.9rem' }}>الخدمات الخاصة المضافة:</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {formData.customExtraServices.map(srv => (
                          <div key={srv._id} className="d-inline-flex align-items-center bg-light border rounded px-2 py-1" style={{ fontSize: '0.9rem' }}>
                            <span className="me-2">{srv.name} ({srv.price} ج)</span>
                            <Button variant="link" className="text-danger p-0 ms-2 text-decoration-none shadow-none" onClick={() => handleRemoveCustomBookingService(srv._id)}>×</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>فرد شعر</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.hairStraightening}
                    onChange={(e) => setFormData({ ...formData, hairStraightening: e.target.value })}
                    className="custom-select"
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {formData.hairStraightening === 'yes' && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>سعر فرد الشعر</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.hairStraighteningPrice}
                        onChange={(e) => setFormData({ ...formData, hairStraighteningPrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>تاريخ فرد الشعر</Form.Label>
                      <DateInput
                        value={formData.hairStraighteningDate}
                        onChange={(e) => setFormData({ ...formData, hairStraighteningDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>خدمات الشعر - صبغة</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.hairDye}
                    onChange={(e) => setFormData({ ...formData, hairDye: e.target.value })}
                    className="custom-select"
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {formData.hairDye === 'yes' && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>سعر الصبغة</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.hairDyePrice}
                        onChange={(e) => setFormData({ ...formData, hairDyePrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>تاريخ الصبغة</Form.Label>
                      <DateInput
                        value={formData.hairDyeDate}
                        onChange={(e) => setFormData({ ...formData, hairDyeDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>اسم العميل</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>رقم الهاتف</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>المدينة</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>ملاحظات</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أمثلة: شرط غرام هي اللي تعمل الميك أب..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>العربون</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    disabled={!!editItem}
                    readOnly={!!editItem}
                  />
                </Form.Group>
              </Col>
              {editItem?.installments?.length > 0 && (
                <Col md={12}>
                  <h6 className="mt-3">الأقساط المدفوعة (عرض فقط)</h6>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>الموظف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItem.installments.map((inst, index) => (
                        <tr key={index}>
                          <td>{inst.amount} جنيه</td>
                          <td>{formatDate(inst.date)}</td>
                          <td>{inst.employeeId?.username || 'غير معروف'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>
              )}
              <Col md={12} className="mt-3">
                <Button type="submit" className="me-2" disabled={editSubmitting}>
                  {editSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditItem(null); }}>إلغاء</Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف الحجز؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete}>حذف</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInstallmentModal} onHide={() => setShowInstallmentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>إضافة قسط</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>قيمة القسط</Form.Label>
            <Form.Control
              type="number"
              value={installmentAmount}
              onChange={(e) => setInstallmentAmount(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mt-2">
            <Form.Label>طريقة الدفع</Form.Label>
            <Form.Select
              value={installmentPaymentMethod}
              onChange={(e) => setInstallmentPaymentMethod(e.target.value)}
            >
              <option value="cash">كاش</option>
              <option value="vodafone">فودافون كاش</option>
              <option value="visa">فيزا</option>
              <option value="instapay">إنستاباي</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstallmentModal(false)}>إلغاء</Button>
          <Button variant="primary" disabled={installmentSubmitting || !installmentAmount} onClick={() => handleAddInstallment(deleteItem._id)}>
            {installmentSubmitting ? 'جارٍ الإضافة...' : 'حفظ'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="sm">
        <Modal.Header closeButton className="no-print">
          <Modal.Title>وصل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body ref={receiptRef}>
          <ReceiptPrint data={currentReceipt} type="booking" />
        </Modal.Body>
        <Modal.Footer className="no-print">
          <Button variant="primary" onClick={handlePrint}>طباعة</Button>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>إغلاق</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentDetails && (
            <div>
              <p>اسم العميل: {currentDetails.clientName}</p>
              <p>رقم الهاتف: {currentDetails.clientPhone}</p>
              <p>المدينة: {currentDetails.city || 'غير متوفر'}</p>
              {currentDetails.notes && <p><strong>ملاحظات:</strong> {currentDetails.notes}</p>}
              <p>تاريخ المناسبة: {formatDate(currentDetails.eventDate)}</p>
              {currentDetails.hennaDate && <p>تاريخ الحنة: {formatDate(currentDetails.hennaDate)}</p>}
              <p>الباكدج: {currentDetails.package.name}</p>
              {currentDetails.hennaPackage && <p>باكدج حنة: {currentDetails.hennaPackage.name}</p>}
              {currentDetails.photographyPackage && <p>باكدج تصوير: {currentDetails.photographyPackage.name}</p>}
              {currentDetails.returnedServices.length > 0 && (
                <p>المرتجع: {currentDetails.returnedServices.map(srv => srv.name).join(', ')}</p>
              )}
              {currentDetails.extraServices.length > 0 && (
                <p>الخدمات الإضافية: {currentDetails.extraServices.map(srv => srv.name).join(', ')}</p>
              )}
              {currentDetails.hairStraightening && (
                <>
                  <p>فرد شعر: نعم</p>
                  <p>سعر فرد الشعر: {currentDetails.hairStraighteningPrice} جنيه</p>
                  <p>تاريخ فرد الشعر: {formatDate(currentDetails.hairStraighteningDate)}</p>
                </>
              )}
              {currentDetails.hairDye && (
                <>
                  <p>صبغة شعر: نعم</p>
                  <p>سعر الصبغة: {currentDetails.hairDyePrice} جنيه</p>
                  <p>تاريخ الصبغة: {currentDetails.hairDyeDate ? formatDate(currentDetails.hairDyeDate) : 'غير متوفر'}</p>
                </>
              )}
              <p>الإجمالي: {currentDetails.total} جنيه</p>
              <p>العربون: {currentDetails.deposit} جنيه</p>
              <p>المتبقي: {currentDetails.remaining} جنيه</p>
              {currentDetails.installments.length > 0 && (
                <>
                  <h5 className="mt-3">عمليات الأقساط</h5>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>طريقة الدفع</th>
                        <th>الموظف</th>
                        {user?.role === 'admin' && <th>إجراءات</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetails.installments.map((inst, index) => (
                        <tr key={index}>
                          <td>{inst.amount} جنيه</td>
                          <td>{formatDate(inst.date)}</td>
                          <td>{inst.paymentMethod || 'كاش'}</td>
                          <td>{inst.employeeId?.username || 'غير معروف'}</td>
                          {user?.role === 'admin' && (
                            <td>
                              <Button variant="info" size="sm" className="me-2" onClick={() => handleOpenEditInstallment(currentDetails._id, inst)}>
                                <FontAwesomeIcon icon={faEdit} />
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteInstallment(currentDetails._id, inst._id)}>
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
              {Array.isArray(currentDetails.updates) && currentDetails.updates.length > 0 && (
                <>
                  <h5 className="mt-3">سجل التعديلات</h5>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>التغييرات</th>
                        <th>الموظف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetails.updates.map((update, index) => (
                        <tr key={index}>
                          <td>{formatDate(update.date)}</td>
                          <td>
                              {update?.changes?.created
                                ? 'إنشاء الحجز'
                                : update?.changes && Object.keys(update.changes || {}).length > 0
                                ? Object.entries(update.changes || {}).map(([key, value]) => `${key}: ${value}`).join(', ')
                                : 'غير معروف'}
                          </td>
                          <td>{update.employeeId?.username || 'غير معروف'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>إغلاق</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditInstallmentModal} onHide={() => setShowEditInstallmentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تعديل قسط</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>المبلغ</Form.Label>
            <Form.Control
              type="number"
              value={editInstallmentData.amount}
              onChange={(e) => setEditInstallmentData({ ...editInstallmentData, amount: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mt-2">
            <Form.Label>طريقة الدفع</Form.Label>
            <Form.Select
              value={editInstallmentData.paymentMethod}
              onChange={(e) => setEditInstallmentData({ ...editInstallmentData, paymentMethod: e.target.value })}
            >
              <option value="cash">كاش</option>
              <option value="vodafone">فودافون كاش</option>
              <option value="visa">فيزا</option>
              <option value="instapay">إنستاباي</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditInstallmentModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleUpdateInstallment} disabled={isEditInstallmentSubmitting}>
            {isEditInstallmentSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Bookings;
