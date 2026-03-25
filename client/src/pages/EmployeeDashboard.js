import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faQrcode, faGift, faCoins, faBolt, faRotateRight, faWandMagicSparkles, faCrown, faHeart } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';

const COIN_COLORS = {
  1: '#ff9a9e', 
  2: '#fecfef', 
  3: '#a18cd1', 
  4: '#84fab0', 
  5: '#8fd3f4', 
  6: '#fbc2eb', 
  default: '#ff9a9e'
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
  const [convertCelebration, setConvertCelebration] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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

      const days = Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - idx));
        return d.toISOString().split('T')[0];
      });

      const weeklyPayloads = await Promise.all(days.map((d) => fetchExecutedByDate(d).catch(() => [])));
      const weeklyAggregated = weeklyPayloads.map((services, idx) => {
        const dayDate = new Date(days[idx]);
        const label = `${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
        const totals = services.reduce((acc, s) => {
          const pts = s.points || 0;
          acc.total += pts;
          if (s.source === 'booking') acc.booking += pts;
          if (s.source === 'instant') acc.instant += pts;
          return acc;
        }, { total: 0, booking: 0, instant: 0 });
        return { label, ...totals };
      });

      const summary = await fetchPointsSummary();
      await Promise.all([fetchPendingGifts(), fetchTodayGifts()]);
      setExecutedServices(todayServices);
      setWeeklySeries(summary?.weeklyBreakdown || weeklyAggregated);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      showToast('خطأ في جلب البيانات ⚠️', 'danger');
    } finally {
      setLoadingData(false);
    }
  }, [date, fetchExecutedByDate, fetchPointsSummary, fetchPendingGifts, fetchTodayGifts, showToast]);

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
            console.warn('QR scan warning:', error);
          }
        }
      ).catch((err) => {
        console.error('Start error:', err);
        showToast('خطأ في تشغيل الكاميرا', 'danger');
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
      showToast(`تم تحويل ${res.data.mintedCoins} عملة بنجاح 🌟`, 'success');
      setConvertCelebration(true);
      setTimeout(() => setConvertCelebration(false), 2000);
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
      showToast(`تم استبدال ${res.data.redeemedCoins} عملة بقيمة ${res.data.totalValue} جنيه 💸`, 'success');
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
      showToast('حساب الموظف غير موجود، سجل دخول من جديد', 'danger');
      return;
    }
    try {
      const endpoint = type === 'booking' 
        ? `/api/bookings/execute-service/${recordId}/${serviceId}`
        : `/api/instant-services/execute-service/${recordId}/${serviceId}`;
      const res = await axios.post(endpoint, { employeeId }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(`تم تأكيد التنفيذ! أضفنا ${res.data.points} نقطة 🌟`, 'success');

      setPointsData(prev => ({
        ...prev,
        data: type === 'booking' ? res.data.booking : res.data.instantService
      }));

      await fetchAllData();
    } catch (err) {
      console.error('Execute service error:', err.response?.data || err.message);
      showToast(err.response?.data?.msg || 'خطأ في تأكيد الخدمة', 'danger');
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
      showToast(res.data.msg || 'تم فتح الهدية بنجاح 🎁', 'success');
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
  const progressPercent = pointsSummary?.progress?.percent ?? 0;
  const currentLevel = pointsSummary?.level ?? 1;

  const executedServicesList = useMemo(() => executedServices, [executedServices]);
  const todayPoints = useMemo(() => executedServicesList.reduce((sum, s) => sum + (s.points || 0), 0), [executedServicesList]);

  const last7DaysSeries = useMemo(() => weeklySeries, [weeklySeries]);

  const bookingTotal = useMemo(() => last7DaysSeries.reduce((sum, d) => sum + d.booking, 0), [last7DaysSeries]);
  const instantTotal = useMemo(() => last7DaysSeries.reduce((sum, d) => sum + d.instant, 0), [last7DaysSeries]);
  const rankNumber = pointsSummary?.rank;
  const rankLabel = rankNumber ? `#${rankNumber}` : '—';
  const monthlyRankNumber = pointsSummary?.monthlyRank;
  const monthlyRankLabel = monthlyRankNumber ? `#${monthlyRankNumber}` : '—';
  const topServices = pointsSummary?.topServices || {};

  const renderTopServices = (list) => {
    if (!list || list.length === 0) return <div className="text-muted small">لا يوجد بيانات حتى الآن</div>;
    return list.map((item, idx) => (
      <div key={`${item.name}-${idx}`} className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <div className="fw-bold" style={{ color: '#4a4a4a', fontSize: '14px' }}>{item.name}</div>
          <div className="text-muted" style={{ fontSize: '11px' }}>{item.count} مرة</div>
        </div>
        <span className="game-badge-soft">{formatNumber(item.points)} <FontAwesomeIcon icon={faBolt} className="text-warning" /></span>
      </div>
    ));
  };

  const sparkPath = (arr) => {
    if (!arr.length) return '';
    const w = 220;
    const h = 60;
    const max = Math.max(...arr, 1);
    const min = Math.min(...arr, 0);
    const span = max - min || 1;
    const step = arr.length === 1 ? w : w / (arr.length - 1);
    return arr.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <div className="game-dashboard" dir="rtl">
      <style>{`
        body {
          background-color: #faf0f4 !important;
          background-image: 
            radial-gradient(circle at top right, #ffe1ea 0%, transparent 40%),
            radial-gradient(circle at bottom left, #e8f0ff 0%, transparent 40%),
            radial-gradient(circle at center, #ffffff 0%, transparent 60%);
          background-attachment: fixed;
          font-family: 'Cairo', sans-serif !important;
          color: #4a4a4a;
        }

        .game-dashboard {
          padding-bottom: 50px;
        }

        .game-card {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 2px solid rgba(255, 255, 255, 0.9) !important;
          border-radius: 24px !important;
          box-shadow: 0 10px 30px rgba(255, 154, 158, 0.15) !important;
          overflow: hidden;
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .game-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(255, 154, 158, 0.25) !important;
        }

        .game-card-header {
          padding: 20px 20px 10px;
        }

        .game-title {
          font-size: 22px;
          font-weight: 800;
          color: #ff758c;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .game-subtitle {
          color: #a0a0a0;
          font-size: 13px;
        }

        .game-btn {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
          color: #fff;
          border: none;
          border-radius: 30px;
          padding: 10px 25px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 6px 15px rgba(255, 154, 158, 0.4);
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .game-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 10px 20px rgba(255, 154, 158, 0.6);
          color: #fff;
        }

        .game-btn-outline {
          background: transparent;
          color: #ff758c;
          border: 2px solid #ff758c;
          border-radius: 30px;
          padding: 8px 20px;
          font-weight: 700;
          transition: all 0.3s;
        }

        .game-btn-outline:hover {
          background: #ff758c;
          color: #fff;
          transform: translateY(-2px);
        }

        .scan-panel {
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6));
          border-radius: 25px;
          padding: 25px;
          box-shadow: 0 10px 25px rgba(255, 154, 158, 0.1);
          border: 2px dashed #ff9a9e;
          text-align: center;
        }

        .form-control {
          border-radius: 20px;
          border: 2px solid #ffe1ea;
          padding: 10px 15px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);
        }
        
        .form-control:focus {
          border-color: #ff9a9e;
          box-shadow: 0 0 0 0.25rem rgba(255, 154, 158, 0.25);
        }

        .game-chip {
          background: #fff;
          border: 1px solid #ffe1ea;
          border-radius: 20px;
          padding: 15px;
          flex: 1;
          min-width: 140px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.03);
          text-align: center;
          transition: transform 0.2s;
        }

        .game-chip:hover {
          transform: scale(1.05);
          border-color: #ff9a9e;
        }

        .game-chip .label {
          color: #888;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .game-chip .value {
          font-weight: 900;
          font-size: 24px;
          color: #ff758c;
          font-family: 'Nunito', sans-serif;
        }

        .game-chip .sub-text {
          font-size: 11px;
          color: #bbb;
          margin-top: 5px;
        }

        .coin-showcase {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #fff;
          padding: 15px;
          border-radius: 25px;
          border: 2px solid #ffe1ea;
        }

        .coin-bubble {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #fff;
          font-weight: 900;
          font-size: 20px;
          font-family: 'Nunito', sans-serif;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1), inset 0 -4px 10px rgba(0,0,0,0.1);
          border: 4px solid rgba(255,255,255,0.4);
          position: relative;
        }

        .coin-bubble::after {
          content: '';
          position: absolute;
          top: 10px;
          left: 10px;
          width: 15px;
          height: 15px;
          background: rgba(255,255,255,0.8);
          border-radius: 50%;
        }

        .game-progress-container {
          background: #fff;
          border-radius: 30px;
          padding: 20px;
          border: 2px solid #ffe1ea;
          flex: 1;
        }

        .game-progress-bar {
          background: #f0f0f0;
          border-radius: 20px;
          height: 20px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .game-progress-fill {
          height: 100%;
          background: repeating-linear-gradient(
            45deg,
            #ff9a9e,
            #ff9a9e 10px,
            #fecfef 10px,
            #fecfef 20px
          );
          border-radius: 20px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .game-progress-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
          animation: shine 2s infinite;
        }

        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .chart-container {
          background: #fff;
          border-radius: 20px;
          padding: 15px;
          border: 2px solid #ffe1ea;
          box-shadow: 0 5px 15px rgba(0,0,0,0.02);
        }

        .spark-svg { width: 100%; height: 60px; }
        .spark-line { stroke: #ff758c; fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 4px 6px rgba(255, 117, 140, 0.3)); }
        
        .game-badge-soft {
          background: #ffe1ea;
          color: #ff758c;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 11px;
        }

        .service-cute-card {
          background: #fff;
          border-radius: 20px;
          padding: 15px;
          border: 2px solid transparent;
          transition: all 0.3s;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          height: 100%;
          position: relative;
        }

        .service-cute-card:hover {
          border-color: #ff9a9e;
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(255, 154, 158, 0.2);
        }

        .service-cute-type {
          position: absolute;
          top: -12px;
          right: 20px;
          background: #a18cd1;
          color: #fff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 8px rgba(161, 140, 209, 0.4);
        }

        .celebration-anim {
          animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .modal-content {
          border-radius: 25px;
          border: none;
          box-shadow: 0 20px 50px rgba(255, 154, 158, 0.3);
        }
        .modal-header {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          color: #fff;
          border-top-left-radius: 25px;
          border-top-right-radius: 25px;
          border-bottom: none;
        }
        .modal-header .btn-close {
          filter: invert(1);
        }
      `}</style>

      <Container className="pt-5">
        
        {/* Header Greeting */}
        <div className="d-flex align-items-center mb-4">
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', border: '3px solid #ff758c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 8px 15px rgba(255, 117, 140, 0.3)' }}>
            🌟
          </div>
          <div className="ms-3 pe-3">
            <h2 className="mb-0" style={{ color: '#ff758c', fontWeight: 900 }}>مرحباً بك يا {user?.username || 'بطل'} ✨</h2>
            <div className="text-muted">مستعد لإنجازات اليوم؟</div>
          </div>
        </div>

        {/* Pending Gifts Area */}
        {pendingGifts.length > 0 && (
          <Card className="game-card mb-4 celebration-anim">
            <Card.Body>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ fontSize: '40px', animation: 'pop 2s infinite' }}>🎁</div>
                  <div>
                    <h5 className="mb-1" style={{ color: '#ff758c', fontWeight: 800 }}>هدية في انتظارك!</h5>
                    <div className="text-muted small">افتح الهدية لإضافة النقاط إلى رصيدك</div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {pendingGifts.map((g) => (
                    <Button key={g._id} className="game-btn" onClick={() => handleOpenGift(g._id)}>
                      افتح الهدية +{g.amount} نقطة ✨
                    </Button>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Scanner Panel */}
        <Row className="mb-4 justify-content-center">
          <Col md={8} lg={6}>
            <div className="scan-panel">
              <Button className="game-btn w-100 mb-3" onClick={handleOpenQrModal} style={{ fontSize: '18px' }}>
                <FontAwesomeIcon icon={faQrcode} className="me-2" />
                مسح الباركود 📸
              </Button>
              <div className="text-muted mb-2">أو قم بإدخال رقم الوصل بشكل يدوي:</div>
              <Form onSubmit={handleReceiptSubmit} className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="رقم الوصل..."
                />
                <Button type="submit" className="game-btn-outline">بحث</Button>
              </Form>
            </div>
          </Col>
        </Row>

        {/* Big Dashboard Panel */}
        <Card className="game-card mb-4">
          <div className="game-card-header">
            <h3 className="game-title"><FontAwesomeIcon icon={faWandMagicSparkles} /> لوحة الإنجازات 🏆</h3>
            <div className="game-subtitle">متابعة دقيقة لنقاطك ومستواك الحالي</div>
          </div>
          <Card.Body>
            {pointsSummary ? (
              <>
                <div className="d-flex flex-wrap gap-3 mb-4">
                  {/* Coin Showcase */}
                  <div className="coin-showcase flex-fill">
                    <div className="coin-bubble" style={{ background: `linear-gradient(135deg, ${topCoinColor}, #fff)` }}>
                      L{topCoinLevel}
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '13px', fontWeight: 700 }}>العملات الخاصة بك</div>
                      <div style={{ color: '#ff758c', fontSize: '26px', fontWeight: 900, fontFamily: 'Nunito' }}>
                        {formatNumber(coinsCount)} <FontAwesomeIcon icon={faCoins} style={{ fontSize: '18px', color: '#f1c40f' }}/>
                      </div>
                    </div>
                    {coinsCount > 0 && (
                      <Button className="game-btn ms-auto" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setRedeemCount(1); setShowRedeemModal(true); }}>
                        تبديل العملات 💸
                      </Button>
                    )}
                  </div>

                  {/* Level Progress */}
                  <div className="game-progress-container">
                    <div className="d-flex justify-content-between mb-2">
                      <span style={{ fontWeight: 800, color: '#ff758c' }}>المستوى L{pointsSummary.level}</span>
                      <span style={{ fontWeight: 800, color: '#a18cd1' }}>{progressPercent}%</span>
                    </div>
                    <div className="game-progress-bar">
                      <div className="game-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="text-center mt-2 text-muted" style={{ fontSize: '12px' }}>
                      متبقي {Math.max(0, (pointsSummary.progress?.target || 0) - (pointsSummary.progress?.current || 0))} نقطة للمستوى التالي 👑
                    </div>
                  </div>
                </div>

                <hr style={{ borderTop: '2px dashed #ffe1ea', margin: '20px 0' }} />

                {/* Point Conversion Section */}
                <div className="d-flex flex-wrap justify-content-between align-items-center bg-white p-3 rounded" style={{ border: '2px solid #ffe1ea' }}>
                  <div className="text-center px-3">
                    <div style={{ color: '#888', fontSize: '12px', fontWeight: 700 }}>سجل النقاط المتاحة</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#ff758c', fontFamily: 'Nunito' }} className={convertCelebration ? 'celebration-anim' : ''}>
                      {formatNumber(convertiblePoints)} <FontAwesomeIcon icon={faBolt} style={{ color: '#f1c40f', fontSize: '18px' }}/>
                    </div>
                  </div>

                  <div className="text-center px-3" style={{ borderRight: '2px dashed #ffe1ea', borderLeft: '2px dashed #ffe1ea' }}>
                    <div style={{ color: '#888', fontSize: '12px', fontWeight: 700 }}>قيمة العملة الحالية</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#a18cd1', fontFamily: 'Nunito' }}>
                      {formatNumber(pointsSummary.currentCoinValue)} ج
                    </div>
                  </div>

                  <div className="px-3 text-center">
                    {canConvert ? (
                      <Button
                        className="game-btn"
                        onClick={handleConvertPoints}
                        disabled={converting}
                      >
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="me-2" />
                        تحويل 1000 نقطة إلى عملة
                      </Button>
                    ) : (
                      <div className="text-muted" style={{ fontSize: '12px', fontWeight: 700 }}>
                        يلزمك {formatNumber(Math.max(0, 1000 - convertiblePoints))} نقطة لتحويل عملة إضافية ✨
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4" style={{ color: '#ff758c', fontWeight: 800 }}>جاري تجهيز بيانات لوحة الإنجازات... ⏳</div>
            )}
          </Card.Body>
        </Card>

        {/* Stats Row */}
        <div className="d-flex flex-wrap gap-3 mb-4">
          <div className="game-chip">
            <div className="label">نقاط اليوم</div>
            <div className="value">{formatNumber(todayPoints)}</div>
            <div className="sub-text">تم تنفيذ {executedServicesList.length} خدمة</div>
          </div>
          <div className="game-chip">
            <div className="label">الترتيب الشهري</div>
            <div className="value">{monthlyRankLabel}</div>
            <div className="sub-text">بين أعضاء الفريق</div>
          </div>
          <div className="game-chip">
            <div className="label">الترتيب الإجمالي</div>
            <div className="value">{rankLabel} <FontAwesomeIcon icon={faCrown} style={{ color: '#f1c40f', fontSize: '16px' }} /></div>
            <div className="sub-text">في الترتيب العام 🏆</div>
          </div>
        </div>

        {/* Activity Charts section */}
        <Row className="mb-4">
          <Col md={8} className="mb-3">
             <div className="chart-container h-100">
               <div style={{ fontWeight: 800, color: '#4a4a4a', marginBottom: '15px' }}>أداء آخر أسبوع 📈</div>
               <svg className="spark-svg" viewBox="0 0 220 60" preserveAspectRatio="none">
                  <path className="spark-line" d={sparkPath(last7DaysSeries.map((d) => d.total))} />
               </svg>
               <div className="d-flex justify-content-between mt-2" style={{ color: '#a0a0a0', fontSize: '11px' }}>
                  {last7DaysSeries.map((d, idx) => (
                    <span key={idx}>{d.label}</span>
                  ))}
               </div>
             </div>
          </Col>
          <Col md={4} className="mb-3">
             <div className="chart-container h-100">
               <div style={{ fontWeight: 800, color: '#4a4a4a', marginBottom: '15px' }}>الخدمات الشائعة 🛠️</div>
               {renderTopServices(topServices.all?.slice(0,3))}
             </div>
          </Col>
        </Row>

        {/* Executed Services List */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 style={{ fontWeight: 800, color: '#ff758c' }}>ما تم تنفيذه اليوم 💪</h4>
          <Button className="game-btn-outline" onClick={fetchAllData} disabled={loadingData}>
            <FontAwesomeIcon icon={faRotateRight} className={loadingData ? "fa-spin me-2" : "me-2"} />
            تحديث البيانات
          </Button>
        </div>

        <Row>
          {executedServicesList.length === 0 ? (
            <Col xs={12}>
              <div className="text-center p-5 game-card" style={{ color: '#a0a0a0' }}>
                لم يتم تنفيذ أية خدمات اليوم بعد. بانتظار إبداعكم! 🌟
              </div>
            </Col>
          ) : (
            executedServicesList.map((srv, idx) => (
              <Col md={4} key={`${srv.receiptNumber}-${idx}`} className="mb-3 border-0">
                <div className="service-cute-card">
                  <div className="service-cute-type ms-2">{srv.source === 'instant' ? 'خدمة فورية' : 'باكدج'}</div>
                  <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
                    <span style={{ fontWeight: 900, color: '#4a4a4a', fontSize: '16px' }}>{srv.serviceName}</span>
                  </div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    <div className="mb-1"><strong>رقم الوصل:</strong> <span style={{ fontFamily: 'Nunito' }}>{srv.receiptNumber}</span></div>
                    {srv.source !== 'instant' && <div className="mb-1"><strong>العميل:</strong> {srv.clientName}</div>}
                    <div><strong>الوقت:</strong> <span style={{ fontFamily: 'Nunito' }}>{formatTime(srv.executedAt)}</span></div>
                  </div>
                  <div className="text-end mt-2">
                    <span className="game-badge-soft" style={{ fontSize: '13px' }}>+{formatNumber(srv.points)} نقطة 🌟</span>
                  </div>
                </div>
              </Col>
            ))
          )}
        </Row>

        {/* Modals */}
        <Modal show={showRedeemModal} onHide={() => setShowRedeemModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: 800 }}>محفظة العملات 💰</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              <div style={{ fontSize: '40px', animation: 'pop 2s infinite' }}>🏦</div>
              <div style={{ fontWeight: 700, color: '#888' }}>لديك {formatNumber(coinsCount)} عملة بقيمة {formatNumber(pointsSummary?.coins?.totalValue || 0)} جنيه</div>
            </div>
            <Form.Group>
              <Form.Label style={{ fontWeight: 700, color: '#ff758c' }}>العدد المراد استبداله:</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={coinsCount}
                value={redeemCount}
                onChange={(e) => setRedeemCount(Number(e.target.value))}
                style={{ fontSize: '20px', fontFamily: 'Nunito', textAlign: 'center', fontWeight: 800, color: '#4a4a4a' }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: 'none', justifyContent: 'center' }}>
            <Button className="game-btn" onClick={handleRedeemCoins} disabled={redeeming} style={{ width: '100%', fontSize: '18px' }}>
               تأكيد واستلام المبلغ 💵
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: 800 }}>مسح الباركود 📸</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <div id="qr-reader" style={{ width: '100%', borderBottomLeftRadius: '25px', borderBottomRightRadius: '25px', overflow: 'hidden' }} />
          </Modal.Body>
        </Modal>

        <Modal show={showPointsModal} onHide={() => setShowPointsModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: 800 }}>تفاصيل الوصل 🧾</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {pointsData && (
              <div style={{ color: '#4a4a4a' }}>
                <div className="d-flex flex-wrap gap-3 mb-4 p-3 bg-light rounded-4" style={{ border: '1px solid #ffe1ea' }}>
                  {pointsData.type === 'booking' ? (
                    <>
                      <div className="flex-fill"><strong>العميل:</strong> {pointsData.data.clientName}</div>
                      <div className="flex-fill"><strong>الهاتف:</strong> <span style={{fontFamily:'Nunito'}}>{pointsData.data.clientPhone}</span></div>
                      <div className="flex-fill"><strong>تاريخ المناسبة:</strong> <span style={{fontFamily:'Nunito'}}>{new Date(pointsData.data.eventDate).toLocaleDateString()}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex-fill"><strong>رقم الوصل:</strong> <span style={{fontFamily:'Nunito'}}>{pointsData.data.receiptNumber}</span></div>
                      <div className="flex-fill"><strong>الوقت:</strong> <span style={{fontFamily:'Nunito'}}>{new Date(pointsData.data.createdAt).toLocaleDateString()}</span></div>
                    </>
                  )}
                </div>
                
                <h5 style={{ fontWeight: 800, color: '#ff758c', marginBottom: '15px' }}>الخدمات المطلوبة 🛠️</h5>
                
                <div className="table-responsive">
                  <Table borderless style={{ background: 'transparent' }}>
                    <thead>
                      <tr style={{ background: '#ffe1ea', color: '#ff758c', borderRadius: '10px' }}>
                        <th style={{ borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>الخدمة</th>
                        <th>الحالة</th>
                        <th style={{ borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }} className="text-center">تأكيد</th>
                      </tr>
                    </thead>
                    <tbody style={{ background: 'transparent' }}>
                      {(pointsData.type === 'booking' ? pointsData.data.packageServices : pointsData.data.services)?.map((srv, index) => {
                        const serviceId = typeof srv._id === 'object' && srv._id._id ? srv._id._id.toString() : (srv._id ? srv._id.toString() : `service-${index}`);
                        return (
                          <tr key={serviceId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td className="align-middle fw-bold">{srv.name || 'غير معروف'}</td>
                            <td className="align-middle">
                              {srv.executed ? (
                                <span className="text-success fw-bold">نفذت عبر: {srv.executedBy?.username || 'غير معروف'} ✔️</span>
                              ) : (
                                <span className="text-muted">قيد الانتظار</span>
                              )}
                            </td>
                            <td className="align-middle text-center">
                              {!srv.executed && (
                                <Button
                                  className="game-btn"
                                  style={{ padding: '6px 16px', fontSize: '13px' }}
                                  onClick={() => handleExecuteService(serviceId, pointsData.type, pointsData.data._id)}
                                >
                                  تأكيد التنفيذ ✔️
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pointsData.type === 'booking' && pointsData.data.hairStraightening && (
                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td className="align-middle fw-bold">فرد شعر</td>
                          <td className="align-middle">
                            {pointsData.data.hairStraighteningExecuted ? (
                              <span className="text-success fw-bold">نفذت عبر: {pointsData.data.hairStraighteningExecutedBy?.username || 'غير معروف'} ✔️</span>
                            ) : (
                              <span className="text-muted">قيد الانتظار</span>
                            )}
                          </td>
                          <td className="align-middle text-center">
                            {!pointsData.data.hairStraighteningExecuted && (
                              <Button
                                className="game-btn"
                                style={{ padding: '6px 16px', fontSize: '13px' }}
                                onClick={() => handleExecuteService('hairStraightening', 'booking', pointsData.data._id)}
                              >
                                تأكيد التنفيذ ✔️
                              </Button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}

export default EmployeeDashboard;
