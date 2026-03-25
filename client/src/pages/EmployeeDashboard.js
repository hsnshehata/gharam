import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faQrcode, faGift, faCoins, faBolt, faRotateRight, faWallet, faMoneyBillWave, faArrowDown, faHistory } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const COIN_COLORS = {
  1: '#8e44ad', // أرجواني
  2: '#d4af37', // ذهبي
  3: '#e74c3c', // أحمر
  4: '#27ae60', // أخضر
  5: '#2980b9', // أزرق
  6: '#c0c7d1', // فضي
  default: '#95a5a6'
};

function EmployeeDashboard({ user }) {
  const [executedServices, setExecutedServices] = useState([]);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsData, setPointsData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [pendingGifts, setPendingGifts] = useState([]);
  const [todayGifts, setTodayGifts] = useState([]);
  const [redeemCount, setRedeemCount] = useState(1);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [advancesMonth, setAdvancesMonth] = useState(new Date().toISOString().slice(0, 7));
  const [weeklySeries, setWeeklySeries] = useState([]);
  const qrCodeScanner = useRef(null);
  const { showToast } = useToast();

  const fetchPointsSummary = useCallback(async () => {
    const pointsRes = await axios.get(`/api/users/points/summary`, {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    setPointsSummary(pointsRes.data);
    return pointsRes.data;
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

  const fetchExecutedByDate = useCallback(async (dateStr) => {
    const res = await axios.get(`/api/users/executed-services?date=${dateStr}`, {
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    return res.data?.services || [];
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const todayServices = await fetchExecutedByDate(date);
      const summary = await fetchPointsSummary();
      await Promise.all([fetchPendingGifts(), fetchTodayGifts()]);
      setExecutedServices(todayServices);
      setWeeklySeries(summary?.weeklyBreakdown || []);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      showToast('خطأ في جلب البيانات', 'danger');
    } finally {
      setLoadingData(false);
    }
  }, [date, fetchExecutedByDate, fetchPointsSummary, fetchPendingGifts, fetchTodayGifts, showToast]);

  const formatNumber = useCallback((num = 0) => new Intl.NumberFormat('en-US').format(Math.max(0, num)), []);

  const formatTime = useCallback((dt) => {
    if (!dt) return '—';
    const dateObj = new Date(dt);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }, []);
  
  const formatDate = useCallback((dt) => {
    if (!dt) return '—';
    const dateObj = new Date(dt);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  }, []);

  const getTopCoinLevel = useCallback((byLevel = {}) => {
    const levels = Object.keys(byLevel || {}).map(Number).filter((lvl) => !Number.isNaN(lvl) && byLevel[lvl] > 0);
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
    setIsLoadingScan(true);
    try {
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
      showToast(err.response?.data?.msg || 'خطأ في البحث عن الوصل', 'danger');
    } finally {
      setIsLoadingScan(false);
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
          qrCodeScanner.current.stop().catch(() => {});
          setShowQrModal(false);
        },
        (error) => {}
      ).catch(() => {
        showToast('خطأ في تشغيل الكاميرا', 'danger');
        setShowQrModal(false);
      });
    }

    return () => {
      if (qrCodeScanner.current) {
        try {
          qrCodeScanner.current.stop().catch(() => {});
          qrCodeScanner.current = null;
        } catch (err) {}
      }
    };
  }, [showQrModal, handleReceiptSearch, showToast]);

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptNumber) return showToast('الرجاء إدخال رقم الوصل', 'warning');
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
      await fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.msg || 'تعذر تحويل النقاط الآن', 'danger');
    } finally {
      setConverting(false);
    }
  };

  const handleRedeemCoins = async () => {
    if (!redeemCount || redeemCount <= 0) return showToast('اختار عدد العملات للاستبدال', 'warning');
    if (redeemCount > (pointsSummary?.coins?.totalCount || 0)) return showToast('عدد العملات المطلوب أكبر من المتاح', 'warning');
    try {
      setRedeeming(true);
      const res = await axios.post('/api/users/redeem-coins', { count: redeemCount }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(`تم استبدال ${res.data.redeemedCoins} عملة بقيمة ${res.data.totalValue} جنيه إضافية للمرتب!`, 'success');
      await fetchAllData();
      setShowRedeemModal(false);
    } catch (err) {
      showToast(err.response?.data?.msg || 'تعذر استبدال العملات', 'danger');
    } finally {
      setRedeeming(false);
    }
  };

  const handleExecuteService = async (serviceId, type, recordId) => {
    const employeeId = user?._id || user?.id;
    if (!employeeId) return showToast('حساب الموظف غير محدد', 'danger');
    try {
      const endpoint = type === 'booking' 
        ? `/api/bookings/execute-service/${recordId}/${serviceId}`
        : `/api/instant-services/execute-service/${recordId}/${serviceId}`;
      const res = await axios.post(endpoint, { employeeId }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(`تم التوثيق وإضافة ${res.data.points} نقطة بنجاح`, 'success');
      setPointsData(prev => ({ ...prev, data: type === 'booking' ? res.data.booking : res.data.instantService }));
      await fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.msg || 'خطأ في تنفيذ الخدمة', 'danger');
    }
  };

  const handleOpenGift = async (giftId) => {
    try {
      const res = await axios.post(`/api/users/gifts/open/${giftId}`, {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(res.data.msg || 'تم فتح الهدية بنجاح', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.msg || 'تعذر فتح الهدية الآن', 'danger');
    }
  };

  // Safe Extraction
  const handleOpenQrModal = () => setShowQrModal(true);
  const coinsCount = pointsSummary?.coins?.totalCount || 0;
  const topCoinLevel = getTopCoinLevel(pointsSummary?.coins?.byLevel || {});
  const topCoinColor = getCoinColor(topCoinLevel);
  const convertiblePoints = pointsSummary?.convertiblePoints || 0;
  const canConvert = convertiblePoints >= 1000;
  const rankNumber = pointsSummary?.rank;
  const teamSize = pointsSummary?.teamSize || 0;
  const monthlyRankNumber = pointsSummary?.monthlyRank;
  
  const rankLabel = rankNumber ? `#${rankNumber}` : '—';
  const monthlyRankLabel = monthlyRankNumber ? `#${monthlyRankNumber}` : '—';
  
  const progressPercent = pointsSummary?.progress?.percent ?? 0;
  const currentLevel = pointsSummary?.level ?? 1;

  const theme = typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'light') : 'light';

  const todayPoints = useMemo(() => executedServices.reduce((sum, s) => sum + (s.points || 0), 0), [executedServices]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ background: 'var(--dash-surface)', border: '1px solid var(--dash-border)', padding: '10px', borderRadius: '8px', color: 'var(--dash-text)' }}>
          <p className="fw-bold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color, margin: 0, fontSize: '14px' }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`employee-dashboard-wrapper dash-${theme}`} dir="rtl">
      <style>{`
        .dash-dark {
          --dash-bg: #0f172a;
          --dash-surface: #1e293b;
          --dash-surface-hover: #334155;
          --dash-border: #334155;
          --dash-text: #f8fafc;
          --dash-muted: #94a3b8;
          --dash-accent: #3b82f6;
          --dash-success: #10b981;
          --dash-warning: #f59e0b;
          --dash-danger: #ef4444;
        }
        .dash-light {
          --dash-bg: #f8fafc;
          --dash-surface: #ffffff;
          --dash-surface-hover: #f1f5f9;
          --dash-border: #e2e8f0;
          --dash-text: #0f172a;
          --dash-muted: #64748b;
          --dash-accent: #2563eb;
          --dash-success: #10b981;
          --dash-warning: #f59e0b;
          --dash-danger: #ef4444;
        }

        .employee-dashboard-wrapper {
          background-color: var(--dash-bg);
          color: var(--dash-text);
          min-height: 100vh;
          font-family: 'Tajawal', sans-serif;
          padding-bottom: 60px;
        }
        
        .premium-card {
          background: var(--dash-surface);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        
        .hero-banner {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08));
          border-bottom: 1px solid var(--dash-border);
          padding: 40px 0;
          position: relative;
        }

        .hero-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at right top, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
                      radial-gradient(circle at left bottom, rgba(16, 185, 129, 0.12) 0%, transparent 50%);
          pointer-events: none;
        }

        .stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 999px;
          background: var(--dash-surface);
          border: 1px solid var(--dash-border);
          font-weight: bold;
          font-size: 1.05rem;
          color: var(--dash-text);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }

        .level-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: conic-gradient(var(--dash-accent) calc(var(--progress) * 1%), var(--dash-border) 0);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 0 auto;
        }

        .level-circle::after {
          content: attr(data-level);
          position: absolute;
          inset: 6px;
          background: var(--dash-surface);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--dash-accent);
        }

        .btn-modern {
          border-radius: 12px;
          font-weight: 600;
          padding: 10px 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .btn-scan { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; width: 100%; font-size: 1.2rem; }
        .btn-convert { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; }
        .btn-redeem { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; }

        .coin-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.9rem;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--dash-text);
        }

        .salary-card {
          background: var(--dash-surface);
          border-right: 4px solid var(--dash-success);
        }
        .advance-table-wrapper {
          max-height: 250px;
          overflow-y: auto;
          border-radius: 8px;
          border: 1px solid var(--dash-border);
        }
        
        .service-list-card {
          background: var(--dash-surface);
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          padding: 16px;
          transition: transform 0.2s;
        }
        .service-list-card:hover { transform: translateY(-3px); border-color: var(--dash-accent); }

        .gift-alert {
          background: linear-gradient(135deg, #ec4899, #be185d);
          color: white;
          border: none;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(236, 72, 153, 0.4);
        }

        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line {
          stroke: var(--dash-border);
        }
        .recharts-text { fill: var(--dash-muted) !important; }
      `}</style>
      
      {/* 1. Hero & Profile Section */}
      <div className="hero-banner mb-4">
        <Container style={{ position: 'relative', zIndex: 1 }}>
          <Row className="align-items-center text-center text-md-start">
            <Col md={3} className="mb-4 mb-md-0 text-center">
              <div 
                className="level-circle mb-2" 
                style={{ '--progress': progressPercent }} 
                data-level={`L${currentLevel}`} 
              />
              <div className="fw-bold text-muted">تقدم المستوى: {progressPercent}%</div>
              <div className="small text-muted mt-1">متبقي {Math.max(0, (pointsSummary?.progress?.target || 0) - (pointsSummary?.progress?.current || 0))} نقطة</div>
            </Col>
            
            <Col md={5} className="mb-4 mb-md-0">
              <h2 className="fw-bold mb-3">مرحباً {user?.username} 🚀</h2>
              <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
                <div className="stat-badge">
                  <span className="text-muted">النقاط:</span>
                  <span className="text-primary">{formatNumber(pointsSummary?.totalPoints || 0)}</span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">الترتيب هذا الشهر:</span>
                  <span className="text-warning">{monthlyRankLabel} <small>من {pointsSummary?.monthlyTeamSize || 0}</small></span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">الترتيب العام:</span>
                  <span className="text-warning">{rankLabel} <small>من {teamSize}</small></span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">العملات الحالية:</span>
                  <span style={{ color: topCoinColor }}>
                    <FontAwesomeIcon icon={faCoins} className="me-1" />
                    {coinsCount}
                  </span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">سعر العملة حالياً:</span>
                  <span className="text-success">{pointsSummary?.currentCoinValue || 0} ج.م</span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">عملات محولة هذا الشهر:</span>
                  <span className="text-primary">{pointsSummary?.monthlyCoinsEarnedCount || 0}</span>
                </div>
                <div className="stat-badge">
                  <span className="text-muted">إجمالي العملات طوال المدة:</span>
                  <span className="text-primary">{pointsSummary?.lifetimeCoinsEarnedCount || 0}</span>
                </div>
              </div>
            </Col>

            <Col md={4}>
              <div className="d-flex flex-column gap-3">
                <Button onClick={handleOpenQrModal} className="btn-modern btn-scan py-3">
                  <FontAwesomeIcon icon={faQrcode} className="me-2" /> مسح باركود أداء الخدمة
                </Button>
                <Form onSubmit={handleReceiptSubmit} className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="أو أكتب رقم الوصل هنا..."
                    style={{ background: 'var(--dash-surface)', color: 'var(--dash-text)', borderColor: 'var(--dash-border)' }}
                  />
                  <Button type="submit" variant="primary" className="btn-modern px-4" disabled={isLoadingScan}>
                    {isLoadingScan ? <Spinner size="sm" animation="border" /> : 'بحث'}
                  </Button>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container>
        {loadingData && <Alert variant="info" className="text-center rounded-3 border-0">جاري مزامنة البيانات...</Alert>}
        
        {/* Pending Gifts Alerts */}
        {pendingGifts.length > 0 && (
          <div className="mb-4">
            {pendingGifts.map((g) => (
              <Alert key={g._id} className="gift-alert d-flex align-items-center justify-content-between p-4 mb-3">
                <div>
                  <h5 className="fw-bold mb-1"><FontAwesomeIcon icon={faGift} className="me-2"/> صندوق مكافأة بانتظارك!</h5>
                  <p className="mb-0 opacity-75">المصدر: {g.giftedByName || 'رسالة إدارة'} — {g.note || 'تقدير لمجهودك'}</p>
                </div>
                <Button variant="light" className="btn-modern fw-bold px-4" onClick={() => handleOpenGift(g._id)}>
                  افتح الصندوق (+{g.amount} نقطة)
                </Button>
              </Alert>
            ))}
          </div>
        )}

        <Row className="mb-4 g-4">
          <Col lg={7}>
            <div className="premium-card p-4 h-100">
              <h5 className="section-title">محفظة التحويلات والاستبدال</h5>
              
              <Row className="align-items-center">
                <Col md={6} className="mb-4 mb-md-0 text-center text-md-start">
                  <div className="mb-3">
                    <div className="text-muted mb-1">نقاط إضافية قابلة للتحويل لعملات</div>
                    <h2 className={`fw-bold mb-0 ${canConvert ? 'text-success' : 'text-danger'}`}>
                      {formatNumber(convertiblePoints)} <small className="text-muted fs-6">نقطة</small>
                    </h2>
                  </div>
                  {canConvert ? (
                    <Button onClick={handleConvertPoints} disabled={converting} className="btn-modern btn-convert w-100">
                      <FontAwesomeIcon icon={faBolt} className="me-2" /> حوّل إلى عملات
                    </Button>
                  ) : (
                    <div className="alert alert-secondary p-2 mb-0 text-center rounded-3 border-0">
                      باقي {formatNumber(1000 - convertiblePoints)} للعملة القادمة
                    </div>
                  )}
                </Col>
                
                <Col md={6}>
                  <div className="p-3 bg-dark bg-opacity-10 rounded-3 border h-100 d-flex flex-column justify-content-center text-center text-md-start">
                    <div className="text-muted mb-1">العملات المتاحة للاستبدال للمرتب</div>
                    <div className="d-flex align-items-center gap-3 mb-3 justify-content-center justify-content-md-start">
                      <div className="coin-icon" style={{ background: topCoinColor, width: 45, height: 45, fontSize: '1.2rem' }}>
                        <FontAwesomeIcon icon={faCoins} />
                      </div>
                      <div>
                        <h3 className="mb-0 fw-bold">{coinsCount} <small className="fs-6 fw-normal">عملات</small></h3>
                        <div className="text-success fw-bold">إجمالي قيمتها = {formatNumber(pointsSummary?.coins?.totalValue || 0)} ج.م</div>
                      </div>
                    </div>
                    {coinsCount > 0 && (
                      <Button onClick={() => { setRedeemCount(1); setShowRedeemModal(true); }} className="btn-modern btn-redeem w-100">
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" /> استبدل لإضافة للمرتب
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </Col>

          <Col lg={5}>
            <div className="premium-card salary-card p-4 h-100">
              <h5 className="section-title"><FontAwesomeIcon icon={faWallet} className="me-2" /> راتب الشهر</h5>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">الراتب الأساسي:</span>
                <span className="fw-bold fs-5">{formatNumber(pointsSummary?.monthlySalary || 0)} ج.م</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2">
                <span className="text-muted">الراتب المتبقي (الصافي):</span>
                <span className="fw-bold fs-3 text-success">{formatNumber(pointsSummary?.remainingSalary || 0)} ج.م</span>
              </div>
              
              <div className="d-flex justify-content-between mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                <span className="text-muted">إجمالي المكافآت المضافة هذا الشهر:</span>
                <span className="fw-bold fs-5 text-primary">{formatNumber(pointsSummary?.monthlyRedeemedValue || 0)} ج.م</span>
              </div>

              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">السلف والخصومات الإدارية</h6>
                  <Form.Control
                    type="month"
                    size="sm"
                    style={{ width: '150px' }}
                    value={advancesMonth}
                    onChange={(e) => setAdvancesMonth(e.target.value)}
                    title="اختر شهر لعرض عملياته، واتركه فارغاً لعرض الكل"
                  />
                </div>
                <div className="advance-table-wrapper">
                  <Table variant={theme === 'dark' ? 'dark' : 'light'} borderless hover size="sm" className="mb-0 text-center align-middle">
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--dash-surface)', zIndex: 1 }}>
                      <tr className="border-bottom border-secondary border-opacity-25">
                        <th className="py-2 text-muted fw-normal">النوع</th>
                        <th className="py-2 text-muted fw-normal">المبلغ</th>
                        <th className="py-2 text-muted fw-normal">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let combined = [
                          ...(pointsSummary?.advances || []).map(a => ({ ...a, recordType: 'سلفة' })),
                          ...(pointsSummary?.deductions || []).map(d => ({ ...d, recordType: `خصم (${d.reason || ''})` }))
                        ].sort((a, b) => new Date(b.date) - new Date(a.date));

                        if (advancesMonth) {
                          combined = combined.filter(c => c.date && c.date.startsWith(advancesMonth));
                        }

                        if (combined.length === 0) {
                          return (
                            <tr>
                              <td colSpan="3" className="text-muted py-4">لا توجد حركات مؤخراً في هذا الشهر</td>
                            </tr>
                          );
                        }
                        return combined.map((item, idx) => (
                          <tr key={`adv-ded-${idx}`}>
                            <td>
                              <Badge bg={item.recordType === 'سلفة' ? 'warning' : 'danger'} text={item.recordType === 'سلفة' ? 'dark' : 'light'}>{item.recordType}</Badge>
                            </td>
                            <td className="text-danger fw-bold">-{formatNumber(item.amount)} ج.م</td>
                            <td className="text-muted small">{formatDate(item.date)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </Table>
                </div>
              </div>

            </div>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row className="mb-4 g-4">
          <Col lg={8}>
            <div className="premium-card p-4 h-100">
              <h5 className="section-title">نقاط آخر ٧ أيام</h5>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={weeklySeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--dash-accent)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--dash-accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--dash-muted)' }} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--dash-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" name="النقاط" stroke="var(--dash-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>
          <Col lg={4}>
            <div className="premium-card p-4 h-100">
              <h5 className="section-title">حجوزات مقابل خدمات فورية</h5>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <BarChart data={weeklySeries} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--dash-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--dash-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--dash-surface-hover)' }} />
                    <Legend wrapperStyle={{ color: 'var(--dash-muted)' }} />
                    <Bar dataKey="booking" name="حجوزات/باكدج" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="instant" name="فوري" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>
        </Row>

        {/* Executed Services Today */}
        <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
          <h4 className="fw-bold m-0">سجل خدماتك اليوم</h4>
          <Button variant="outline-primary" className="btn-modern" onClick={fetchAllData} disabled={loadingData}>
            <FontAwesomeIcon icon={faRotateRight} className="me-2" /> تحديث السجل
          </Button>
        </div>

        {executedServices.length === 0 ? (
          <div className="premium-card p-5 text-center mb-4">
            <h5 className="text-muted">لم تقم بتسجيل أي خدمات اليوم حتى الآن.</h5>
            <p className="text-muted mb-0">اسحب الباركود الخاص بالعميل من الوصل علشان يتسجل في رصيدك!</p>
          </div>
        ) : (
          <Row className="g-3">
            {executedServices.map((srv, idx) => (
              <Col md={6} lg={4} key={`srv-${srv.receiptNumber}-${idx}`}>
                <div className="service-list-card h-100 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Badge bg={srv.source === 'instant' ? 'secondary' : 'primary'} className="rounded-pill px-3 py-2">
                      {srv.source === 'instant' ? 'خدمة فورية' : 'حجز/باكدج'}
                    </Badge>
                    <div className="text-success fw-bold fs-5">+{formatNumber(srv.points)}</div>
                  </div>
                  <h5 className="fw-bold mb-1">{srv.serviceName}</h5>
                  <div className="text-muted mb-2">رقم الوصل: {srv.receiptNumber}</div>
                  <div className="mt-auto d-flex justify-content-between align-items-end pt-3 border-top border-secondary border-opacity-10">
                    <div>
                      {srv.source !== 'instant' && <div className="text-muted small">عميل: <span className="text-body fw-bold">{srv.clientName}</span></div>}
                    </div>
                    <div className="text-muted small bg-dark bg-opacity-10 px-2 py-1 rounded">{formatTime(srv.executedAt)}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}

      </Container>

      {/* Modals */}
      <Modal show={showRedeemModal} onHide={() => setShowRedeemModal(false)} centered contentClassName="premium-card border-0">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">صرف العملات</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info rounded-3 text-center border-0 mb-4">
            تحويل عملاتك الحالية لفلوس تضاف إلي <strong>الراتب المتبقي</strong> حالاً.
          </div>
          <Form.Group>
            <Form.Label className="fw-bold">حدد الكمية المراد صرفها (الحد الأقصى {coinsCount}):</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={coinsCount}
              value={redeemCount}
              onChange={(e) => setRedeemCount(Number(e.target.value))}
              style={{ background: 'var(--dash-surface)', color: 'var(--dash-text)', borderColor: 'var(--dash-border)' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowRedeemModal(false)} className="btn-modern">إلغاء</Button>
          <Button variant="success" onClick={handleRedeemCoins} disabled={redeeming} className="btn-modern px-4">
            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" /> تأكيد الصرف
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered contentClassName="premium-card border-0">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">مسح الباركود</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p className="text-muted mb-3">ضع الباركود الموجود بوصل العميل أمام الكاميرا</p>
          <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />
        </Modal.Body>
      </Modal>

      <Modal show={showPointsModal} onHide={() => setShowPointsModal(false)} size="lg" centered contentClassName="premium-card border-0">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">تأكيد الخدمات للوصل {pointsData?.data?.receiptNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pointsData && (
            <div>
              <div className="bg-dark bg-opacity-10 p-3 rounded-3 mb-4 border border-secondary border-opacity-25">
                <Row>
                  <Col md={6} className="mb-2 mb-md-0">
                    <div className="text-muted small">العميل</div>
                    <div className="fw-bold fs-5">{pointsData.data.clientName || 'عميل فوري'}</div>
                  </Col>
                  {pointsData.data.clientPhone && (
                    <Col md={6}>
                      <div className="text-muted small">الموبايل</div>
                      <div className="fw-bold">{pointsData.data.clientPhone}</div>
                    </Col>
                  )}
                </Row>
              </div>

              <h5 className="fw-bold mb-3">الخدمات المطلوبة:</h5>
              <div className="table-responsive">
                <Table variant={theme === 'dark' ? 'dark' : 'light'} borderless hover className="align-middle">
                  <thead className="border-bottom border-secondary border-opacity-25">
                    <tr>
                      <th className="text-muted fw-normal">الخدمة</th>
                      <th className="text-muted fw-normal text-center">السعر</th>
                      <th className="text-muted fw-normal text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pointsData.type === 'booking' ? pointsData.data.packageServices : pointsData.data.services)?.map((srv, index) => {
                      const serviceId = typeof srv._id === 'object' && srv._id._id ? srv._id._id.toString() : (srv._id ? srv._id.toString() : `service-${index}`);
                      return (
                        <tr key={serviceId}>
                          <td className="fw-bold">{srv.name || 'غير معروف'}</td>
                          <td className="text-center">{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                          <td className="text-center">
                            {srv.executed ? (
                              <Badge bg="success" className="p-2"><FontAwesomeIcon icon={faCheck} className="me-1"/> مستلمة بواسطة {srv.executedBy?.username || ''}</Badge>
                            ) : (
                              <Button
                                variant="primary"
                                className="btn-modern py-1 px-3"
                                onClick={() => handleExecuteService(serviceId, pointsData.type, pointsData.data._id)}
                              >
                                استلام النقاط
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EmployeeDashboard;
