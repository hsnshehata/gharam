import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faQrcode, faGift, faCoins, faBolt } from '@fortawesome/free-solid-svg-icons';
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

  const coinsCount = pointsSummary?.coins?.totalCount || 0;
  const topCoinLevel = (() => {
    const byLevel = pointsSummary?.coins?.byLevel || {};
    const levels = Object.keys(byLevel).map(Number).filter((lvl) => !Number.isNaN(lvl) && byLevel[lvl] > 0);
    return levels.length ? Math.max(...levels) : 1;
  })();
  const topCoinColor = COIN_COLORS[topCoinLevel] || COIN_COLORS.default;
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
              <div className="d-flex flex-wrap gap-2">
                {pendingGifts.map((gift) => (
                  <Button key={gift._id} variant="outline-primary" onClick={() => handleOpenGift(gift._id)}>
                    <FontAwesomeIcon icon={faGift} className="me-2" />
                    {gift.amount} نقطة - {gift.note || 'هدية نقاط'}
                  </Button>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {todayGifts.length > 0 && (
        <Alert variant="success" className="d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={faGift} />
          <span>تم فتح {todayGifts.length} هدية اليوم.</span>
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={8}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <Card.Title className="mb-1">رصيدك</Card.Title>
                  <div className="text-muted">النقاط والعملات المتاحة حالياً</div>
                </div>
                <div className="text-end">
                  <div className="fs-4 fw-bold">{pointsSummary?.totalPoints || 0} نقطة</div>
                  <div className="text-muted">مستوى L{pointsSummary?.level || 1}</div>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <div className="coin" style={{ background: topCoinColor }} />
                  <div>
                    <div className="text-muted small">عدد العملات</div>
                    <div className="fw-bold">{coinsCount}</div>
                  </div>
                </div>
                <div>
                  <div className="text-muted small">رصيد قابل للتحويل</div>
                  <div className="fw-bold">{convertiblePoints} نقطة</div>
                </div>
                <div>
                  <div className="text-muted small">الراتب المتبقي</div>
                  <div className="fw-bold">{remainingSalary} ج</div>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Button variant="primary" disabled={!canConvert || converting} onClick={handleConvertPoints}>
                  <FontAwesomeIcon icon={faCoins} className="me-2" />
                  {converting ? 'جارٍ التحويل...' : 'حوّل 1000 نقطة = عملة'}
                </Button>
                <Button variant="outline-primary" onClick={() => setShowRedeemModal(true)} disabled={coinsCount === 0}>
                  <FontAwesomeIcon icon={faBolt} className="me-2" />
                  استبدال العملات
                </Button>
                <Button variant="outline-secondary" onClick={() => setShowQrModal(true)}>
                  <FontAwesomeIcon icon={faQrcode} className="me-2" />
                  اسكان QR للوصل
                </Button>
              </div>
              {convertCelebration && (
                <div className="alert alert-success mb-0">مبروك! تم سك عملات جديدة 🎉</div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>بحث برقم الوصل</Card.Title>
              <Form onSubmit={handleReceiptSubmit} className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="اكتب رقم الوصل أو امسح QR"
                />
                <Button type="submit" variant="primary">بحث</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <Card.Title className="mb-1">الشغل المنفذ اليوم</Card.Title>
                  <div className="text-muted">التاريخ: {new Date(date).toLocaleDateString()}</div>
                </div>
                <span className="badge bg-primary">{executedServicesList.length} خدمة</span>
              </div>
              {executedServicesList.length === 0 ? (
                <Alert variant="info">لا يوجد شغل منفذ النهاردة</Alert>
              ) : (
                <Table striped responsive>
                  <thead>
                    <tr>
                      <th>المصدر</th>
                      <th>الخدمة</th>
                      <th>النقاط</th>
                      <th>وقت التنفيذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executedServicesList.map((srv, idx) => (
                      <tr key={`${srv.receiptNumber}-${idx}`}>
                        <td>{srv.source === 'booking' ? 'حجز' : 'فورية'} #{srv.receiptNumber}</td>
                        <td>{srv.serviceName}</td>
                        <td>{srv.points}</td>
                        <td>{srv.executedAt ? new Date(srv.executedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {pointsData && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>بيانات الوصل</Card.Title>
            <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
              <div className="badge bg-secondary">نوع: {pointsData.type === 'booking' ? 'حجز' : 'فورية'}</div>
              <div className="badge bg-light text-dark">رقم الوصل: {pointsData.data?.receiptNumber || '—'}</div>
            </div>
            <Button variant="outline-primary" className="me-2" onClick={() => handleExecuteService('hairStraightening', 'booking', pointsData.data?._id)}>
              تفعيل فرد الشعر
            </Button>
            <Button variant="outline-primary" className="me-2" onClick={() => handleExecuteService('hairDye', 'booking', pointsData.data?._id)}>
              تفعيل صبغة الشعر
            </Button>
            {(pointsData.data?.packageServices || pointsData.data?.services || []).map((srv) => (
              <Button
                key={srv._id?._id || srv._id}
                variant={srv.executed ? 'success' : 'primary'}
                className="me-2 mt-2"
                disabled={srv.executed}
                onClick={() => handleExecuteService(srv._id?._id || srv._id, pointsData.type === 'booking' ? 'booking' : 'instant', pointsData.data?._id)}
              >
                {srv.executed ? <FontAwesomeIcon icon={faCheck} className="me-2" /> : null}
                {srv.name || 'خدمة'} - {srv.price || 0} ج
              </Button>
            ))}
          </Card.Body>
        </Card>
      )}

      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>امسح QR للوصول</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div id="qr-reader" style={{ width: '100%' }} />
        </Modal.Body>
      </Modal>

      <Modal show={showPointsModal} onHide={() => setShowPointsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل الوصل</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pointsData && (
            <div>
              <p>رقم الوصل: {pointsData.data?.receiptNumber || '—'}</p>
              <p>النوع: {pointsData.type === 'booking' ? 'حجز' : 'خدمة فورية'}</p>
              {pointsData.type === 'booking' && (
                <>
                  <p>اسم العميل: {pointsData.data?.clientName || '—'}</p>
                  <p>خدمات الباكدج: {(pointsData.data?.packageServices || []).length}</p>
                </>
              )}
              {pointsData.type === 'instant' && (
                <p>إجمالي: {pointsData.data?.total || 0} ج</p>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showRedeemModal} onHide={() => setShowRedeemModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>استبدال العملات</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>عدد العملات</Form.Label>
            <Form.Control type="number" min="1" max={coinsCount} value={redeemCount} onChange={(e) => setRedeemCount(Number(e.target.value) || 0)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRedeemModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleRedeemCoins} disabled={redeeming || coinsCount === 0}>
            {redeeming ? 'جارٍ الاستبدال...' : 'استبدال'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default EmployeeDashboard;
