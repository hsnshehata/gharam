import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faQrcode, faGift, faCoins, faBolt, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';

const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 38000, 73000, 118000, 178000, 268000, 418000];
const COIN_VALUES = [0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600];
const MAX_LEVEL = 10;

const COIN_COLORS = {
  1: '#c0c7d1',
  2: '#d4af37',
  3: '#e74c3c',
  4: '#27ae60',
  5: '#2980b9',
  6: '#8e44ad',
  default: '#2c3e50'
};

const newId = (prefix = 'loc') => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const normalizeId = (entity) => (entity?._id || entity?.id || '').toString();

const isInRange = (dateValue, start, end) => {
  if (!dateValue) return false;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return false;
  return dt >= start && dt <= end;
};

const getLevel = (totalPoints = 0) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return Math.min(i + 1, MAX_LEVEL);
    }
  }
  return 1;
};

const getCoinValue = (level) => {
  const lvl = Math.min(level, MAX_LEVEL);
  return COIN_VALUES[lvl] || 100;
};

function EmployeeDashboard({ user }) {
  const { collections, queueOperation } = useRxdb() || {};
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [pointsData, setPointsData] = useState(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [redeemCount, setRedeemCount] = useState(1);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertCelebration, setConvertCelebration] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [rawBookings, setRawBookings] = useState([]);
  const [rawInstantServices, setRawInstantServices] = useState([]);
  const [users, setUsers] = useState([]);
  const qrCodeScanner = useRef(null);
  const { showToast } = useToast();

  const startOfDay = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const endOfDay = useMemo(() => {
    const d = new Date(startOfDay);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [startOfDay]);

  const upsertLocal = useCallback(async (collectionName, doc, op = 'update') => {
    const col = collections?.[collectionName];
    if (!col) throw new Error('قاعدة البيانات غير جاهزة');
    const payload = { ...doc, updatedAt: new Date().toISOString() };
    await col.upsert(payload);
    if (queueOperation) await queueOperation(collectionName, op, payload);
    return payload;
  }, [collections, queueOperation]);

  useEffect(() => {
    if (!collections) return undefined;
    const subs = [];
    const listen = (col, setter) => {
      if (!col) return;
      const sub = col.find({ selector: { _deleted: { $ne: true } } }).$.subscribe((docs) => {
        setter(docs.map((d) => (d.toJSON ? d.toJSON() : d)));
      });
      subs.push(sub);
    };
    listen(collections.bookings, setRawBookings);
    listen(collections.instantServices, setRawInstantServices);
    listen(collections.users, setUsers);
    return () => subs.forEach((s) => s && s.unsubscribe && s.unsubscribe());
  }, [collections]);

  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const key = normalizeId(u);
      if (key) map.set(key, u);
    });
    return map;
  }, [users]);

  const getUsername = useCallback((value) => {
    const id = normalizeId(value);
    if (!id) return 'غير معروف';
    const found = usersMap.get(id);
    if (found?.username) return found.username;
    if (typeof value === 'object' && value.username) return value.username;
    return 'غير معروف';
  }, [usersMap]);

  const currentUserId = useMemo(() => normalizeId(user), [user]);
  const currentUser = useMemo(() => usersMap.get(currentUserId) || null, [usersMap, currentUserId]);

  const ensurePointsArrays = (draft) => {
    if (!Array.isArray(draft.points)) draft.points = [];
    if (!Array.isArray(draft.efficiencyCoins)) draft.efficiencyCoins = [];
    if (!Array.isArray(draft.coinsRedeemed)) draft.coinsRedeemed = [];
  };

  const recomputeConvertible = useCallback((draft) => {
    const coinsEarned = (draft.efficiencyCoins?.length || 0) + (draft.coinsRedeemed?.length || 0);
    draft.convertiblePoints = Math.max(0, (draft.totalPoints || 0) - coinsEarned * 1000);
    return draft;
  }, []);

  const mutateUser = useCallback(async (mutator, op = 'update') => {
    if (!currentUserId) throw new Error('لا يوجد مستخدم');
    const base = {
      ...currentUser,
      points: Array.isArray(currentUser?.points) ? [...currentUser.points] : [],
      efficiencyCoins: Array.isArray(currentUser?.efficiencyCoins) ? [...currentUser.efficiencyCoins] : [],
      coinsRedeemed: Array.isArray(currentUser?.coinsRedeemed) ? [...currentUser.coinsRedeemed] : []
    };
    ensurePointsArrays(base);
    const updated = mutator(base) || base;
    recomputeConvertible(updated);
    updated.level = getLevel(updated.totalPoints || 0);
    await upsertLocal('users', updated, op);
    return updated;
  }, [currentUser, currentUserId, recomputeConvertible, upsertLocal]);

  const addWorkPoints = useCallback(async (amount, meta = {}) => {
    if (!currentUser) return;
    await mutateUser((draft) => {
      ensurePointsArrays(draft);
      draft.points.push({
        _id: newId('point'),
        amount,
        date: new Date().toISOString(),
        bookingId: meta.bookingId || null,
        instantServiceId: meta.instantServiceId || null,
        serviceId: meta.serviceId || null,
        serviceName: meta.serviceName || null,
        receiptNumber: meta.receiptNumber || null,
        type: meta.type || 'work',
        note: meta.note || null,
        status: 'applied'
      });
      draft.totalPoints = (draft.totalPoints || 0) + amount;
      draft.convertiblePoints = (draft.convertiblePoints || 0) + amount;
      return draft;
    });
  }, [currentUser, mutateUser]);

  const pointsSummary = useMemo(() => {
    if (!currentUser) return null;
    const totalPoints = currentUser.totalPoints || 0;
    const level = getLevel(totalPoints);
    const coins = currentUser.efficiencyCoins || [];
    const coinsByLevel = coins.reduce((acc, c) => {
      const lvl = c.level || level;
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    }, {});
    const coinsTotalValue = coins.reduce((sum, c) => sum + (c.value || 0), 0);
    const convertiblePoints = currentUser.convertiblePoints ?? Math.max(0, totalPoints - coins.length * 1000);
    const currentLevelStart = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelTarget = level >= MAX_LEVEL ? LEVEL_THRESHOLDS[MAX_LEVEL - 1] : LEVEL_THRESHOLDS[level];
    const progressCurrent = Math.max(0, totalPoints - currentLevelStart);
    const progressNeeded = level >= MAX_LEVEL ? 0 : Math.max(1, nextLevelTarget - currentLevelStart);
    const progressPercent = level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((progressCurrent / progressNeeded) * 100));

    return {
      totalPoints,
      level,
      currentCoinValue: getCoinValue(level),
      convertiblePoints,
      remainingSalary: currentUser.remainingSalary || 0,
      coins: {
        totalCount: coins.length,
        totalValue: coinsTotalValue,
        byLevel: coinsByLevel
      },
      progress: {
        current: progressCurrent,
        target: progressNeeded,
        nextLevelTarget,
        percent: progressPercent
      }
    };
  }, [currentUser]);

  const pendingGifts = useMemo(() => (
    (currentUser?.points || []).filter((p) => p.type === 'gift' && p.status === 'pending')
  ), [currentUser]);

  const todayGifts = useMemo(() => (
    (currentUser?.points || [])
      .filter((p) => p.type === 'gift' && p.status === 'applied' && isInRange(p.openedAt || p.date, startOfDay, endOfDay))
      .map((p) => ({
        _id: p._id,
        amount: p.amount,
        note: p.note,
        giftedByName: p.giftedByName || 'الإدارة',
        openedAt: p.openedAt || p.date
      }))
  ), [currentUser, startOfDay, endOfDay]);

  const executedServices = useMemo(() => {
    if (!currentUserId) return [];
    const executedList = [];
    const pushItem = (payload) => executedList.push(payload);

    rawBookings.forEach((b) => {
      (b.packageServices || []).forEach((srv) => {
        if (srv.executed && (srv.executedBy?._id || srv.executedBy)?.toString() === currentUserId && isInRange(srv.executedAt, startOfDay, endOfDay)) {
          pushItem({
            source: 'booking',
            receiptNumber: b.receiptNumber || '-',
            serviceName: srv.name || 'خدمة باكدج',
            clientName: b.clientName || '—',
            points: Math.round((srv.price || 0) * 0.15),
            executedAt: srv.executedAt || b.createdAt,
            executedBy: usersMap.get(currentUserId)?.username || null
          });
        }
      });

      if (b.hairStraighteningExecuted && (b.hairStraighteningExecutedBy?._id || b.hairStraighteningExecutedBy)?.toString() === currentUserId && isInRange(b.hairStraighteningExecutedAt, startOfDay, endOfDay)) {
        pushItem({
          source: 'booking',
          receiptNumber: b.receiptNumber || '-',
          serviceName: 'فرد الشعر',
          clientName: b.clientName || '—',
          points: Math.round((b.hairStraighteningPrice || 0) * 0.15),
          executedAt: b.hairStraighteningExecutedAt || b.createdAt,
          executedBy: usersMap.get(currentUserId)?.username || null
        });
      }

      if (b.hairDyeExecuted && (b.hairDyeExecutedBy?._id || b.hairDyeExecutedBy)?.toString() === currentUserId && isInRange(b.hairDyeExecutedAt, startOfDay, endOfDay)) {
        pushItem({
          source: 'booking',
          receiptNumber: b.receiptNumber || '-',
          serviceName: 'صبغة الشعر',
          clientName: b.clientName || '—',
          points: Math.round((b.hairDyePrice || 0) * 0.15),
          executedAt: b.hairDyeExecutedAt || b.createdAt,
          executedBy: usersMap.get(currentUserId)?.username || null
        });
      }
    });

    rawInstantServices.forEach((inst) => {
      (inst.services || []).forEach((srv) => {
        if (srv.executed && (srv.executedBy?._id || srv.executedBy)?.toString() === currentUserId && isInRange(srv.executedAt, startOfDay, endOfDay)) {
          pushItem({
            source: 'instant',
            receiptNumber: inst.receiptNumber || '-',
            serviceName: srv.name || 'خدمة فورية',
            clientName: '—',
            points: Math.round((srv.price || 0) * 0.15),
            executedAt: srv.executedAt || inst.createdAt,
            executedBy: usersMap.get(currentUserId)?.username || null
          });
        }
      });
    });

    executedList.sort((a, b) => (new Date(b.executedAt || 0).getTime()) - (new Date(a.executedAt || 0).getTime()));
    return executedList;
  }, [currentUserId, rawBookings, rawInstantServices, startOfDay, endOfDay, usersMap]);

  const handleReceiptSearch = useCallback((searchValue) => {
    const normalized = (searchValue ?? '').toString().trim();
    if (!normalized) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }

    const booking = rawBookings.find((b) => b.receiptNumber?.toString() === normalized || b.barcode?.toString() === normalized);
    const instantService = rawInstantServices.find((i) => i.receiptNumber?.toString() === normalized || i.barcode?.toString() === normalized);

    if (booking) {
      setPointsData({ type: 'booking', data: booking });
      setShowPointsModal(true);
      return;
    }
    if (instantService) {
      setPointsData({ type: 'instant', data: instantService });
      setShowPointsModal(true);
      return;
    }
    showToast('لم يتم العثور على حجز أو خدمة فورية بهذا الرقم', 'warning');
  }, [rawBookings, rawInstantServices, showToast]);

  const handleOpenQrModal = () => {
    setShowQrModal(true);
  };

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
  }, [showQrModal, showToast, handleReceiptSearch]);

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptNumber) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }
    await handleReceiptSearch(receiptNumber);
  };

  const handleConvertPoints = async () => {
    if (!pointsSummary) return;
    const convertible = Math.floor((pointsSummary.convertiblePoints || 0) / 1000);
    if (convertible < 1) {
      showToast('لا توجد نقاط كافية للتحويل', 'warning');
      return;
    }
    try {
      setConverting(true);
      await mutateUser((draft) => {
        ensurePointsArrays(draft);
        const level = getLevel(draft.totalPoints || 0);
        const coinValue = getCoinValue(level);
        for (let i = 0; i < convertible; i += 1) {
          draft.efficiencyCoins.push({
            level,
            value: coinValue,
            earnedAt: new Date().toISOString(),
            sourcePointId: null,
            receiptNumber: null
          });
        }
        draft.convertiblePoints = Math.max(0, (draft.convertiblePoints || 0) - (convertible * 1000));
        return draft;
      });
      showToast(`تم تحويل ${convertible} عملة جديدة`, 'success');
      setConvertCelebration(true);
      setTimeout(() => setConvertCelebration(false), 1200);
    } catch (err) {
      console.error('Convert error:', err);
      showToast('تعذر تحويل النقاط الآن', 'danger');
    } finally {
      setConverting(false);
    }
  };

  const handleRedeemCoins = async () => {
    if (!pointsSummary) return;
    if (!redeemCount || redeemCount <= 0) {
      showToast('اختار عدد العملات للاستبدال', 'warning');
      return;
    }
    if (redeemCount > pointsSummary.coins.totalCount) {
      showToast('عدد العملات المطلوب أكبر من المتاح', 'warning');
      return;
    }
    try {
      setRedeeming(true);
      await mutateUser((draft) => {
        ensurePointsArrays(draft);
        const coinsToRedeem = draft.efficiencyCoins.slice(0, redeemCount);
        draft.efficiencyCoins = draft.efficiencyCoins.slice(redeemCount);
        const totalValue = coinsToRedeem.reduce((sum, c) => sum + (c.value || 0), 0);
        coinsToRedeem.forEach((c) => {
          draft.coinsRedeemed.push({
            level: c.level,
            value: c.value,
            redeemedAt: new Date().toISOString(),
            sourcePointId: c.sourcePointId || null
          });
        });
        draft.remainingSalary = (draft.remainingSalary || 0) + totalValue;
        return draft;
      });
      showToast('تم استبدال العملات وإضافتها للراتب الحالي', 'success');
      setShowRedeemModal(false);
    } catch (err) {
      console.error('Redeem error:', err);
      showToast('تعذر استبدال العملات', 'danger');
    } finally {
      setRedeeming(false);
    }
  };

  const handleExecuteService = async (serviceId, type, recordId) => {
    const employeeId = currentUserId;
    if (!employeeId) {
      showToast('حساب الموظف غير محدد، سجل دخول تاني وحاول', 'danger');
      return;
    }
    try {
      if (type === 'booking') {
        const booking = rawBookings.find((b) => normalizeId(b) === recordId);
        if (!booking) throw new Error('الحجز غير موجود محلياً');
        const updated = { ...booking };
        let points = 0;
        let serviceName = 'غير معروف';
        const now = new Date().toISOString();

        if (serviceId === 'hairStraightening' || serviceId === 'hairDye') {
          const isStraightening = serviceId === 'hairStraightening';
          const enabled = isStraightening ? updated.hairStraightening : updated.hairDye;
          const already = isStraightening ? updated.hairStraighteningExecuted : updated.hairDyeExecuted;
          if (!enabled || already) {
            showToast('الخدمة تم تنفيذها أو غير مفعّلة', 'warning');
            return;
          }
          if (isStraightening) {
            updated.hairStraighteningExecuted = true;
            updated.hairStraighteningExecutedBy = employeeId;
            updated.hairStraighteningExecutedAt = now;
            points = (updated.hairStraighteningPrice || 0) * 0.15;
            serviceName = 'فرد الشعر';
          } else {
            updated.hairDyeExecuted = true;
            updated.hairDyeExecutedBy = employeeId;
            updated.hairDyeExecutedAt = now;
            points = (updated.hairDyePrice || 0) * 0.15;
            serviceName = 'صبغة الشعر';
          }
        } else {
          const srv = (updated.packageServices || []).find((s) => normalizeId(s) === serviceId || normalizeId(s._id) === serviceId);
          if (!srv) {
            showToast('الخدمة غير موجودة في الحجز', 'warning');
            return;
          }
          if (srv.executed) {
            showToast('الخدمة منفذة بالفعل', 'warning');
            return;
          }
          srv.executed = true;
          srv.executedBy = employeeId;
          srv.executedAt = now;
          points = (srv.price || 0) * 0.15;
          serviceName = srv.name || 'خدمة باكدج';
          updated.packageServices = [...updated.packageServices];
        }

        await upsertLocal('bookings', updated, 'update');
        await addWorkPoints(points, {
          bookingId: updated._id,
          serviceId: serviceId === 'hairStraightening' || serviceId === 'hairDye' ? null : serviceId,
          serviceName,
          receiptNumber: updated.receiptNumber || null,
          type: 'work'
        });
        setPointsData({ type: 'booking', data: updated });
        setShowPointsModal(true);
        showToast('تم تنفيذ الخدمة محلياً وسيتم رفعها عند الاتصال', 'success');
      } else {
        const instant = rawInstantServices.find((i) => normalizeId(i) === recordId);
        if (!instant) throw new Error('الخدمة الفورية غير موجودة محلياً');
        const updated = { ...instant };
        const srv = (updated.services || []).find((s) => normalizeId(s) === serviceId || normalizeId(s._id) === serviceId);
        if (!srv) {
          showToast('الخدمة غير موجودة', 'warning');
          return;
        }
        if (srv.executed) {
          showToast('الخدمة منفذة بالفعل', 'warning');
          return;
        }
        const now = new Date().toISOString();
        srv.executed = true;
        srv.executedBy = employeeId;
        srv.executedAt = now;
        updated.services = [...updated.services];

        await upsertLocal('instantServices', updated, 'update');
        await addWorkPoints((srv.price || 0) * 0.15, {
          instantServiceId: updated._id,
          serviceId,
          serviceName: srv.name || 'خدمة فورية',
          receiptNumber: updated.receiptNumber || null,
          type: 'work'
        });
        setPointsData({ type: 'instant', data: updated });
        setShowPointsModal(true);
        showToast('تم تنفيذ الخدمة محلياً وسيتم رفعها عند الاتصال', 'success');
      }
    } catch (err) {
      console.error('Execute service error:', err);
      showToast('خطأ في تنفيذ الخدمة محلياً', 'danger');
    }
  };

  const handleOpenGift = async (giftId) => {
    try {
      await mutateUser((draft) => {
        ensurePointsArrays(draft);
        const target = (draft.points || []).find((p) => p._id?.toString() === giftId && p.type === 'gift' && p.status === 'pending');
        if (!target) return draft;
        target.status = 'applied';
        target.openedAt = new Date().toISOString();
        const amount = Number(target.amount) || 0;
        draft.totalPoints = (draft.totalPoints || 0) + amount;
        draft.convertiblePoints = (draft.convertiblePoints || 0) + amount;
        return draft;
      });
      showToast('تم فتح الهدية وإضافة النقاط', 'success');
    } catch (err) {
      console.error('Gift open error:', err);
      showToast('تعذر فتح الهدية الآن', 'danger');
    }
  };

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

  const fetchAllData = useCallback(() => {
    setLoadingData(true);
    setTimeout(() => setLoadingData(false), 250);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const coinsCount = pointsSummary?.coins?.totalCount || 0;
  const topCoinLevel = getTopCoinLevel(pointsSummary?.coins?.byLevel || {});
  const topCoinColor = getCoinColor(topCoinLevel);
  const convertiblePoints = pointsSummary?.convertiblePoints || 0;
  const canConvert = convertiblePoints >= 1000;
  const remainingSalary = pointsSummary?.remainingSalary || 0;

  const executedServicesList = useMemo(() => executedServices, [executedServices]);

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
                    <p>الخدمات المرتجعة: {pointsData.data.returnedServices.map((srv) => srv.name).join(', ')}</p>
                  )}
                  {pointsData.data.extraServices?.length > 0 && (
                    <p>الخدمات الإضافية: {pointsData.data.extraServices.map((srv) => srv.name).join(', ')}</p>
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
                                `نفذت بواسطة ${getUsername(srv.executedBy)}`
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
                                `نفذت بواسطة ${getUsername(pointsData.data.hairStraighteningExecutedBy)}`
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
                  <p>الموظف: {pointsData.data.services.find((srv) => srv.executed && srv.executedBy) ? getUsername(pointsData.data.services.find((srv) => srv.executed && srv.executedBy).executedBy) : 'غير محدد'}</p>
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
                              `نفذت بواسطة ${getUsername(srv.executedBy)}`
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
