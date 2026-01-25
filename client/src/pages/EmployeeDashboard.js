import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faQrcode, faGift, faCoins, faBolt, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';

const COIN_COLORS = {
  1: '#8e44ad', // أرجواني
  2: '#d4af37', // ذهبي
  3: '#e74c3c', // أحمر
  4: '#27ae60', // أخضر
  5: '#2980b9', // أزرق
  6: '#c0c7d1', // فضي
  default: '#2c3e50'
};

function EmployeeDashboard({ user }) {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [executedServices, setExecutedServices] = useState([]);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsData, setPointsData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [pendingGifts, setPendingGifts] = useState([]);
  const [todayGifts, setTodayGifts] = useState([]);
  const [redeemCount, setRedeemCount] = useState(1);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertCelebration, setConvertCelebration] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [aiTip, setAiTip] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const qrCodeScanner = useRef(null);
  const { showToast } = useToast();

  const fetchPointsSummary = useCallback(async () => {
    const pointsRes = await axios.get(`/api/users/points/summary`, {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    setPointsSummary(pointsRes.data);
  }, []);

  const fetchPendingGifts = useCallback(async () => {
    const res = await axios.get('/api/users/gifts/pending', {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    setPendingGifts(res.data?.gifts || []);
  }, []);

  const fetchTodayGifts = useCallback(async () => {
    const res = await axios.get('/api/users/gifts/today', {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    setTodayGifts(res.data?.gifts || []);
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const executedRes = await axios.get(`/api/users/executed-services?date=${date}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      await Promise.all([fetchPointsSummary(), fetchPendingGifts(), fetchTodayGifts()]);
      setExecutedServices(executedRes.data?.services || []);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      showToast('خطأ في جلب البيانات', 'danger');
    } finally {
      setLoadingData(false);
    }
  }, [date, fetchPointsSummary, fetchPendingGifts, fetchTodayGifts, showToast]);

  const formatNumber = useCallback((num = 0) => new Intl.NumberFormat('en-US').format(Math.max(0, num)), []);

  const formatTime = useCallback((dt) => {
    if (!dt) return '—';
    const dateObj = new Date(dt);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getTopCoinLevel = useCallback((byLevel = {}) => {
    const levels = Object.keys(byLevel || {})
      .map(Number)
      .filter((lvl) => !Number.isNaN(lvl) && byLevel[lvl] > 0);
    if (levels.length === 0) return 1;
    return Math.max(...levels);
  }, []);

  const getCoinColor = useCallback((level) => COIN_COLORS[level] || COIN_COLORS.default, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleReceiptSearch = useCallback(async (searchValue) => {
    const normalized = (searchValue ?? '').toString().trim();
    if (!normalized) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }
    try {
      console.log('Searching for receipt:', normalized);
      const res = await axios.get(`/api/public/receipt/${normalized}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });

      if (res.data.booking) {
        setPointsData({ type: 'booking', data: res.data.booking });
        setShowPointsModal(true);
        return;
      }

      if (res.data.instantService) {
        setPointsData({ type: 'instant', data: res.data.instantService });
        setShowPointsModal(true);
        return;
      }

      showToast('لم يتم العثور على حجز أو خدمة فورية بهذا الرقم', 'warning');
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
      await Promise.all([fetchPointsSummary(), fetchPendingGifts(), fetchTodayGifts()]);
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
      await Promise.all([fetchPointsSummary(), fetchPendingGifts(), fetchTodayGifts()]);
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

      setPointsData(prev => ({
        ...prev,
        data: type === 'booking' ? res.data.booking : res.data.instantService
      }));

      await fetchAllData();
    } catch (err) {
      console.error('Execute service error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في تنفيذ الخدمة', 'danger');
    }
  };

  const handleOpenQrModal = () => {
    setShowQrModal(true);
  };

  const handleOpenGift = async (giftId) => {
    try {
      const res = await axios.post(`/api/users/gifts/open/${giftId}`, {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(res.data.msg || 'تم فتح الهدية', 'success');
      await Promise.all([fetchPointsSummary(), fetchPendingGifts(), fetchTodayGifts()]);
    } catch (err) {
      console.error('Gift open error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'تعذر فتح الهدية الآن', 'danger');
    }
  };

  const coinsCount = pointsSummary?.coins?.totalCount || 0;
  const topCoinLevel = getTopCoinLevel(pointsSummary?.coins?.byLevel || {});
  const topCoinColor = getCoinColor(topCoinLevel);
  const convertiblePoints = pointsSummary?.convertiblePoints || 0;
  const canConvert = convertiblePoints >= 1000;
  const remainingSalary = pointsSummary?.remainingSalary || 0;
  const progressPercent = pointsSummary?.progress?.percent ?? 0;
  const currentLevel = pointsSummary?.level ?? 1;

  const executedServicesList = useMemo(() => executedServices, [executedServices]);

  const todayPoints = useMemo(() => executedServicesList.reduce((sum, s) => sum + (s.points || 0), 0), [executedServicesList]);
  const performanceComparison = useMemo(() => ([
    { label: 'الشهر الحالي', value: Math.min(100, pointsSummary?.progress?.percent || 0) },
    { label: 'أفضل تقديري', value: Math.min(100, (pointsSummary?.progress?.percent || 0) + 15) },
    { label: 'هدف الإدارة', value: 90 }
  ]), [pointsSummary?.progress?.percent]);
  const filteredServices = useMemo(() => {
    if (performanceFilter === 'instant') return executedServicesList.filter((s) => s.source === 'instant');
    if (performanceFilter === 'booking') return executedServicesList.filter((s) => s.source === 'booking');
    return executedServicesList;
  }, [performanceFilter, executedServicesList]);

  const generateAiTip = useCallback(async () => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      showToast('ضبط REACT_APP_OPENAI_API_KEY قبل طلب النصائح', 'warning');
      return;
    }
    setAiLoading(true);
    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'انت مدرب ألعاب استراتيجية يشجع الموظفين بنصايح قصيرة وعملية. اجعل النص بالعربية الفصحى المبسطة.' },
          {
            role: 'user',
            content: `الموظف مستوى L${pointsSummary?.level || 1}، نقاط كلية ${pointsSummary?.totalPoints || 0}، تقدم للمستوى ${pointsSummary?.progress?.percent || 0}%, عمل اليوم ${todayPoints} نقطة من ${executedServicesList.length} مهام، الفلتر ${performanceFilter}. اعطني 3 نصايح وتشجيع سريع وبالترقيم.`
          }
        ],
        temperature: 0.6,
        max_tokens: 180
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || 'لم يصل رد من الذكاء الاصطناعي.';
      setAiTip(content);
    } catch (err) {
      console.error('AI tip error:', err.message || err);
      setAiTip('تعذر جلب النصائح الآن، حاول لاحقاً.');
    } finally {
      setAiLoading(false);
    }
  }, [pointsSummary?.level, pointsSummary?.totalPoints, pointsSummary?.progress?.percent, todayPoints, executedServicesList.length, performanceFilter, showToast]);

  return (
    <Container className="mt-5">
      {pendingGifts.length > 0 && (
        <Card className="mb-4 gift-card">
          <Card.Body>
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="gift-box">
                  <div className="gift-lid" />
                  <div className="gift-body" />
                  <div className="gift-ribbon" />
                </div>
                <div>
                  <Card.Title className="mb-1">عندك هدية نقاط مستنياك</Card.Title>
                  <div className="text-muted small">افتح الصندوق علشان النقاط تضاف لرصيدك</div>
                </div>
              </div>
              <div className="d-flex flex-column gap-2 flex-fill">
                {pendingGifts.map((g) => (
                  <div key={g._id} className="d-flex flex-wrap align-items-center gap-2 justify-content-between gift-row">
                    <div className="text-muted small">من: {g.giftedByName || 'الإدارة'} — السبب: {g.note || 'هدية تقدير'}</div>
                    <Button variant="success" className="gift-open-btn" onClick={() => handleOpenGift(g._id)}>
                      افتح +{g.amount} نقطة
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      <Card className="mb-4 performance-card">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <Card.Title className="mb-1">نظرة سريعة على الأداء</Card.Title>
              <div className="text-muted small">مقارنات خفيفة بين إنجازاتك الشهرية وأفضل فتراتك</div>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-light" size="sm" onClick={() => setShowPerformanceDetails((p) => !p)}>
                {showPerformanceDetails ? 'إخفاء التفاصيل' : 'تفاصيل أكثر'}
              </Button>
              <Button variant="outline-success" size="sm" onClick={generateAiTip} disabled={aiLoading}>
                {aiLoading ? 'جارٍ التحليل...' : 'نصائح بالذكاء الاصطناعي'}
              </Button>
            </div>
          </div>

          <Row className="g-3">
            <Col md={4} sm={6}>
              <div className="stat-tile">
                <div className="label">نقاط اليوم</div>
                <div className="value">{formatNumber(todayPoints)}</div>
                <div className="muted small">من {executedServicesList.length} مهام منفذة</div>
              </div>
            </Col>
            <Col md={4} sm={6}>
              <div className="stat-tile">
                <div className="label">تقدم المستوى</div>
                <ProgressBar now={progressPercent} label={`${progressPercent}%`} visuallyHidden={false} />
                <div className="muted small">المستوى الحالي: L{currentLevel}</div>
              </div>
            </Col>
            <Col md={4} sm={12}>
              <div className="stat-tile">
                <div className="label">مقارنات سريعة</div>
                {performanceComparison.map((item) => (
                  <div key={item.label} className="mini-bar">
                    <span className="mini-label">{item.label}</span>
                    <div className="mini-track"><span style={{ width: `${item.value}%` }} /></div>
                    <span className="mini-value">{item.value}%</span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>

          {aiTip && (
            <Alert variant="secondary" className="mt-3 mb-0">
              <div className="fw-bold mb-1">مساعد الأداء (AI)</div>
              <div className="small" style={{ whiteSpace: 'pre-line' }}>{aiTip}</div>
            </Alert>
          )}

          {showPerformanceDetails && (
            <div className="performance-detail mt-3">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Button size="sm" variant={performanceFilter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setPerformanceFilter('all')}>الكل</Button>
                <Button size="sm" variant={performanceFilter === 'booking' ? 'primary' : 'outline-primary'} onClick={() => setPerformanceFilter('booking')}>حجوزات</Button>
                <Button size="sm" variant={performanceFilter === 'instant' ? 'primary' : 'outline-primary'} onClick={() => setPerformanceFilter('instant')}>خدمات فورية</Button>
              </div>
              {filteredServices.length === 0 ? (
                <div className="text-muted small">لا توجد بيانات للفلتر الحالي.</div>
              ) : (
                <Row className="g-2">
                  {filteredServices.slice(0, 6).map((srv, idx) => (
                    <Col md={4} sm={6} key={`${srv.receiptNumber}-${idx}-perf`}>
                      <div className="detail-tile">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="badge bg-dark">{srv.source === 'instant' ? 'فوري' : 'حجز'}</span>
                          <span className="badge bg-success">+{formatNumber(srv.points)} نقطة</span>
                        </div>
                        <div className="fw-bold">{srv.serviceName}</div>
                        <div className="text-muted small">وصل: {srv.receiptNumber}</div>
                        <div className="text-muted small">وقت: {formatTime(srv.executedAt)}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      <Row className="mb-4 justify-content-center">
        <Col md={8} lg={6}>
          <div className="scan-panel text-center">
            <Button variant="primary" onClick={handleOpenQrModal} className="scan-btn simple-scan-btn">
              <FontAwesomeIcon icon={faQrcode} className="me-2" />
              مسح الباركود
            </Button>
            <Form onSubmit={handleReceiptSubmit} className="mt-3">
              <Form.Group>
                <Form.Label>أو اكتب رقم الوصل</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="أدخل رقم الوصل"
                  />
                  <Button type="submit" variant="outline-primary">بحث</Button>
                </div>
              </Form.Group>
            </Form>
          </div>
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
                    <div className="small text-muted mt-1">متبقي راتب الشهر: {formatNumber(remainingSalary)} جنيه</div>
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

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0">الخدمات اللي نفذتها النهارده</h3>
        <Button
          variant="outline-light"
          className="refresh-btn"
          onClick={fetchAllData}
          disabled={loadingData}
        >
          <FontAwesomeIcon icon={faRotateRight} className="me-2" />
          {loadingData ? 'جاري التحديث...' : 'تحديث البيانات'}
        </Button>
      </div>
      {executedServicesList.length === 0 && (
        <Alert variant="info">لسه ما نفذت خدمات النهارده</Alert>
      )}
      <Row>
        {executedServicesList.map((srv, idx) => (
          <Col md={4} key={`${srv.receiptNumber}-${idx}`} className="mb-3">
            <Card className="service-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="service-type">{srv.source === 'instant' ? 'خدمة فورية' : 'باكدج'}</span>
                  <span className="points-pill">+{formatNumber(srv.points)} نقطة</span>
                </div>
                <Card.Title className="mb-2">{srv.serviceName}</Card.Title>
                <Card.Text className="mb-1">رقم الوصل: {srv.receiptNumber}</Card.Text>
                {srv.source !== 'instant' && (
                  <Card.Text className="text-muted small">العروسة: {srv.clientName}</Card.Text>
                )}
                <Card.Text className="text-muted small">وقت التنفيذ: {formatTime(srv.executedAt)}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {todayGifts.length > 0 && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <Card.Title className="mb-0">الهدايا اللي استلمتها النهارده</Card.Title>
            </div>
            <Row>
              {todayGifts.map((g) => (
                <Col md={4} key={g._id} className="mb-3">
                  <Card className="gift-log-card h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-success">+{g.amount} نقطة</span>
                        <span className="text-muted small">{g.openedAt ? new Date(g.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className="fw-bold mb-1">من: {g.giftedByName || 'الإدارة'}</div>
                      <div className="text-muted small">السبب: {g.note || 'هدية تقدير'}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

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
