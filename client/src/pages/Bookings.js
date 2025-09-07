import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import ReceiptPrint from './ReceiptPrint';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faEdit, faEye, faDollarSign, faTrash } from '@fortawesome/free-solid-svg-icons';
import debounce from 'lodash.debounce';

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
  const [searchNamePhone, setSearchNamePhone] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const receiptRef = useRef(null);

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
    })
  };

  // Debounced fetch function
  const debouncedFetchData = debounce(async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, packagesRes, servicesRes] = await Promise.all([
        axios.get(`/api/bookings?page=${currentPage}&namePhone=${encodeURIComponent(searchNamePhone)}&date=${searchDate}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get('/api/packages/packages', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get('/api/packages/services', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        })
      ]);
      setBookings(bookingsRes.data.bookings);
      setTotalPages(bookingsRes.data.totalPages);
      setPackages(packagesRes.data);
      setServices(servicesRes.data);
      setMessage('');
    } catch (err) {
      setMessage('خطأ في جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  }, 500);

  useEffect(() => {
    debouncedFetchData();
    return () => debouncedFetchData.cancel(); // Cleanup debounce on unmount
  }, [currentPage, searchNamePhone, searchDate]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setEditItem(null);
    try {
      const res = await axios.put(`/api/bookings/${editItem._id}`, formData, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(booking => (booking._id === editItem._id ? res.data.booking : booking)));
      setMessage('تم تعديل الحجز بنجاح');
      setFormData({
        packageId: '', hennaPackageId: '', photographyPackageId: '', returnedServices: [],
        extraServices: [], hairStraightening: 'no', hairStraighteningPrice: 0,
        hairStraighteningDate: '', clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: 0
      });
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في تعديل الحجز');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/bookings/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.filter(booking => booking._id !== deleteItem._id));
      setShowDeleteModal(false);
      setMessage('تم الحذف بنجاح');
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
    }
  };

  const handleShowDetails = (booking) => {
    setCurrentDetails(booking);
    setShowDetailsModal(true);
  };

  const handleInstallmentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowInstallmentModal(false);
    try {
      const res = await axios.post(`/api/bookings/${editItem._id}/installments`, { amount: installmentAmount }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(bookings.map(booking => (booking._id === editItem._id ? res.data.booking : booking)));
      setMessage('تم إضافة القسط بنجاح');
      setInstallmentAmount(0);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في إضافة القسط');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2>الحجوزات</h2>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>ابحث باسم العميل أو رقم الهاتف</Form.Label>
            <Form.Control
              type="text"
              value={searchNamePhone}
              onChange={(e) => setSearchNamePhone(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>ابحث بالتاريخ</Form.Label>
            <Form.Control
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
        </Col>
      </Row>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      {isLoading && <Alert variant="info">جاري جلب البيانات...</Alert>}
      <Row>
        {bookings.map(booking => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{booking.clientName}</Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  تاريخ المناسبة: {new Date(booking.eventDate).toLocaleDateString()}<br />
                  الإجمالي: {booking.total} جنيه<br />
                  العربون: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => setCurrentReceipt(booking) || setShowReceiptModal(true)} disabled={isLoading}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleShowDetails(booking)} disabled={isLoading}>
                  <FontAwesomeIcon icon={faEye} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => { setEditItem(booking); setFormData({ ...booking }); }} disabled={isLoading}>
                  <FontAwesomeIcon icon={faEdit} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => { setEditItem(booking); setShowInstallmentModal(true); }} disabled={isLoading}>
                  <FontAwesomeIcon icon={faDollarSign} />
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem(booking); setShowDeleteModal(true); }} disabled={isLoading}>
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
      <Modal show={editItem} onHide={() => setEditItem(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تعديل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم العميل</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>رقم الهاتف</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>المدينة</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ المناسبة</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>باكدج الميك اب</Form.Label>
                  <Select
                    options={packages.filter(pkg => pkg.type === 'makeup').map(pkg => ({ value: pkg._id, label: pkg.name }))}
                    value={packages.find(pkg => pkg._id === formData.packageId) ? { value: formData.packageId, label: packages.find(pkg => pkg._id === formData.packageId).name } : null}
                    onChange={(selected) => setFormData({ ...formData, packageId: selected ? selected.value : '' })}
                    styles={customStyles}
                    placeholder="اختر الباكدج"
                    isClearable
                    isDisabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>باكدج الحنة</Form.Label>
                  <Select
                    options={packages.filter(pkg => pkg.type === 'henna').map(pkg => ({ value: pkg._id, label: pkg.name }))}
                    value={packages.find(pkg => pkg._id === formData.hennaPackageId) ? { value: formData.hennaPackageId, label: packages.find(pkg => pkg._id === formData.hennaPackageId).name } : null}
                    onChange={(selected) => setFormData({ ...formData, hennaPackageId: selected ? selected.value : '' })}
                    styles={customStyles}
                    placeholder="اختر الباكدج"
                    isClearable
                    isDisabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>باكدج التصوير</Form.Label>
                  <Select
                    options={packages.filter(pkg => pkg.type === 'photography').map(pkg => ({ value: pkg._id, label: pkg.name }))}
                    value={packages.find(pkg => pkg._id === formData.photographyPackageId) ? { value: formData.photographyPackageId, label: packages.find(pkg => pkg._id === formData.photographyPackageId).name } : null}
                    onChange={(selected) => setFormData({ ...formData, photographyPackageId: selected ? selected.value : '' })}
                    styles={customStyles}
                    placeholder="اختر الباكدج"
                    isClearable
                    isDisabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ الحنة</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.hennaDate}
                    onChange={(e) => setFormData({ ...formData, hennaDate: e.target.value })}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>فرد شعر</Form.Label>
                  <Form.Control
                    as="select"
                    value={formData.hairStraightening}
                    onChange={(e) => setFormData({ ...formData, hairStraightening: e.target.value })}
                    disabled={isLoading}
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {formData.hairStraightening === 'yes' && (
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>سعر فرد الشعر</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.hairStraighteningPrice}
                        onChange={(e) => setFormData({ ...formData, hairStraighteningPrice: e.target.value })}
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>تاريخ فرد الشعر</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.hairStraighteningDate}
                        onChange={(e) => setFormData({ ...formData, hairStraighteningDate: e.target.value })}
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>الخدمات الإضافية</Form.Label>
                  <Select
                    isMulti
                    options={services.filter(srv => srv.type === 'instant').map(srv => ({ value: srv._id, label: srv.name }))}
                    value={formData.extraServices.map(srv => ({ value: srv._id, label: srv.name }))}
                    onChange={(selected) => setFormData({ ...formData, extraServices: selected ? selected.map(s => ({ _id: s.value, name: s.label })) : [] })}
                    styles={customStyles}
                    placeholder="اختر الخدمات"
                    isDisabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>الخدمات المرتجعة</Form.Label>
                  <Select
                    isMulti
                    options={selectedPackageServices.map(srv => ({ value: srv._id, label: srv.name }))}
                    value={formData.returnedServices.map(srv => ({ value: srv._id, label: srv.name }))}
                    onChange={(selected) => setFormData({ ...formData, returnedServices: selected ? selected.map(s => ({ _id: s.value, name: s.label })) : [] })}
                    styles={customStyles}
                    placeholder="اختر الخدمات"
                    isDisabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>العربون</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <p>الإجمالي: {total} جنيه</p>
                <p>المتبقي: {remaining} جنيه</p>
              </Col>
              <Col md={12}>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'جاري التعديل...' : 'تعديل'}
                </Button>
                <Button variant="secondary" className="ms-2" onClick={() => setEditItem(null)} disabled={isLoading}>
                  إلغاء
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showInstallmentModal} onHide={() => setShowInstallmentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>إضافة قسط</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleInstallmentSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>المبلغ</Form.Label>
              <Form.Control
                type="number"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
                required
                disabled={isLoading}
              />
            </Form.Group>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => setShowInstallmentModal(false)} disabled={isLoading}>
              إلغاء
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>وصل الحجز</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ReceiptPrint data={currentReceipt} type="booking" ref={receiptRef} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => window.print()} disabled={isLoading}>
            طباعة
          </Button>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)} disabled={isLoading}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف الحجز؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isLoading}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isLoading}>
            حذف
          </Button>
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
              <p>المدينة: {currentDetails.city}</p>
              <p>تاريخ المناسبة: {new Date(currentDetails.eventDate).toLocaleDateString()}</p>
              {currentDetails.hennaDate && (
                <p>تاريخ الحنة: {new Date(currentDetails.hennaDate).toLocaleDateString()}</p>
              )}
              {currentDetails.package && (
                <p>باكدج الميك اب: {currentDetails.package.name}</p>
              )}
              {currentDetails.hennaPackage && (
                <p>باكدج الحنة: {currentDetails.hennaPackage.name}</p>
              )}
              {currentDetails.photographyPackage && (
                <p>باكدج التصوير: {currentDetails.photographyPackage.name}</p>
              )}
              {currentDetails.returnedServices.length > 0 && (
                <p>الخدمات المرتجعة: {currentDetails.returnedServices.map(srv => srv.name).join(', ')}</p>
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
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)} disabled={isLoading}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Bookings;
