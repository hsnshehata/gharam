import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import ReceiptPrint from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faDollarSign, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

function Bookings() {
  const [formData, setFormData] = useState({
    packageId: '', hennaPackageId: '', photographyPackageId: '', returnedServices: [],
    extraServices: [], hairStraightening: 'no', hairStraighteningPrice: 0,
    hairStraighteningDate: '', clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: 0
  });
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedPackageServices, setSelectedPackageServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchNamePhone, setSearchNamePhone] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const receiptRef = useRef(null); // للتحكم في طباعة الوصل

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
        const pkgRes = await axios.get('http://localhost:5000/api/packages/packages', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const srvRes = await axios.get('http://localhost:5000/api/packages/services', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const bookingsRes = await axios.get(`http://localhost:5000/api/bookings?page=${currentPage}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages(pkgRes.data);
        setServices(srvRes.data);
        setBookings(bookingsRes.data.bookings);
        setTotalPages(bookingsRes.data.pages);
      } catch (err) {
        setMessage('خطأ في جلب البيانات');
      }
    };
    fetchData();
  }, [currentPage]);

  useEffect(() => {
    const calculateSelectedPackageServices = async () => {
      const selectedIds = [formData.packageId, formData.hennaPackageId, formData.photographyPackageId].filter(id => id);
      if (selectedIds.length > 0) {
        try {
          const res = await axios.get('http://localhost:5000/api/packages/services', {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          });
          const filteredServices = res.data.filter(srv => selectedIds.includes(srv.packageId?._id.toString()));
          setSelectedPackageServices(filteredServices.map(srv => ({
            value: srv._id,
            label: `${srv.name} (${srv.packageId.name})`,
            price: srv.price
          })));
        } catch (err) {
          console.error(err);
        }
      } else {
        setSelectedPackageServices([]);
      }
    };
    calculateSelectedPackageServices();
  }, [formData.packageId, formData.hennaPackageId, formData.photographyPackageId]);

  useEffect(() => {
    const calculateTotal = () => {
      let tempTotal = 0;
      const selectedPkg = packages.find(pkg => pkg._id === formData.packageId);
      if (selectedPkg) tempTotal += selectedPkg.price;

      const hennaPkg = packages.find(pkg => pkg._id === formData.hennaPackageId);
      if (hennaPkg) tempTotal += hennaPkg.price;

      const photoPkg = packages.find(pkg => pkg._id === formData.photographyPackageId);
      if (photoPkg) tempTotal += photoPkg.price;

      formData.extraServices.forEach(id => {
        const srv = services.find(s => s._id === id.value);
        if (srv) tempTotal += srv.price;
      });

      formData.returnedServices.forEach(id => {
        const srv = selectedPackageServices.find(s => s.value === id.value);
        if (srv) tempTotal -= srv.price;
      });

      if (formData.hairStraightening === 'yes') tempTotal += parseFloat(formData.hairStraighteningPrice || 0);

      setTotal(tempTotal);
      setRemaining(tempTotal - formData.deposit);
    };
    calculateTotal();
  }, [formData, packages, services, selectedPackageServices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      returnedServices: formData.returnedServices.map(s => s.value),
      extraServices: formData.extraServices.map(s => s.value),
      hairStraightening: formData.hairStraightening === 'yes'
    };
    try {
      if (editItem) {
        const res = await axios.put(`http://localhost:5000/api/bookings/${editItem._id}`, submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setBookings(bookings.map(b => (b._id === editItem._id ? res.data.booking : b)));
        setMessage('تم تعديل الحجز بنجاح');
        setCurrentReceipt(res.data.booking);
        setShowReceiptModal(true);
      } else {
        const res = await axios.post('http://localhost:5000/api/bookings', submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setBookings([res.data.booking, ...bookings]);
        setMessage('تم إضافة الحجز بنجاح');
        setCurrentReceipt(res.data.booking);
        setShowReceiptModal(true);
      }
      setFormData({
        packageId: '', hennaPackageId: '', photographyPackageId: '', returnedServices: [],
        extraServices: [], hairStraightening: 'no', hairStraighteningPrice: 0,
        hairStraighteningDate: '', clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: 0
      });
      setEditItem(null);
      setShowCreateModal(false);
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الحجز');
    }
  };

  const handleEdit = (booking) => {
    setEditItem(booking);
    setFormData({
      packageId: booking.package._id,
      hennaPackageId: booking.hennaPackage?._id || '',
      photographyPackageId: booking.photographyPackage?._id || '',
      returnedServices: booking.returnedServices.map(srv => ({ value: srv._id, label: `${srv.name} (${srv.packageId.name})` })),
      extraServices: booking.extraServices.map(srv => ({ value: srv._id, label: srv.name })),
      hairStraightening: booking.hairStraightening ? 'yes' : 'no',
      hairStraighteningPrice: booking.hairStraighteningPrice,
      hairStraighteningDate: booking.hairStraighteningDate ? booking.hairStraighteningDate.split('T')[0] : '',
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      city: booking.city,
      eventDate: booking.eventDate.split('T')[0],
      hennaDate: booking.hennaDate ? booking.hennaDate.split('T')[0] : '',
      deposit: booking.deposit
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/bookings/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.filter(b => b._id !== deleteItem._id));
      setMessage('تم حذف الحجز بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handleAddInstallment = async (bookingId) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/bookings/${bookingId}/installment`, { amount: parseFloat(installmentAmount) }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(b => (b._id === bookingId ? res.data.booking : b)));
      setMessage('تم إضافة القسط بنجاح');
      setShowInstallmentModal(false);
      setInstallmentAmount(0);
    } catch (err) {
      setMessage('خطأ في إضافة القسط');
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // إعادة تحميل الصفحة لاستعادة المحتوى
  };

  const handleShowDetails = (booking) => {
    setCurrentDetails(booking);
    setShowDetailsModal(true);
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/bookings?search=${searchNamePhone}&date=${searchDate}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(res.data.bookings);
      setCurrentPage(1);
      setTotalPages(1);
    } catch (err) {
      setMessage('خطأ في البحث');
    }
  };

  return (
    <Container className="mt-5">
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            .receipt-content {
              width: 80mm;
              margin: 0 auto;
              padding: 10mm;
              font-size: 12px;
              text-align: center;
            }
          }
        `}
      </style>
      <h2>إدارة الحجوزات</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        <FontAwesomeIcon icon={faPlus} /> إنشاء حجز جديد
      </Button>
      <Row className="mt-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالاسم أو رقم الهاتف</Form.Label>
            <Form.Control
              type="text"
              value={searchNamePhone}
              onChange={(e) => setSearchNamePhone(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف"
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

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'تعديل حجز' : 'إنشاء حجز جديد'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} className="form-row">
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
                  {packages.map(pkg => (
                    <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>تاريخ المناسبة</Form.Label>
                <Form.Control
                  type="date"
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
                  {packages.filter(pkg => pkg.type === 'makeup').map(pkg => (
                    <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
            {formData.hennaPackageId && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label>تاريخ الحنة</Form.Label>
                  <Form.Control
                    type="date"
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
                  {packages.filter(pkg => pkg.type === 'photography').map(pkg => (
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
                  options={services.filter(srv => srv.type === 'instant').map(srv => ({ value: srv._id, label: srv.name, price: srv.price }))}
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
                    <Form.Control
                      type="date"
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
            <Col md={6}>
              <Form.Group>
                <Form.Label>العربون</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>الإجمالي: {total} جنيه</Form.Label>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>المتبقي: {remaining} جنيه</Form.Label>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Button type="submit" className="mt-3">{editItem ? 'تعديل' : 'حفظ'}</Button>
              <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                setFormData({
                  packageId: '', hennaPackageId: '', photographyPackageId: '', returnedServices: [],
                  extraServices: [], hairStraightening: 'no', hairStraighteningPrice: 0,
                  hairStraighteningDate: '', clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: 0
                });
                setEditItem(null);
                setShowCreateModal(false);
              }}>
                إلغاء
              </Button>
            </Col>
          </Form>
        </Modal.Body>
      </Modal>

      <h3>الحجوزات</h3>
      <Row>
        {bookings.map(booking => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{booking.clientName}</Card.Title>
                <Card.Text>
                  تاريخ المناسبة: {new Date(booking.eventDate).toLocaleDateString()}<br />
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
                <Button variant="danger" onClick={() => { setDeleteItem(booking); setShowDeleteModal(true); }}>
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstallmentModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => handleAddInstallment(deleteItem._id)}>حفظ</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="sm">
        <Modal.Header closeButton className="no-print">
          <Modal.Title>وصل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body ref={receiptRef} className="receipt-content">
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
              <p>تاريخ المناسبة: {new Date(currentDetails.eventDate).toLocaleDateString()}</p>
              {currentDetails.hennaDate && <p>تاريخ الحنة: {new Date(currentDetails.hennaDate).toLocaleDateString()}</p>}
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
                  <p>تاريخ فرد الشعر: {new Date(currentDetails.hairStraighteningDate).toLocaleDateString()}</p>
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
                        <th>الموظف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetails.installments.map((inst, index) => (
                        <tr key={index}>
                          <td>{inst.amount} جنيه</td>
                          <td>{new Date(inst.date).toLocaleDateString()}</td>
                          <td>{inst.employeeId?.username || 'غير معروف'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
              {currentDetails.updates.length > 0 && (
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
                          <td>{new Date(update.date).toLocaleDateString()}</td>
                          <td>
                            {update.changes.created
                              ? 'إنشاء الحجز'
                              : Object.keys(update.changes).length > 0
                              ? Object.entries(update.changes).map(([key, value]) => `${key}: ${value}`).join(', ')
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
    </Container>
  );
}

export default Bookings;