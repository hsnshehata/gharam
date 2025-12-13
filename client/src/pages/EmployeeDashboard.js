import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faCheck, faQrcode, faGift, faCoins, faBolt } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';

const COIN_COLORS = {
  1: '#c0c7d1', // فضي
  2: '#d4af37', // ذهبي
  3: '#e74c3c', // أحمر
  4: '#27ae60', // أخضر
  5: '#2980b9', // أزرق
  6: '#8e44ad', // أرجواني
  default: '#2c3e50'
};

function EmployeeDashboard({ user }) {
  const [bookings, setBookings] = useState({
    makeupBookings: [],
    hairStraighteningBookings: [],
    photographyBookings: []
  });
  const [instantServices, setInstantServices] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsData, setPointsData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [redeemCount, setRedeemCount] = useState(1);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertCelebration, setConvertCelebration] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const qrCodeScanner = useRef(null);
  const { showToast } = useToast();

  const fetchPointsSummary = useCallback(async () => {
    const pointsRes = await axios.get(`/api/users/points/summary`, {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    setPointsSummary(pointsRes.data);
  }, []);

  const formatNumber = useCallback((num = 0) => new Intl.NumberFormat('en-US').format(Math.max(0, num)), []);

  const getTopCoinLevel = useCallback((byLevel = {}) => {
    const levels = Object.keys(byLevel || {})
      .map(Number)
      .filter((lvl) => !Number.isNaN(lvl) && byLevel[lvl] > 0);
    if (levels.length === 0) return 1;
    return Math.max(...levels);
  }, []);

  const getCoinColor = useCallback((level) => COIN_COLORS[level] || COIN_COLORS.default, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, instantRes] = await Promise.all([
          axios.get(`/api/today-work?date=${date}`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          }),
          axios.get(`/api/instant-services?date=${date}`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          })
        ]);
        await fetchPointsSummary();
        setBookings(bookingsRes.data || { makeupBookings: [], hairStraighteningBookings: [], photographyBookings: [] });
        setInstantServices(instantRes.data.instantServices || []);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        showToast('خطأ في جلب البيانات', 'danger');
      }
    };
    fetchData();
  }, [date, showToast, fetchPointsSummary]);

  const handleReceiptSearch = useCallback(async (searchValue) => {
    try {
      console.log('Searching for receipt:', searchValue);
      const [bookingRes, instantRes] = await Promise.all([
        axios.get(`/api/bookings?receiptNumber=${searchValue}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        }),
        axios.get(`/api/instant-services?receiptNumber=${searchValue}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        })
      ]);

      if (bookingRes.data.bookings.length > 0) {
        const booking = bookingRes.data.bookings[0];
        console.log('Found booking:', booking);
        setPointsData({ type: 'booking', data: booking });
        setShowPointsModal(true);
      } else if (instantRes.data.instantServices.length > 0) {
        const instantService = instantRes.data.instantServices[0];
        console.log('Found instant service:', instantService);
        setPointsData({ type: 'instant', data: instantService });
        setShowPointsModal(true);
      } else {
        showToast('لم يتم العثور على حجز أو خدمة فورية بهذا الرقم', 'warning');
      }
    } catch (err) {
      console.error('Receipt search error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في البحث عن الوصل', 'danger');
    }
  }, [showToast]);

  useEffect(() => {
    if (showQrModal) {
      qrCodeScanner.current = new Html5Qrcode("qr-reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      qrCodeScanner.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleReceiptSearch(decodedText);
          qrCodeScanner.current.stop().catch((err) => console.error('Stop error:', err));
          setShowQrModal(false);
        },
        (error) => {
          if (!error.includes('NotFoundException')) {
            // Ignore transient decode errors to avoid noisy toasts while scanning
            console.warn('QR scan warning:', error);
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
  }, [showQrModal, handleReceiptSearch, showToast]);

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptNumber) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }
    await handleReceiptSearch(receiptNumber);
  };

  const handleConvertPoints = async () => {
    if (!pointsSummary || (pointsSummary.convertiblePoints || 0) < 1000) {
      showToast('لا توجد نقاط كافية للتحويل', 'warning');
      return;
    }
    try {
      setConverting(true);
      const res = await axios.post('/api/users/convert-points', {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(`تم تحويل ${res.data.mintedCoins} عملة جديدة`, 'success');
      setConvertCelebration(true);
      setTimeout(() => setConvertCelebration(false), 1200);
      await fetchPointsSummary();
    } catch (err) {
      console.error('Convert error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'تعذر تحويل النقاط الآن', 'danger');
    } finally {
      setConverting(false);
    }
  };

  const handleRedeemCoins = async () => {
    if (!redeemCount || redeemCount <= 0) {
      showToast('اختار عدد العملات للاستبدال', 'warning');
      return;
    }
    if (redeemCount > coinsCount) {
      showToast('عدد العملات المطلوب أكبر من المتاح', 'warning');
      return;
    }
    try {
      setRedeeming(true);
      const res = await axios.post('/api/users/redeem-coins', { count: redeemCount }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(`تم استبدال ${res.data.redeemedCoins} عملة بقيمة ${res.data.totalValue} جنيه`, 'success');
      await fetchPointsSummary();
      setShowRedeemModal(false);
    } catch (err) {
      console.error('Redeem error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'تعذر استبدال العملات', 'danger');
    } finally {
      setRedeeming(false);
    }
  };

  const handleExecuteService = async (serviceId, type, recordId) => {
    const employeeId = user?._id || user?.id;
    if (!employeeId) {
      showToast('حساب الموظف غير محدد، سجل دخول تاني وحاول', 'danger');
      return;
    }
    try {
      console.log('Executing service:', { serviceId, type, recordId, employeeId });
      const endpoint = type === 'booking' 
        ? `/api/bookings/execute-service/${recordId}/${serviceId}`
        : `/api/instant-services/execute-service/${recordId}/${serviceId}`;
      const res = await axios.post(endpoint, { employeeId }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      console.log('Execute service response:', res.data);
      showToast(`تم تنفيذ الخدمة بنجاح وإضافة ${res.data.points} نقطة`, 'success');

      if (type === 'booking') {
        setPointsData(prev => ({
          ...prev,
          data: res.data.booking
        }));
        setBookings(prev => ({
          makeupBookings: prev.makeupBookings.map(b => (b._id === recordId ? res.data.booking : b)),
          hairStraighteningBookings: prev.hairStraighteningBookings.map(b => (b._id === recordId ? res.data.booking : b)),
          photographyBookings: prev.photographyBookings.map(b => (b._id === recordId ? res.data.booking : b))
        }));
      } else {
        setPointsData(prev => ({
          ...prev,
          data: res.data.instantService
        }));
        setInstantServices(prev => prev.map(s => (s._id === recordId ? res.data.instantService : s)));
      }

      await fetchPointsSummary();
    } catch (err) {
      console.error('Execute service error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في تنفيذ الخدمة', 'danger');
    }
  };

  const handleShowDetails = (item, type) => {
    console.log('Showing details:', { item, type });
    setPointsData({ type, data: item });
    setShowPointsModal(true);
  };

  const handleOpenQrModal = () => {
    setShowQrModal(true);
  };

  const coinsCount = pointsSummary?.coins?.totalCount || 0;
  const topCoinLevel = getTopCoinLevel(pointsSummary?.coins?.byLevel || {});
  const topCoinColor = getCoinColor(topCoinLevel);
  const convertiblePoints = pointsSummary?.convertiblePoints || 0;
  const canConvert = convertiblePoints >= 1000;

  return (
    <Container className="mt-5">
      <h2>لوحة الموظف</h2>
      <Row className="mb-3">
        <Col md={12}>
          <Button variant="primary" onClick={handleOpenQrModal} className="mb-3">
            <FontAwesomeIcon icon={faQrcode} /> مسح الباركود
          </Button>
          <Form onSubmit={handleReceiptSubmit}>
            <Form.Group>
              <Form.Label>إدخال رقم الوصل</Form.Label>
              <Form.Control
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="أدخل رقم الوصل"
              />
            </Form.Group>
            <Button type="submit" className="mt-3">بحث</Button>
          </Form>
        </Col>
      </Row>

      <Card className="mb-4 points-card">
        <Card.Body>
          <Card.Title>لوحة المكافآت</Card.Title>
          {pointsSummary ? (
            <>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 points-top">
                <div className="coin-chip">
                  <div
                    className="coin-illustration"
                    style={{ background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(255,255,255,0.1)), linear-gradient(135deg, ${topCoinColor}, ${topCoinColor}aa)` }}
                  >
                    <span className="coin-glow" />
                    <span className="coin-level">L{topCoinLevel}</span>
                  </div>
                  <div className="coin-meta">
                    <div className="coin-title">أعلى عملة وصلت لها</div>
                    <div className="coin-count-text">
                      <FontAwesomeIcon icon={faCoins} className="me-2" />
                      {coinsCount}
                    </div>
                    <div className="coin-desc">اللون يعكس مستوى العملة الحالي</div>
                  </div>
                </div>

                <div className="level-progress-wrap">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="text-muted small">المستوى الحالي</span>
                    <span className="level-badge">L{pointsSummary.level}</span>
                  </div>
                  <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pointsSummary.progress?.percent || 0}>
                    <div
                      className="progress-bar"
                      style={{ width: `${pointsSummary.progress?.percent || 0}%` }}
                    />
                  </div>
                  <div className="small text-muted mt-1">
                    متبقي: {Math.max(0, (pointsSummary.progress?.target || 0) - (pointsSummary.progress?.current || 0))} نقطة للوصول للمستوى التالي
                  </div>
                </div>

                {coinsCount > 0 && (
                  <Button variant="outline-success" className="gift-btn" onClick={() => { setRedeemCount(1); setShowRedeemModal(true); }}>
                    <FontAwesomeIcon icon={faGift} className="me-2" /> استبدال العملات
                  </Button>
                )}
              </div>

              <div className="counter-block mt-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div className="small text-muted">عداد النقاط القابلة للتحويل</div>
                    <div className={`points-counter ${convertCelebration ? 'burst' : ''}`}>
                      {formatNumber(convertiblePoints)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="small text-muted">قيمة العملة الحالية</div>
                    <div className="fw-bold">{formatNumber(pointsSummary.currentCoinValue)} جنيه</div>
                  </div>
                </div>

                {canConvert ? (
                  <Button
                    className={`convert-btn mt-2 ${convertCelebration ? 'celebrate' : ''}`}
                    onClick={handleConvertPoints}
                    disabled={converting}
                  >
                    <FontAwesomeIcon icon={faBolt} className="me-2" />
                    حوّل كل 1000 نقطة إلى عملة
                  </Button>
                ) : (
                  <div className="text-muted small mt-2">اجمع {formatNumber(Math.max(0, 1000 - convertiblePoints))} نقطة إضافية علشان تحوّل أول عملة</div>
                )}
              </div>
            </>
          ) : (
            <div>جارٍ التحميل...</div>
          )}
        </Card.Body>
      </Card>

      <h3>حجوزات الميك آب</h3>
      {bookings.makeupBookings.length === 0 && <Alert variant="info">لا توجد حجوزات ميك آب لهذا اليوم</Alert>}
      <Row>
        {bookings.makeupBookings.map(booking => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  {booking.clientName} ({new Date(booking.eventDate).toDateString() === new Date(date).toDateString() ? 'زفاف/شبكة' : 'حنة'})
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه<br />
                  رقم الوصل: {booking.receiptNumber}
                </Card.Text>
                <Button variant="primary" onClick={() => handleShowDetails(booking, 'booking')}>
                  <FontAwesomeIcon icon={faEye} /> عرض التفاصيل
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h3>حجوزات فرد الشعر</h3>
      {bookings.hairStraighteningBookings.length === 0 && <Alert variant="info">لا توجد حجوزات فرد شعر لهذا اليوم</Alert>}
      <Row>
        {bookings.hairStraighteningBookings.map(booking => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  {booking.clientName}
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه<br />
                  رقم الوصل: {booking.receiptNumber}
                </Card.Text>
                <Button variant="primary" onClick={() => handleShowDetails(booking, 'booking')}>
                  <FontAwesomeIcon icon={faEye} /> عرض التفاصيل
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h3>حجوزات التصوير</h3>
      {bookings.photographyBookings.length === 0 && <Alert variant="info">لا توجد حجوزات تصوير لهذا اليوم</Alert>}
      <Row>
        {bookings.photographyBookings.map(booking => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  {booking.clientName} ({new Date(booking.eventDate).toDateString() === new Date(date).toDateString() ? 'زفاف/شبكة' : 'حنة'})
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه<br />
                  رقم الوصل: {booking.receiptNumber}
                </Card.Text>
                <Button variant="primary" onClick={() => handleShowDetails(booking, 'booking')}>
                  <FontAwesomeIcon icon={faEye} /> عرض التفاصيل
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h3>الخدمات الفورية</h3>
      {instantServices.length === 0 && <Alert variant="info">لا توجد خدمات فورية لهذا اليوم</Alert>}
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
                    الخدمات: {service.services.map(srv => srv.name || 'غير معروف').join(', ') || 'غير محدد'}<br />
                    الإجمالي: {service.total} جنيه<br />
                    تاريخ: {new Date(service.createdAt).toLocaleDateString()}
                  </Card.Text>
                  <Button variant="primary" onClick={() => handleShowDetails(service, 'instant')}>
                    <FontAwesomeIcon icon={faEye} /> عرض التفاصيل
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal show={showRedeemModal} onHide={() => setShowRedeemModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>استبدال العملات</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faGift} />
            <span>معاك {formatNumber(coinsCount)} عملة بقيمة إجمالية {formatNumber(pointsSummary?.coins?.totalValue || 0)} جنيه</span>
          </div>
          <Form.Group>
            <Form.Label>عدد العملات للاستبدال</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={coinsCount}
              value={redeemCount}
              onChange={(e) => setRedeemCount(Number(e.target.value))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRedeemModal(false)}>إغلاق</Button>
          <Button variant="success" onClick={handleRedeemCoins} disabled={redeeming}>
            <FontAwesomeIcon icon={faGift} className="me-2" />
            {redeeming ? 'جاري الاستبدال...' : 'تأكيد الاستبدال'}
          </Button>
        </Modal.Footer>
      </Modal>

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

      <Modal show={showPointsModal} onHide={() => setShowPointsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل الوصل</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pointsData && (
            <div>
              {pointsData.type === 'booking' ? (
                <>
                  <p>اسم العميل: {pointsData.data.clientName}</p>
                  <p>رقم الهاتف: {pointsData.data.clientPhone}</p>
                  <p>رقم الوصل: {pointsData.data.receiptNumber}</p>
                  <p>تاريخ المناسبة: {new Date(pointsData.data.eventDate).toLocaleDateString()}</p>
                  {pointsData.data.hennaDate && <p>تاريخ الحنة: {new Date(pointsData.data.hennaDate).toLocaleDateString()}</p>}
                  {pointsData.data.returnedServices?.length > 0 && (
                    <p>الخدمات المرتجعة: {pointsData.data.returnedServices.map(srv => srv.name).join(', ')}</p>
                  )}
                  {pointsData.data.extraServices?.length > 0 && (
                    <p>الخدمات الإضافية: {pointsData.data.extraServices.map(srv => srv.name).join(', ')}</p>
                  )}
                  <h5>الخدمات:</h5>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>اسم الخدمة</th>
                        <th>السعر</th>
                        <th>الحالة</th>
                        <th>استلام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsData.data.packageServices?.map((srv, index) => {
                        const serviceId = typeof srv._id === 'object' && srv._id._id ? srv._id._id.toString() : (srv._id ? srv._id.toString() : `service-${index}`);
                        const rowKey = serviceId || `service-${index}`;
                        return (
                          <tr key={rowKey}>
                            <td>{srv.name || 'غير معروف'}</td>
                            <td>{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                            <td>
                              {srv.executed ? (
                                `نفذت بواسطة ${srv.executedBy?.username || 'غير معروف'}`
                              ) : (
                                'لم يتم الاستلام'
                              )}
                            </td>
                            <td>
                              {!srv.executed && (
                                <Button
                                  variant="success"
                                  onClick={() => handleExecuteService(serviceId, 'booking', pointsData.data._id)}
                                >
                                  <FontAwesomeIcon icon={faCheck} /> استلام
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pointsData.data.hairStraightening && (
                        <tr key="hairStraightening">
                          <td>فرد شعر</td>
                          <td>{pointsData.data.hairStraighteningPrice ? `${pointsData.data.hairStraighteningPrice} جنيه` : 'غير معروف'}</td>
                          <td>
                            {pointsData.data.hairStraighteningExecuted ? (
                              `نفذت بواسطة ${pointsData.data.hairStraighteningExecutedBy?.username || 'غير معروف'}`
                            ) : (
                              'لم يتم الاستلام'
                            )}
                          </td>
                          <td>
                            {!pointsData.data.hairStraighteningExecuted && (
                              <Button
                                variant="success"
                                onClick={() => handleExecuteService('hairStraightening', 'booking', pointsData.data._id)}
                              >
                                <FontAwesomeIcon icon={faCheck} /> استلام
                              </Button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </>
              ) : (
                <>
                  <p>رقم الوصل: {pointsData.data.receiptNumber}</p>
                  <p>تاريخ الخدمة: {new Date(pointsData.data.createdAt).toLocaleDateString()}</p>
                  <p>الموظف: {pointsData.data.services.find(srv => srv.executed && srv.executedBy) ? pointsData.data.services.find(srv => srv.executed && srv.executedBy).executedBy.username : 'غير محدد'}</p>
                  <h5>الخدمات:</h5>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>اسم الخدمة</th>
                        <th>السعر</th>
                        <th>الحالة</th>
                        <th>استلام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsData.data.services?.map((srv, index) => (
                        <tr key={srv._id ? srv._id.toString() : `service-${index}`}>
                          <td>{srv.name || 'غير معروف'}</td>
                          <td>{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                          <td>
                            {srv.executed ? (
                              `نفذت بواسطة ${srv.executedBy?.username || 'غير معروف'}`
                            ) : (
                              'لم يتم الاستلام'
                            )}
                          </td>
                          <td>
                            {!srv.executed && (
                              <Button
                                variant="success"
                                onClick={() => handleExecuteService(srv._id ? srv._id.toString() : '', 'instant', pointsData.data._id)}
                              >
                                <FontAwesomeIcon icon={faCheck} /> استلام
                              </Button>
                            )}
                          </td>
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
          <Button variant="secondary" onClick={() => setShowPointsModal(false)}>إغلاق</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default EmployeeDashboard;