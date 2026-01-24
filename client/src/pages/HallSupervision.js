import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Container, Row, Col, Card, Alert, Form, Button, Table, Spinner, Badge, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';

const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 38000, 73000, 118000, 178000, 268000, 418000];
const MAX_LEVEL = 10;

const newId = (prefix = 'loc') => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const normalizeId = (val) => {
  if (!val) return '';
  if (typeof val === 'object' && val._id) return val._id.toString();
  return val.toString();
};

const isSameDay = (value, targetDate) => {
  if (!value || !targetDate) return false;
  const d = new Date(value);
  return d.toDateString() === targetDate.toDateString();
};

const getLevel = (totalPoints = 0) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) return Math.min(i + 1, MAX_LEVEL);
  }
  return 1;
};

function HallSupervision() {
  const { collections, queueOperation } = useRxdb() || {};
  const [bookings, setBookings] = useState({
    makeupBookings: [],
    hairStraighteningBookings: [],
    hairDyeBookings: [],
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
  const [rawBookings, setRawBookings] = useState([]);
  const [rawInstantServices, setRawInstantServices] = useState([]);

  const employeeOptions = useMemo(
    () => users.filter(u => u.role === 'employee' || u.role === 'hallSupervisor'),
    [users]
  );

  const executedByName = (val) => {
    if (!val) return 'غير معروف';
    if (typeof val === 'object' && val.username) return val.username;
    const id = normalizeId(val);
    const found = users.find(u => normalizeId(u._id) === id);
    return found?.username || 'غير معروف';
  };

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

  const loadData = useCallback(async () => {
    if (!collections) return;
    setLoading(true);
    try {
      const [bkDocs, instDocs, userDocs] = await Promise.all([
        collections.bookings?.find({ selector: { _deleted: { $ne: true } } }).exec(),
        collections.instantServices?.find({ selector: { _deleted: { $ne: true } } }).exec(),
        collections.users?.find({ selector: { _deleted: { $ne: true } } }).exec()
      ]);
      setRawBookings((bkDocs || []).map((d) => (d.toJSON ? d.toJSON() : d)));
      setRawInstantServices((instDocs || []).map((d) => (d.toJSON ? d.toJSON() : d)));
      setUsers((userDocs || []).map((d) => (d.toJSON ? d.toJSON() : d)));
      showToast('تم تحديث البيانات من القاعدة المحلية', 'success');
    } catch (err) {
      console.error('Load hall supervision error:', err.message);
      showToast('خطأ في جلب البيانات من القاعدة المحلية', 'danger');
    } finally {
      setLoading(false);
    }
  }, [collections, showToast]);

  useEffect(() => {
    if (!collections) return;
    loadData();
  }, [collections, loadData]);

  const startOfDay = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const endOfDay = useMemo(() => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [date]);

  useEffect(() => {
    const filteredBookings = rawBookings.filter((b) => {
      const hasMakeup = b.package?.type === 'makeup' && isSameDay(b.eventDate, startOfDay);
      const hasHenna = b.hennaPackage && isSameDay(b.hennaDate, startOfDay);
      const hasPhoto = b.photographyPackage && (isSameDay(b.eventDate, startOfDay) || isSameDay(b.hennaDate, startOfDay));
      const hasHairStraightening = b.hairStraightening && isSameDay(b.hairStraighteningDate, startOfDay);
      const hasHairDye = b.hairDye && isSameDay(b.hairDyeDate, startOfDay);
      return hasMakeup || hasHenna || hasPhoto || hasHairStraightening || hasHairDye;
    });

    const makeupBookings = filteredBookings.filter((booking) => (
      (booking.package?.type === 'makeup' && isSameDay(booking.eventDate, startOfDay)) ||
      (booking.hennaPackage && isSameDay(booking.hennaDate, startOfDay))
    ));
    const hairStraighteningBookings = filteredBookings.filter((booking) => booking.hairStraightening && isSameDay(booking.hairStraighteningDate, startOfDay));
    const hairDyeBookings = filteredBookings.filter((booking) => booking.hairDye && isSameDay(booking.hairDyeDate, startOfDay));
    const photographyBookings = filteredBookings.filter((booking) => (
      (booking.photographyPackage && isSameDay(booking.eventDate, startOfDay)) ||
      (booking.photographyPackage && isSameDay(booking.hennaDate, startOfDay))
    ));

    setBookings({ makeupBookings, hairStraighteningBookings, hairDyeBookings, photographyBookings });
  }, [rawBookings, startOfDay]);

  useEffect(() => {
    const filtered = rawInstantServices.filter((srv) => {
      const created = srv.createdAt ? new Date(srv.createdAt) : null;
      return created && created >= startOfDay && created <= endOfDay;
    });
    setInstantServices(filtered);
  }, [rawInstantServices, startOfDay, endOfDay]);

  const findBookingByReceipt = useCallback((receipt) => (
    rawBookings.find((b) => (b.receiptNumber || '').toString() === receipt)
  ), [rawBookings]);

  const findInstantByReceipt = useCallback((receipt) => (
    rawInstantServices.find((s) => (s.receiptNumber || '').toString() === receipt)
  ), [rawInstantServices]);

  const handleReceiptSearch = useCallback((searchValue) => {
    const normalized = (searchValue ?? '').toString().trim();
    if (!normalized) {
      showToast('الرجاء إدخال رقم الوصل', 'warning');
      return;
    }

    const booking = findBookingByReceipt(normalized);
    if (booking) {
      setSearchResult({ type: 'booking', data: booking });
      showToast('تم العثور على الحجز من القاعدة المحلية', 'success');
      return;
    }

    const instantService = findInstantByReceipt(normalized);
    if (instantService) {
      setSearchResult({ type: 'instant', data: instantService });
      showToast('تم العثور على خدمة فورية من القاعدة المحلية', 'success');
      return;
    }

    setSearchResult(null);
    showToast('لم يتم العثور على حجز أو خدمة فورية بهذا الرقم', 'warning');
  }, [findBookingByReceipt, findInstantByReceipt, showToast]);

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

  const ensureUserArrays = (user) => {
    if (!Array.isArray(user.points)) user.points = [];
    if (!Array.isArray(user.efficiencyCoins)) user.efficiencyCoins = [];
    if (!Array.isArray(user.coinsRedeemed)) user.coinsRedeemed = [];
  };

  const recomputeConvertible = (user) => {
    const totalCoins = (user.efficiencyCoins?.length || 0) + (user.coinsRedeemed?.length || 0);
    user.convertiblePoints = Math.max(0, (user.totalPoints || 0) - totalCoins * 1000);
  };

  const mutateUser = useCallback(async (userId, mutator) => {
    const target = users.find((u) => normalizeId(u._id) === normalizeId(userId));
    if (!target) throw new Error('الموظف مش موجود محلياً');
    const draft = {
      ...target,
      points: Array.isArray(target.points) ? [...target.points] : [],
      efficiencyCoins: Array.isArray(target.efficiencyCoins) ? [...target.efficiencyCoins] : [],
      coinsRedeemed: Array.isArray(target.coinsRedeemed) ? [...target.coinsRedeemed] : []
    };
    ensureUserArrays(draft);
    const updated = mutator(draft) || draft;
    recomputeConvertible(updated);
    updated.level = getLevel(updated.totalPoints || 0);
    await upsertLocal('users', updated, 'update');
    return updated;
  }, [upsertLocal, users]);

  const addPointsToUser = useCallback(async (userId, amount, meta = {}) => {
    await mutateUser(userId, (draft) => {
      draft.points.push({
        _id: newId('point'),
        amount,
        date: new Date().toISOString(),
        bookingId: meta.bookingId || null,
        serviceId: meta.serviceId || null,
        instantServiceId: meta.instantServiceId || null,
        serviceName: meta.serviceName || null,
        receiptNumber: meta.receiptNumber || null,
        type: meta.type || 'work',
        note: meta.note || null,
        status: 'applied'
      });
      draft.totalPoints = (draft.totalPoints || 0) + amount;
      return draft;
    });
  }, [mutateUser]);

  const removePointsFromUser = useCallback(async (userId, matchFn) => {
    await mutateUser(userId, (draft) => {
      const targetPoint = draft.points.find(matchFn);
      if (!targetPoint) return draft;
      const pointIdStr = normalizeId(targetPoint._id);
      draft.efficiencyCoins = draft.efficiencyCoins.filter((c) => normalizeId(c.sourcePointId) !== pointIdStr);
      draft.totalPoints = Math.max(0, (draft.totalPoints || 0) - (targetPoint.amount || 0));
      draft.points = draft.points.filter((p) => normalizeId(p._id) !== pointIdStr);
      return draft;
    });
  }, [mutateUser]);

  const updateBookingState = (updatedBooking) => {
    const targetId = normalizeId(updatedBooking._id);
    setBookings(prev => ({
      makeupBookings: prev.makeupBookings.map(b => (normalizeId(b._id) === targetId ? updatedBooking : b)),
      hairStraighteningBookings: prev.hairStraighteningBookings.map(b => (normalizeId(b._id) === targetId ? updatedBooking : b)),
      hairDyeBookings: prev.hairDyeBookings.map(b => (normalizeId(b._id) === targetId ? updatedBooking : b)),
      photographyBookings: prev.photographyBookings.map(b => (normalizeId(b._id) === targetId ? updatedBooking : b))
    }));

    setSearchResult(prev => {
      if (!prev) return prev;
      if (prev.type === 'booking' && normalizeId(prev.data._id) === targetId) {
        return { ...prev, data: updatedBooking };
      }
      return prev;
    });
  };

  const handleAssign = async (type, recordId, serviceId) => {
    const key = `${type}-${recordId}-${serviceId}`;
    const employeeId = assignments[key];
    if (!employeeId) {
      showToast('اختار موظف للتكليف أولاً', 'warning');
      return;
    }

    try {
      if (type === 'booking') {
        const booking = rawBookings.find((b) => normalizeId(b._id) === normalizeId(recordId));
        if (!booking) throw new Error('الحجز مش موجود محلياً');
        const updated = { ...booking };
        let points = 0;
        let serviceName = 'خدمة باكدج';

        if (serviceId === 'hairStraightening' || serviceId === 'hairDye') {
          const isStraightening = serviceId === 'hairStraightening';
          if (isStraightening) {
            updated.hairStraighteningExecuted = true;
            updated.hairStraighteningExecutedBy = employeeId;
            updated.hairStraighteningExecutedAt = new Date().toISOString();
            points = (updated.hairStraighteningPrice || 0) * 0.15;
            serviceName = 'فرد الشعر';
          } else {
            updated.hairDyeExecuted = true;
            updated.hairDyeExecutedBy = employeeId;
            updated.hairDyeExecutedAt = new Date().toISOString();
            points = (updated.hairDyePrice || 0) * 0.15;
            serviceName = 'صبغة الشعر';
          }
        } else {
          updated.packageServices = (updated.packageServices || []).map((srv) => {
            if (normalizeId(srv._id) !== serviceId) return srv;
            points = (srv.price || 0) * 0.15;
            serviceName = srv.name || serviceName;
            return {
              ...srv,
              executed: true,
              executedBy: employeeId,
              executedAt: new Date().toISOString()
            };
          });
        }

        await upsertLocal('bookings', updated, 'update');
        await addPointsToUser(employeeId, points, {
          bookingId: normalizeId(updated._id),
          serviceId: (serviceId === 'hairStraightening' || serviceId === 'hairDye') ? null : serviceId,
          serviceName,
          receiptNumber: updated.receiptNumber || null
        });

        updateBookingState(updated);
      } else {
        const instantService = rawInstantServices.find((s) => normalizeId(s._id) === normalizeId(recordId));
        if (!instantService) throw new Error('الخدمة الفورية مش موجودة محلياً');
        const updated = { ...instantService };
        let points = 0;

        updated.services = (updated.services || []).map((srv, idx) => {
          const srvId = normalizeId(srv._id) || `instant-${idx}`;
          if (srvId !== serviceId) return srv;
          points = (srv.price || 0) * 0.15;
          return {
            ...srv,
            executed: true,
            executedBy: employeeId,
            executedAt: new Date().toISOString()
          };
        });

        await upsertLocal('instantServices', updated, 'update');
        await addPointsToUser(employeeId, points, {
          bookingId: null,
          instantServiceId: normalizeId(updated._id),
          serviceId: serviceId,
          serviceName: updated.services?.find((s, idx) => (normalizeId(s._id) || `instant-${idx}`) === serviceId)?.name || 'خدمة فورية',
          receiptNumber: updated.receiptNumber || null
        });

        setInstantServices((prev) => prev.map((s) => (normalizeId(s._id) === normalizeId(updated._id) ? updated : s)));
        setSearchResult((prev) => {
          if (!prev) return prev;
          if (prev.type === 'instant' && normalizeId(prev.data._id) === normalizeId(updated._id)) {
            return { ...prev, data: updated };
          }
          return prev;
        });
      }

      showToast('تم التكليف وتسجيل النقاط محلياً', 'success');
    } catch (err) {
      console.error('Assign service error:', err.message);
      showToast(err.message || 'خطأ في التكليف أو تسجيل النقاط', 'danger');
    }
  };

  const handleReset = async (type, recordId, serviceId) => {
    try {
      if (type === 'booking') {
        const booking = rawBookings.find((b) => normalizeId(b._id) === normalizeId(recordId));
        if (!booking) throw new Error('الحجز مش موجود محلياً');
        const updated = { ...booking };
        let oldEmployeeId = null;

        if (serviceId === 'hairStraightening' || serviceId === 'hairDye') {
          const isStraightening = serviceId === 'hairStraightening';
          const executed = isStraightening ? updated.hairStraighteningExecuted : updated.hairDyeExecuted;
          const execBy = isStraightening ? updated.hairStraighteningExecutedBy : updated.hairDyeExecutedBy;
          if (!executed || !execBy) throw new Error('الخدمة مش منفذة علشان تتسحب');
          oldEmployeeId = execBy;
          if (isStraightening) {
            updated.hairStraighteningExecuted = false;
            updated.hairStraighteningExecutedBy = null;
            updated.hairStraighteningExecutedAt = null;
          } else {
            updated.hairDyeExecuted = false;
            updated.hairDyeExecutedBy = null;
            updated.hairDyeExecutedAt = null;
          }
        } else {
          updated.packageServices = (updated.packageServices || []).map((srv) => {
            if (normalizeId(srv._id) !== serviceId) return srv;
            oldEmployeeId = srv.executedBy;
            return {
              ...srv,
              executed: false,
              executedBy: null,
              executedAt: null
            };
          });
          if (!oldEmployeeId) throw new Error('الخدمة مش منفذة علشان تتسحب');
        }

        await upsertLocal('bookings', updated, 'update');
        if (oldEmployeeId) {
          await removePointsFromUser(oldEmployeeId, (p) => (
            normalizeId(p.bookingId) === normalizeId(updated._id) && (
              ((serviceId === 'hairStraightening' || serviceId === 'hairDye') && !p.serviceId) ||
              (serviceId !== 'hairStraightening' && serviceId !== 'hairDye' && normalizeId(p.serviceId) === serviceId)
            )
          ));
        }

        updateBookingState(updated);
      } else {
        const instantService = rawInstantServices.find((s) => normalizeId(s._id) === normalizeId(recordId));
        if (!instantService) throw new Error('الخدمة الفورية مش موجودة محلياً');
        const updated = { ...instantService };
        let oldEmployeeId = null;

        updated.services = (updated.services || []).map((srv, idx) => {
          const srvId = normalizeId(srv._id) || `instant-${idx}`;
          if (srvId !== serviceId) return srv;
          oldEmployeeId = srv.executedBy;
          return {
            ...srv,
            executed: false,
            executedBy: null,
            executedAt: null
          };
        });

        if (!oldEmployeeId) throw new Error('الخدمة مش منفذة علشان تتسحب');

        await upsertLocal('instantServices', updated, 'update');
        await removePointsFromUser(oldEmployeeId, (p) => (
          normalizeId(p.instantServiceId) === normalizeId(updated._id) && normalizeId(p.serviceId) === serviceId
        ));

        setInstantServices((prev) => prev.map((s) => (normalizeId(s._id) === normalizeId(updated._id) ? updated : s)));
        setSearchResult((prev) => {
          if (!prev) return prev;
          if (prev.type === 'instant' && normalizeId(prev.data._id) === normalizeId(updated._id)) {
            return { ...prev, data: updated };
          }
          return prev;
        });
      }

      showToast('تم سحب التكليف محلياً وإلغاء النقاط', 'info');
    } catch (err) {
      console.error('Reset service error:', err.message);
      showToast(err.message || 'خطأ في سحب التكليف', 'danger');
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
            className="assign-select"
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
            className="assign-select"
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

  const renderHairDyeRow = (booking) => {
    const key = `booking-${normalizeId(booking._id)}-hairDye`;
    return (
      <tr key={`hair-dye-${normalizeId(booking._id)}`}>
        <td>صبغة الشعر</td>
        <td>{booking.hairDyePrice || 0} ج</td>
        <td>
          {booking.hairDyeExecuted ? (
            <Badge bg="success">تم بواسطة {executedByName(booking.hairDyeExecutedBy)}</Badge>
          ) : (
            <Badge bg="secondary">لم يتم</Badge>
          )}
        </td>
        <td>
          <Form.Select
            value={assignments[key] || ''}
            onChange={(e) => handleAssignChange(key, e.target.value)}
            disabled={booking.hairDyeExecuted}
            className="assign-select"
          >
            <option value="">اختر الموظف</option>
            {employeeOptions.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.username}</option>
            ))}
          </Form.Select>
        </td>
        <td className="text-center d-flex gap-1 flex-wrap justify-content-center action-cell">
          {!booking.hairDyeExecuted ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleAssign('booking', booking._id, 'hairDye')}
              disabled={!assignments[key]}
            >
              تكليف
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => handleReset('booking', booking._id, 'hairDye')}
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
    ...bookings.hairDyeBookings,
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
                <p>
                  الباكدج: {' '}
                  {(() => {
                    const names = [];
                    if (searchResult.data.package?.name) names.push(searchResult.data.package.name);
                    if (searchResult.data.hennaPackage?.name) names.push(searchResult.data.hennaPackage.name);
                    if (searchResult.data.photographyPackage?.name) names.push(searchResult.data.photographyPackage.name);
                    return names.length > 0 ? names.join(' + ') : 'غير محدد';
                  })()}
                </p>
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
                    {searchResult.data.hairDye && renderHairDyeRow(searchResult.data)}
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
                <Col xs={12} key={`${booking._id}-${idx}`} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Card.Title className="d-flex justify-content-between align-items-start">
                        <div>
                          <span>{idx + 1}. {booking.clientName}</span>
                          <div className="text-secondary small mt-1" style={{ fontSize: '0.9rem' }}>
                            {(() => {
                              const names = [];
                              if (booking.package?.name) names.push(booking.package.name);
                              if (booking.hennaPackage?.name) names.push(booking.hennaPackage.name);
                              if (booking.photographyPackage?.name) names.push(booking.photographyPackage.name);
                              return names.length > 0 ? names.join(' + ') : '';
                            })()}
                          </div>
                        </div>
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
                          {booking.hairDye && renderHairDyeRow(booking)}
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
                <Col xs={12} key={service._id} className="mb-3">
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
                                    className="assign-select"
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
