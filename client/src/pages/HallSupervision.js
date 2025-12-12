import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Row, Col, Card, Alert, Form, Button, Table, Spinner, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';

function HallSupervision() {
  const [bookings, setBookings] = useState({
    makeupBookings: [],
    hairStraighteningBookings: [],
    photographyBookings: []
  });
  const [instantServices, setInstantServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const qrCodeScanner = useRef(null);
  const { showToast } = useToast();

  const employeeOptions = useMemo(
    () => users.filter(u => u.role === 'employee' || u.role === 'hallSupervisor'),
    [users]
  );

  const normalizeId = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val._id) return val._id.toString();
    return val.toString();
  };

  const executedByName = (val) => {
    if (!val) return 'غير معروف';
    if (typeof val === 'object' && val.username) return val.username;
    return 'غير معروف';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, instantRes, usersRes] = await Promise.all([
        axios.get(`/api/today-work?date=${date}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get(`/api/instant-services?date=${date}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get('/api/users', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        })
      ]);
      setBookings(bookingsRes.data || { makeupBookings: [], hairStraighteningBookings: [], photographyBookings: [] });
      setInstantServices(instantRes.data.instantServices || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Load hall supervision error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في جلب بيانات اليوم', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (showQrModal) {
      qrCodeScanner.current = new Html5Qrcode('qr-reader');
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      qrCodeScanner.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleReceiptSearch(decodedText);
          qrCodeScanner.current.stop().catch((err) => console.error('Stop error:', err));
          setShowQrModal(false);
        },
        (error) => {
          if (!error.includes('NotFoundException')) {
            console.error('QR scan error:', error);
            showToast('خطأ في مسح الباركود: تأكد من إذن الكاميرا أو وضوح الباركود', 'danger');
          }
        }
      ).catch((err) => {
        console.error('Start error:', err);
        showToast('خطأ في تشغيل الكاميرا: تأكد من إذن الكاميرا', 'danger');
        setShowQrModal(false);
      });
    }

    return () => {
      if (qrCodeScanner.current) {
        try {
          qrCodeScanner.current.stop().catch((err) => console.error('Stop error:', err));
          qrCodeScanner.current = null;
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, [showQrModal]);

  const handleAssignChange = (key, value) => {
    setAssignments(prev => ({ ...prev, [key]: value }));
  };

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptNumber) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }
    await handleReceiptSearch(receiptNumber);
  };

  const handleOpenQrModal = () => {
    setShowQrModal(true);
  };

  const handleReceiptSearch = async (searchValue) => {
    try {
      const [bookingRes, instantRes] = await Promise.all([
        axios.get(`/api/bookings?receiptNumber=${searchValue}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get(`/api/instant-services?receiptNumber=${searchValue}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        })
      ]);

      if (bookingRes.data.bookings?.length > 0) {
        const booking = bookingRes.data.bookings[0];
        setSearchResult({ type: 'booking', data: booking });
        showToast('تم العثور على الحجز', 'success');
      } else if (instantRes.data.instantServices?.length > 0) {
        const instantService = instantRes.data.instantServices[0];
        setSearchResult({ type: 'instant', data: instantService });
        showToast('تم العثور على خدمة فورية', 'success');
      } else {
        setSearchResult(null);
        showToast('لم يتم العثور على حجز أو خدمة فورية بهذا الرقم', 'warning');
      }
    } catch (err) {
      console.error('Receipt search error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في البحث عن الوصل', 'danger');
    }
  };

  const updateBookingState = (updatedBooking) => {
    setBookings(prev => ({
      makeupBookings: prev.makeupBookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b)),
      hairStraighteningBookings: prev.hairStraighteningBookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b)),
      photographyBookings: prev.photographyBookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b))
    }));
  };

  const handleAssign = async (type, recordId, serviceId) => {
    const key = `${type}-${recordId}-${serviceId}`;
    const employeeId = assignments[key];
    if (!employeeId) {
      showToast('اختار موظف للتكليف أولاً', 'warning');
      return;
    }
    try {
      const endpoint = type === 'booking'
        ? `/api/bookings/execute-service/${recordId}/${serviceId}`
        : `/api/instant-services/execute-service/${recordId}/${serviceId}`;
      const res = await axios.post(endpoint, { employeeId }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });

      if (type === 'booking') {
        updateBookingState(res.data.booking);
      } else {
        setInstantServices(prev => prev.map(s => (s._id === recordId ? res.data.instantService : s)));
      }
      showToast('تم التكليف وتسجيل النقاط بنجاح', 'success');
    } catch (err) {
      console.error('Assign service error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في التكليف أو تسجيل النقاط', 'danger');
    }
  };

  const handleReset = async (type, recordId, serviceId) => {
    try {
      const endpoint = type === 'booking'
        ? `/api/bookings/reset-service/${recordId}/${serviceId}`
        : `/api/instant-services/reset-service/${recordId}/${serviceId}`;
      const res = await axios.post(endpoint, {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });

      if (type === 'booking') {
        updateBookingState(res.data.booking);
      } else {
        setInstantServices(prev => prev.map(s => (s._id === recordId ? res.data.instantService : s)));
      }
      showToast('تم سحب التكليف وإرجاع المهمة كغير منفذة', 'info');
    } catch (err) {
      console.error('Reset service error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في سحب التكليف', 'danger');
    }
  };

  const renderServiceRow = (booking, srv, index) => {
    const srvId = normalizeId(srv._id) || `srv-${index}`;
    const key = `booking-${normalizeId(booking._id)}-${srvId}`;
    return (
      <tr key={srvId}>
        <td>{srv.name || 'غير معروف'}</td>
        <td>{srv.price ? `${srv.price} ج` : 'غير متوفر'}</td>
        <td>
          {srv.executed ? (
            <Badge bg="success">تم بواسطة {executedByName(srv.executedBy)}</Badge>
          ) : (
            <Badge bg="secondary">لم يتم</Badge>
          )}
        </td>
        <td>
          <Form.Select
            value={assignments[key] || ''}
            onChange={(e) => handleAssignChange(key, e.target.value)}
            disabled={srv.executed}
          >
            <option value="">اختر الموظف</option>
            {employeeOptions.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.username}</option>
            ))}
          </Form.Select>
        </td>
        <td className="text-center d-flex gap-1 flex-wrap justify-content-center action-cell">
          {!srv.executed ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleAssign('booking', booking._id, srvId)}
              disabled={!assignments[key]}
            >
              تكليف
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => handleReset('booking', booking._id, srvId)}
            >
              سحب التكليف
            </Button>
          )}
        </td>
      </tr>
    );
  };

  const renderHairRow = (booking) => {
    const key = `booking-${normalizeId(booking._id)}-hairStraightening`;
    return (
      <tr key={`hair-${normalizeId(booking._id)}`}>
        <td>فرد الشعر</td>
        <td>{booking.hairStraighteningPrice || 0} ج</td>
        <td>
          {booking.hairStraighteningExecuted ? (
            <Badge bg="success">تم بواسطة {executedByName(booking.hairStraighteningExecutedBy)}</Badge>
          ) : (
            <Badge bg="secondary">لم يتم</Badge>
          )}
        </td>
        <td>
          <Form.Select
            value={assignments[key] || ''}
            onChange={(e) => handleAssignChange(key, e.target.value)}
            disabled={booking.hairStraighteningExecuted}
          >
            <option value="">اختر الموظف</option>
            {employeeOptions.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.username}</option>
            ))}
          </Form.Select>
        </td>
        <td className="text-center d-flex gap-1 flex-wrap justify-content-center action-cell">
          {!booking.hairStraighteningExecuted ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleAssign('booking', booking._id, 'hairStraightening')}
              disabled={!assignments[key]}
            >
              تكليف
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => handleReset('booking', booking._id, 'hairStraightening')}
            >
              سحب التكليف
            </Button>
          )}
        </td>
      </tr>
    );
  };

  const allBookings = [
    ...bookings.makeupBookings,
    ...bookings.hairStraighteningBookings,
    ...bookings.photographyBookings
  ];

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
        <div>
          <h2 className="mb-1">اشراف الصالة</h2>
          <p className="text-muted mb-0">كلف الموظفين بالحجوزات والخدمات الفورية وسجل النقاط لهم.</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Control
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="secondary" onClick={loadData}>تحديث</Button>
        </div>
      </div>

      <Row className="mb-3 g-2 align-items-end">
        <Col md={4} sm={12}>
          <Form.Group>
            <Form.Label>البحث برقم الوصل</Form.Label>
            <Form.Control
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="أدخل رقم الوصل"
            />
          </Form.Group>
        </Col>
        <Col md={4} sm={12}>
          <Button variant="primary" className="w-100" onClick={handleReceiptSubmit}>
            <FontAwesomeIcon icon={faSearch} className="me-2" /> بحث
          </Button>
        </Col>
        <Col md={4} sm={12}>
          <Button variant="outline-primary" className="w-100" onClick={handleOpenQrModal}>
            <FontAwesomeIcon icon={faQrcode} className="me-2" /> مسح الباركود
          </Button>
        </Col>
      </Row>
      {searchResult && (
        <Card className="mb-3">
          <Card.Body>
            <Card.Title>نتيجة البحث</Card.Title>
            {searchResult.type === 'booking' ? (
              <>
                <p>اسم العميل: {searchResult.data.clientName}</p>
                <p>رقم الوصل: {searchResult.data.receiptNumber}</p>
                <p>تاريخ المناسبة: {searchResult.data.eventDate ? new Date(searchResult.data.eventDate).toLocaleDateString() : 'غير متوفر'}</p>
                <Table striped bordered hover size="sm" responsive>
                  <thead>
                    <tr>
                      <th>الخدمة</th>
                      <th>السعر</th>
                      <th>الحالة</th>
                      <th>الموظف</th>
                      <th className="text-center action-cell">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.data.packageServices?.map((srv, idx) => renderServiceRow(searchResult.data, srv, idx))}
                    {renderHairRow(searchResult.data)}
                  </tbody>
                </Table>
              </>
            ) : (
              <>
                <p>رقم الوصل: {searchResult.data.receiptNumber}</p>
                <p>تاريخ الخدمة: {searchResult.data.createdAt ? new Date(searchResult.data.createdAt).toLocaleDateString() : 'غير متوفر'}</p>
                <Table striped bordered hover size="sm" responsive>
                  <thead>
                    <tr>
                      <th>الخدمة</th>
                      <th>السعر</th>
                      <th>الحالة</th>
                      <th>الموظف</th>
                      <th className="text-center action-cell">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.data.services?.map((srv, idx) => {
                      const srvId = normalizeId(srv._id) || `instant-${idx}`;
                      const key = `instant-${normalizeId(searchResult.data._id)}-${srvId}`;
                      return (
                        <tr key={srvId}>
                          <td>{srv.name || 'غير معروف'}</td>
                          <td>{srv.price ? `${srv.price} ج` : 'غير متوفر'}</td>
                          <td>
                            {srv.executed ? (
                              <Badge bg="success">تم بواسطة {executedByName(srv.executedBy)}</Badge>
                            ) : (
                              <Badge bg="secondary">لم يتم</Badge>
                            )}
                          </td>
                          <td>
                            <Form.Select
                              value={assignments[key] || ''}
                              onChange={(e) => handleAssignChange(key, e.target.value)}
                              disabled={srv.executed}
                            >
                              <option value="">اختر الموظف</option>
                              {employeeOptions.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.username}</option>
                              ))}
                            </Form.Select>
                          </td>
                          <td className="text-center d-flex gap-1 flex-wrap justify-content-center action-cell">
                            {!srv.executed ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAssign('instant', searchResult.data._id, srvId)}
                                disabled={!assignments[key]}
                              >
                                تكليف
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleReset('instant', searchResult.data._id, srvId)}
                              >
                                سحب التكليف
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" role="status" />
        </div>
      ) : (
        <>
          <h4 className="mt-2 mb-2">الحجوزات</h4>
          {allBookings.length === 0 ? (
            <Alert variant="info">لا توجد حجوزات في هذا اليوم</Alert>
          ) : (
            <Row>
              {allBookings.map((booking, idx) => (
                <Col md={6} key={booking._id} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Card.Title className="d-flex justify-content-between align-items-start">
                        <span>{idx + 1}. {booking.clientName}</span>
                        <span className="text-muted">رقم الوصل: {booking.receiptNumber}</span>
                      </Card.Title>
                      <Card.Text className="mb-2">
                        تاريخ المناسبة: {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'غير متوفر'}
                      </Card.Text>
                      <Table striped bordered hover size="sm" responsive>
                        <thead>
                          <tr>
                            <th>الخدمة</th>
                            <th>السعر</th>
                            <th>الحالة</th>
                            <th>الموظف</th>
                            <th className="text-center action-cell">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.packageServices?.map((srv, srvIdx) => renderServiceRow(booking, srv, srvIdx))}
                          {renderHairRow(booking)}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <h4 className="mt-4 mb-2">الخدمات الفورية</h4>
          {instantServices.length === 0 ? (
            <Alert variant="info">لا توجد خدمات فورية في هذا اليوم</Alert>
          ) : (
            <Row>
              {instantServices.map(service => (
                <Col md={6} key={service._id} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Card.Title className="d-flex justify-content-between align-items-start">
                        <span>رقم الوصل: {service.receiptNumber}</span>
                        <span className="text-muted">الإجمالي: {service.total} ج</span>
                      </Card.Title>
                      <Table striped bordered hover size="sm" responsive>
                        <thead>
                          <tr>
                            <th>الخدمة</th>
                            <th>السعر</th>
                            <th>الحالة</th>
                            <th>الموظف</th>
                            <th className="text-center action-cell">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {service.services?.map((srv, idx) => {
                            const srvId = normalizeId(srv._id) || `instant-${idx}`;
                            const key = `instant-${normalizeId(service._id)}-${srvId}`;
                            return (
                              <tr key={srvId}>
                                <td>{srv.name || 'غير معروف'}</td>
                                <td>{srv.price ? `${srv.price} ج` : 'غير متوفر'}</td>
                                <td>
                                  {srv.executed ? (
                                    <Badge bg="success">تم بواسطة {executedByName(srv.executedBy)}</Badge>
                                  ) : (
                                    <Badge bg="secondary">لم يتم</Badge>
                                  )}
                                </td>
                                <td>
                                  <Form.Select
                                    value={assignments[key] || ''}
                                    onChange={(e) => handleAssignChange(key, e.target.value)}
                                    disabled={srv.executed}
                                  >
                                    <option value="">اختر الموظف</option>
                                    {employeeOptions.map(emp => (
                                      <option key={emp._id} value={emp._id}>{emp.username}</option>
                                    ))}
                                  </Form.Select>
                                </td>
                                <td className="text-center d-flex gap-1 flex-wrap justify-content-center action-cell">
                                  {!srv.executed ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleAssign('instant', service._id, srvId)}
                                      disabled={!assignments[key]}
                                    >
                                      تكليف
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => handleReset('instant', service._id, srvId)}
                                    >
                                      سحب التكليف
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      <Modal show={showQrModal} onHide={() => setShowQrModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>مسح الباركود</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div id="qr-reader" style={{ width: '100%', height: '300px' }} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default HallSupervision;
