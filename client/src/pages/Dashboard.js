import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPrint, faEdit, faEye, faDollarSign, faTrash } from '@fortawesome/free-solid-svg-icons';
import ReceiptPrint, { printReceiptElement } from '../pages/ReceiptPrint';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { useRxdb } from '../db/RxdbProvider';
import { getRecentEntries, saveRecentEntry } from '../utils/recentEntries';

const newId = (prefix = 'loc') => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const between = (dateLike, start, end) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

const isSameDay = (dateLike, target) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  return d.toDateString() === target.toDateString();
};

function Dashboard({ user }) {
  const { collections, queueOperation } = useRxdb() || {};
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();
  const setMessage = useCallback((msg) => {
    if (!msg) return;
    const text = msg.toString();
    const variant = text.includes('خطأ') ? 'danger' : text.includes('مطلوبة') ? 'warning' : 'success';
    showToast(msg, variant);
  }, [showToast]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showInstantServiceModal, setShowInstantServiceModal] = useState(false);
  const [showExpenseAdvanceModal, setShowExpenseAdvanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [installmentAmount, setInstallmentAmount] = useState('');

  const [bookingFormData, setBookingFormData] = useState({
    packageId: '', hennaPackageId: '', photographyPackageId: '', extraServices: [], returnedServices: [],
    hairStraightening: 'no', hairStraighteningPrice: '', hairStraighteningDate: '',
    hairDye: 'no', hairDyePrice: '', hairDyeDate: '',
    clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: ''
  });
  const [instantServiceFormData, setInstantServiceFormData] = useState({ employeeId: '', services: [] });
  const [expenseAdvanceFormData, setExpenseAdvanceFormData] = useState({ type: 'expense', details: '', amount: '', userId: '' });

  const [rawBookings, setRawBookings] = useState([]);
  const [rawInstantServices, setRawInstantServices] = useState([]);
  const [rawExpenses, setRawExpenses] = useState([]);
  const [rawAdvances, setRawAdvances] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  const [editBooking, setEditBooking] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [instantServiceTotal, setInstantServiceTotal] = useState(0);
  const [selectedPackageServices, setSelectedPackageServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [instantSubmitting, setInstantSubmitting] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [installmentSubmitting, setInstallmentSubmitting] = useState(false);
  const [recentEntries, setRecentEntries] = useState({});

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

  // Custom styles للـ react-select — neutralized to use CSS variables (black/white theme)
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
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
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      padding: '0.375rem 0.75rem',
      minHeight: '38px'
    }),
    input: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      fontSize: '1rem'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--muted)',
      fontSize: '1rem',
      textAlign: 'right'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text)',
      textAlign: 'right',
      opacity: 1,
      position: 'relative',
      zIndex: 2
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      borderRadius: '3px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'var(--text)',
      fontSize: '0.9rem',
      padding: '2px 4px'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      padding: '2px',
      ':hover': { backgroundColor: 'var(--border)', color: 'var(--text)' }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      zIndex: 1000,
      direction: 'rtl',
      textAlign: 'right'
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: 'var(--surface)',
      color: 'var(--text)'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--text)' : state.isFocused ? 'var(--border)' : 'var(--bg)',
      color: state.isSelected ? 'var(--bg)' : 'var(--text)',
      fontFamily: 'Tajawal, Arial, sans-serif',
      fontSize: '1rem',
      padding: '0.375rem 0.75rem'
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)'
    }),
    clearIndicator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      ':hover': { color: 'var(--muted)' }
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      ':hover': { color: 'var(--muted)' }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--border)'
    })
  };

  useEffect(() => {
    const fields = ['clientName', 'clientPhone', 'city', 'expenseDetails'];
    const loaded = {};
    fields.forEach((field) => {
      loaded[field] = getRecentEntries(field);
    });
    setRecentEntries(loaded);
  }, []);

  const rememberEntry = useCallback((field, value) => {
    const updated = saveRecentEntry(field, value);
    setRecentEntries((prev) => ({ ...prev, [field]: updated }));
  }, []);

  const userOptions = useMemo(() => (
    users.map(u => ({
      value: u._id?.toString(),
      label: `${u.username} (المتبقي: ${u.remainingSalary} جنيه)`
    }))
  ), [users]);

  // اشتراكات RxDB
  useEffect(() => {
    if (!collections) return undefined;
    const subs = [];

    const listen = (col, setter, selector = { _deleted: { $ne: true } }) => {
      if (!col) return;
      const sub = col.find({ selector }).$.subscribe((docs) => setter(docs.map((d) => (d.toJSON ? d.toJSON() : d))));
      subs.push(sub);
    };

    listen(collections.bookings, setRawBookings);
    listen(collections.instantServices, setRawInstantServices);
    listen(collections.expenses, setRawExpenses);
    listen(collections.advances, setRawAdvances);
    listen(collections.packages, setPackages);
    listen(collections.services, setServices);
    listen(collections.users, setUsers);

    return () => subs.forEach((s) => s && s.unsubscribe && s.unsubscribe());
  }, [collections]);

  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const key = (u._id && u._id.toString()) || u.id || u.userId;
      if (key) map.set(key, u);
    });
    return map;
  }, [users]);

  const packagesMap = useMemo(() => {
    const map = new Map();
    packages.forEach((p) => {
      const key = (p._id && p._id.toString()) || p.id;
      if (key) map.set(key, p);
    });
    return map;
  }, [packages]);

  const servicesMap = useMemo(() => {
    const map = new Map();
    services.forEach((s) => {
      const key = (s._id && s._id.toString()) || s.id;
      if (key) map.set(key, s);
    });
    return map;
  }, [services]);

  const hydrateBooking = useCallback((booking) => {
    if (!booking) return booking;
    const pkg = booking.package ? packagesMap.get(booking.package._id || booking.package) : null;
    const hennaPkg = booking.hennaPackage ? packagesMap.get(booking.hennaPackage._id || booking.hennaPackage) : null;
    const photoPkg = booking.photographyPackage ? packagesMap.get(booking.photographyPackage._id || booking.photographyPackage) : null;
    const extra = (booking.extraServices || []).map((id) => servicesMap.get(id?._id || id) || { _id: id, name: 'خدمة', price: 0 });
    const returned = (booking.returnedServices || []).map((id) => servicesMap.get(id?._id || id) || { _id: id, name: 'خدمة', price: 0, packageId: pkg || null });
    const insts = (booking.installments || []).map((inst) => ({
      ...inst,
      employeeId: usersMap.get(inst.employeeId?._id || inst.employeeId) || inst.employeeId
    }));
    const updates = (booking.updates || []).map((u) => ({
      ...u,
      employeeId: usersMap.get(u.employeeId?._id || u.employeeId) || u.employeeId
    }));
    return {
      ...booking,
      package: pkg || booking.package,
      hennaPackage: hennaPkg || booking.hennaPackage,
      photographyPackage: photoPkg || booking.photographyPackage,
      extraServices: extra,
      returnedServices: returned,
      installments: insts,
      updates,
      createdBy: usersMap.get(booking.createdBy?._id || booking.createdBy) || booking.createdBy,
      hairStraighteningExecutedBy: usersMap.get(booking.hairStraighteningExecutedBy) || booking.hairStraighteningExecutedBy,
      hairDyeExecutedBy: usersMap.get(booking.hairDyeExecutedBy) || booking.hairDyeExecutedBy
    };
  }, [packagesMap, servicesMap, usersMap]);

  // فلترة الخدمات الخاصة بالباكدج المختار
  useEffect(() => {
    const selectedIds = [bookingFormData.packageId, bookingFormData.hennaPackageId, bookingFormData.photographyPackageId].filter(Boolean);
    if (selectedIds.length === 0) {
      setSelectedPackageServices([]);
      return;
    }
    const filtered = services.filter((srv) => selectedIds.includes((srv.packageId && srv.packageId._id) || srv.packageId));
    setSelectedPackageServices(filtered.map((srv) => ({ value: srv._id, label: `${srv.name}${srv.packageId ? ` (${srv.packageId.name || ''})` : ''}`, price: srv.price })));
  }, [bookingFormData.packageId, bookingFormData.hennaPackageId, bookingFormData.photographyPackageId, services]);

  // حساب الإجمالي والمبلغ المتبقي للحجز
  useEffect(() => {
    let tempTotal = 0;
    const pkg = packages.find((p) => p._id === bookingFormData.packageId);
    if (pkg) tempTotal += pkg.price || 0;

    const hennaPkg = packages.find((p) => p._id === bookingFormData.hennaPackageId);
    if (hennaPkg) tempTotal += hennaPkg.price || 0;

    const photoPkg = packages.find((p) => p._id === bookingFormData.photographyPackageId);
    if (photoPkg) tempTotal += photoPkg.price || 0;

    bookingFormData.extraServices.forEach((id) => {
      const srv = services.find((s) => s._id === id.value);
      if (srv) tempTotal += srv.price || 0;
    });

    bookingFormData.returnedServices.forEach((id) => {
      const srv = selectedPackageServices.find((s) => s.value === id.value);
      if (srv) tempTotal -= srv.price || 0;
    });

    const hairPrice = bookingFormData.hairStraightening === 'yes' ? Number(bookingFormData.hairStraighteningPrice) || 0 : 0;
    const hairDyePrice = bookingFormData.hairDye === 'yes' ? Number(bookingFormData.hairDyePrice) || 0 : 0;
    tempTotal += hairPrice + hairDyePrice;

    const depositValue = Number(bookingFormData.deposit) || 0;
    setTotal(tempTotal);
    setRemaining(tempTotal - depositValue);
  }, [bookingFormData, packages, services, selectedPackageServices]);

  // إجمالي الخدمة الفورية
  useEffect(() => {
    let tempTotal = 0;
    instantServiceFormData.services.forEach((id) => {
      const srv = services.find((s) => s._id === id.value);
      if (srv) tempTotal += srv.price || 0;
    });
    setInstantServiceTotal(tempTotal);
  }, [instantServiceFormData.services, services]);

  const upsertLocal = useCallback(async (collectionName, doc, op = 'update') => {
    const col = collections?.[collectionName];
    if (!col) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await col.upsert(withTs);
    if (queueOperation) await queueOperation(collectionName, op, withTs);
    return withTs;
  }, [collections, queueOperation]);

  const dayBookings = useMemo(() => {
    return rawBookings
      .filter((b) => (
        isSameDay(b.eventDate, startOfDay) ||
        isSameDay(b.hennaDate, startOfDay) ||
        isSameDay(b.hairStraighteningDate, startOfDay) ||
        isSameDay(b.hairDyeDate, startOfDay)
      ))
      .map(hydrateBooking);
  }, [rawBookings, startOfDay, hydrateBooking]);

  const categorized = useMemo(() => {
    const makeupBookings = dayBookings.filter((booking) => (
      (booking.package?.type === 'makeup' && isSameDay(booking.eventDate, startOfDay)) ||
      (booking.hennaPackage && isSameDay(booking.hennaDate, startOfDay))
    ));
    const hairStraighteningBookings = dayBookings.filter((booking) => booking.hairStraightening && isSameDay(booking.hairStraighteningDate, startOfDay));
    const hairDyeBookings = dayBookings.filter((booking) => booking.hairDye && isSameDay(booking.hairDyeDate, startOfDay));
    const photographyBookings = dayBookings.filter((booking) => (
      (booking.photographyPackage && isSameDay(booking.eventDate, startOfDay)) ||
      (booking.photographyPackage && isSameDay(booking.hennaDate, startOfDay))
    ));
    return { makeupBookings, hairStraighteningBookings, hairDyeBookings, photographyBookings };
  }, [dayBookings, startOfDay]);

  const summary = useMemo(() => {
    const newBookings = rawBookings.filter((b) => between(b.createdAt, startOfDay, endOfDay));
    const totalDepositFromBookings = newBookings.reduce((sum, b) => sum + (Number(b.deposit) || 0), 0);
    const totalInstallments = rawBookings.reduce((sum, b) => {
      const instSum = (b.installments || []).filter((inst) => between(inst.date, startOfDay, endOfDay)).reduce((s, inst) => s + (Number(inst.amount) || 0), 0);
      return sum + instSum;
    }, 0);
    const totalDeposit = totalDepositFromBookings + totalInstallments;

    const instantToday = rawInstantServices.filter((i) => between(i.createdAt, startOfDay, endOfDay));
    const totalInstantServices = instantToday.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    const expensesToday = rawExpenses.filter((e) => between(e.createdAt, startOfDay, endOfDay));
    const advancesToday = rawAdvances.filter((a) => between(a.createdAt, startOfDay, endOfDay));

    const totalExpenses = expensesToday.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalAdvances = advancesToday.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

    // أعلى مجمع نقاط
    let topCollector = '—';
    let maxPoints = -Infinity;
    users.forEach((u) => {
      const totalPoints = (u.points || [])
        .filter((p) => between(p.date, startOfDay, endOfDay))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      if (totalPoints > maxPoints) {
        maxPoints = totalPoints;
        topCollector = u.username;
      }
    });

    return {
      bookingCount: newBookings.length,
      totalDeposit,
      instantServiceCount: instantToday.length,
      totalInstantServices,
      totalExpenses,
      totalAdvances,
      net,
      hairStraighteningCount: instantToday.length,
      topCollector
    };
  }, [rawBookings, rawInstantServices, rawExpenses, rawAdvances, users, startOfDay, endOfDay]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (bookingSubmitting) return;
    const depositValue = Number(bookingFormData.deposit) || 0;
    const hairStraighteningPrice = bookingFormData.hairStraightening === 'yes' ? Number(bookingFormData.hairStraighteningPrice) || 0 : 0;
    const hairDyePrice = bookingFormData.hairDye === 'yes' ? Number(bookingFormData.hairDyePrice) || 0 : 0;

    const pkg = packages.find((p) => p._id === bookingFormData.packageId);
    const hennaPkg = packages.find((p) => p._id === bookingFormData.hennaPackageId);
    const photoPkg = packages.find((p) => p._id === bookingFormData.photographyPackageId);

    const extraIds = bookingFormData.extraServices.map((s) => s.value);
    const returnedIds = bookingFormData.returnedServices.map((s) => s.value);

    const extraTotal = extraIds.reduce((sum, id) => {
      const srv = services.find((s) => s._id === id);
      return sum + (srv?.price || 0);
    }, 0);
    const returnedTotal = returnedIds.reduce((sum, id) => {
      const srv = services.find((s) => s._id === id);
      return sum + (srv?.price || 0);
    }, 0);

    const totalPrice = (pkg?.price || 0) + (hennaPkg?.price || 0) + (photoPkg?.price || 0) + extraTotal - returnedTotal + hairStraighteningPrice + hairDyePrice;

    const baseDoc = {
      _id: editBooking?._id || newId('book'),
      package: bookingFormData.packageId || null,
      hennaPackage: bookingFormData.hennaPackageId || null,
      photographyPackage: bookingFormData.photographyPackageId || null,
      returnedServices: returnedIds,
      extraServices: extraIds,
      hairStraightening: bookingFormData.hairStraightening === 'yes',
      hairStraighteningPrice,
      hairStraighteningDate: bookingFormData.hairStraighteningDate || null,
      hairStraighteningExecuted: false,
      hairStraighteningExecutedBy: null,
      hairDye: bookingFormData.hairDye === 'yes',
      hairDyePrice,
      hairDyeDate: bookingFormData.hairDyeDate || null,
      hairDyeExecuted: false,
      hairDyeExecutedBy: null,
      clientName: bookingFormData.clientName,
      clientPhone: bookingFormData.clientPhone,
      city: bookingFormData.city,
      eventDate: bookingFormData.eventDate,
      hennaDate: bookingFormData.hennaDate || null,
      deposit: depositValue,
      installments: editBooking?.installments || [],
      total: totalPrice,
      remaining: Math.max(0, totalPrice - depositValue - (editBooking?.installments || []).reduce((s, inst) => s + (Number(inst.amount) || 0), 0)),
      receiptNumber: editBooking?.receiptNumber || '',
      barcode: editBooking?.barcode || '',
      createdAt: editBooking?.createdAt || new Date().toISOString(),
      createdBy: editBooking?.createdBy || user?._id || user?.id || null,
      updates: editBooking?.updates || [],
      _deleted: false
    };

    setBookingSubmitting(true);
    setShowBookingModal(false);
    try {
      const saved = await upsertLocal('bookings', baseDoc, editBooking ? 'update' : 'insert');
      setMessage(`تم ${editBooking ? 'تعديل' : 'إضافة'} الحجز محلياً وسيتم رفعه عند الاتصال`);
      setCurrentReceipt({ ...saved, type: 'booking' });
      setShowReceiptModal(true);
      setBookingFormData({
        packageId: '', hennaPackageId: '', photographyPackageId: '', extraServices: [], returnedServices: [],
        hairStraightening: 'no', hairStraighteningPrice: '', hairStraighteningDate: '',
        hairDye: 'no', hairDyePrice: '', hairDyeDate: '',
        clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: ''
      });
      setEditBooking(null);
    } catch (err) {
      console.error('Booking submit error:', err);
      setMessage('خطأ في إضافة/تعديل الحجز محلياً');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleInstantServiceSubmit = async (e) => {
    e.preventDefault();
    if (!instantServiceFormData.services.length) {
      setMessage('الرجاء اختيار خدمة واحدة على الأقل');
      return;
    }
    if (instantSubmitting) return;

    const selectedServices = instantServiceFormData.services.map((s) => s.value);
    const resolvedServices = selectedServices.map((id) => {
      const srv = services.find((s) => s._id === id);
      const base = srv
        ? { _id: srv._id, name: srv.name, price: srv.price }
        : { _id: id?.toString?.() || `${id}`, name: 'خدمة', price: 0 };
      return { ...base, executed: false, executedBy: '', executedAt: null };
    });
    const totalPrice = resolvedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    setInstantSubmitting(true);
    setShowInstantServiceModal(false);
    try {
      const doc = {
        _id: editItem?._id || newId('inst'),
        employeeId: instantServiceFormData.employeeId || '',
        services: resolvedServices,
        total: totalPrice,
        createdAt: editItem?.createdAt || new Date().toISOString(),
        receiptNumber: editItem?.receiptNumber || '',
        barcode: editItem?.barcode || '',
        _deleted: false
      };
      const saved = await upsertLocal('instantServices', doc, editItem ? 'update' : 'insert');
      setCurrentReceipt({ ...saved, type: 'instant' });
      setShowReceiptModal(true);
      setMessage(`تم ${editItem ? 'تعديل' : 'إضافة'} الخدمة الفورية محلياً وسيتم رفعها عند الاتصال`);
      setInstantServiceFormData({ employeeId: '', services: [] });
      setEditItem(null);
    } catch (err) {
      console.error('Instant service submit error:', err);
      setMessage('خطأ في إضافة/تعديل الخدمة الفورية');
    } finally {
      setInstantSubmitting(false);
    }
  };

  const handleExpenseAdvanceSubmit = async (e) => {
    e.preventDefault();
    if (expenseAdvanceFormData.type === 'expense' && (!expenseAdvanceFormData.details || !expenseAdvanceFormData.amount)) {
      setMessage('تفاصيل المصروف والمبلغ مطلوبة');
      return;
    }
    if (expenseAdvanceFormData.type === 'advance' || expenseAdvanceFormData.type === 'deduction') {
      if (!expenseAdvanceFormData.userId || !expenseAdvanceFormData.amount) {
        setMessage('اسم الموظف والمبلغ مطلوبين');
        return;
      }
      if (expenseAdvanceFormData.type === 'deduction' && !expenseAdvanceFormData.details) {
        setMessage('سبب الخصم مطلوب');
        return;
      }
      const selectedUser = users.find((u) => u._id === expenseAdvanceFormData.userId);
      if (selectedUser && parseFloat(expenseAdvanceFormData.amount) > selectedUser.remainingSalary) {
        setMessage(expenseAdvanceFormData.type === 'advance' ? 'السلفة أكبر من المتبقي من الراتب' : 'الخصم أكبر من المتبقي من الراتب');
        return;
      }
    }
    if (expenseSubmitting) return;
    setExpenseSubmitting(true);
    setShowExpenseAdvanceModal(false);

    const baseDoc = {
      _id: newId('exp'),
      details: expenseAdvanceFormData.details,
      amount: Number(expenseAdvanceFormData.amount) || 0,
      userId: expenseAdvanceFormData.userId || null,
      createdBy: user?._id || user?.id || null,
      createdAt: new Date().toISOString(),
      _deleted: false
    };

    let targetCollection = 'expenses';
    if (expenseAdvanceFormData.type === 'advance') targetCollection = 'advances';
    if (expenseAdvanceFormData.type === 'deduction') targetCollection = 'deductions';

    try {
      await upsertLocal(targetCollection, baseDoc, 'insert');
      const typeLabel = expenseAdvanceFormData.type === 'expense' ? 'المصروف' : expenseAdvanceFormData.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
      setMessage(`تم إضافة ${typeLabel} محلياً وسيتم رفعه عند الاتصال`);
      setExpenseAdvanceFormData({ type: 'expense', details: '', amount: '', userId: '' });
    } catch (err) {
      console.error('Expense/Advance submit error:', err);
      setMessage('خطأ في إضافة العملية');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleBookingEdit = (booking) => {
    setEditBooking(booking);
    setBookingFormData({
      packageId: booking.package?._id || booking.package || '',
      hennaPackageId: booking.hennaPackage?._id || booking.hennaPackage || '',
      photographyPackageId: booking.photographyPackage?._id || booking.photographyPackage || '',
      extraServices: (booking.extraServices || []).map((srv) => ({ value: srv._id || srv, label: srv.name || '' })),
      returnedServices: (booking.returnedServices || []).map((srv) => ({ value: srv._id || srv, label: srv.name ? `${srv.name}${srv.packageId?.name ? ` (${srv.packageId.name})` : ''}` : '' })),
      hairStraightening: booking.hairStraightening ? 'yes' : 'no',
      hairStraighteningPrice: booking.hairStraighteningPrice != null ? booking.hairStraighteningPrice.toString() : '',
      hairStraighteningDate: booking.hairStraighteningDate ? booking.hairStraighteningDate.split('T')[0] : '',
      hairDye: booking.hairDye ? 'yes' : 'no',
      hairDyePrice: booking.hairDyePrice != null ? booking.hairDyePrice.toString() : '',
      hairDyeDate: booking.hairDyeDate ? booking.hairDyeDate.split('T')[0] : '',
      clientName: booking.clientName || '',
      clientPhone: booking.clientPhone || '',
      city: booking.city || '',
      eventDate: booking.eventDate ? booking.eventDate.split('T')[0] : '',
      hennaDate: booking.hennaDate ? booking.hennaDate.split('T')[0] : '',
      deposit: booking.deposit != null ? booking.deposit.toString() : ''
    });
    setShowBookingModal(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !deleteItem._id) {
      setMessage('خطأ: لا يمكن الحذف بسبب بيانات غير صالحة');
      setShowDeleteModal(false);
      return;
    }
    try {
      await upsertLocal('bookings', { ...deleteItem, _deleted: true }, 'update');
      setMessage('تم حذف الحجز محلياً وسيتم رفعه عند الاتصال');
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err);
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handleAddInstallment = async (bookingId) => {
    const amountNumber = Number(installmentAmount) || 0;
    if (!bookingId || !amountNumber) {
      setMessage('خطأ: قيمة القسط أو رقم الحجز غير صالح');
      return;
    }
    if (installmentSubmitting) return;
    setInstallmentSubmitting(true);
    setShowInstallmentModal(false);
    try {
      const target = rawBookings.find((b) => b._id === bookingId);
      if (!target) throw new Error('الحجز غير موجود محلياً');
      const newInstallment = {
        amount: amountNumber,
        date: new Date().toISOString(),
        employeeId: user?.id || user?._id || null
      };
      const installments = [...(target.installments || []), newInstallment];
      const paidSoFar = (target.deposit || 0) + installments.reduce((s, inst) => s + (Number(inst.amount) || 0), 0);
      const remainingValue = Math.max(0, (target.total || 0) - paidSoFar);
      await upsertLocal('bookings', { ...target, installments, remaining: remainingValue }, 'update');
      setMessage('تم إضافة القسط محلياً وسيتم رفعه عند الاتصال');
      setInstallmentAmount('');
    } catch (err) {
      console.error('Installment error:', err);
      setMessage('خطأ في إضافة القسط');
    } finally {
      setInstallmentSubmitting(false);
    }
  };

  const handlePrint = (booking) => {
    setCurrentReceipt({ ...booking, type: 'booking' });
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    let visible = null;
    const modal = document.querySelector('.modal.show');
    if (modal) {
      const list = modal.querySelectorAll('.receipt-content');
      if (list.length) visible = list[list.length - 1];
    }
    if (!visible) visible = document.querySelector('.receipt-content');
    if (!visible) return;
    printReceiptElement(visible);
  };

  const handleShowDetails = (booking) => {
    setCurrentDetails(booking);
    setShowDetailsModal(true);
  };

  return (
    <Container className="mt-5">
      <div className="dashboard-hero card p-4 mb-4">
        <div className="hero-copy">
          <p className="eyebrow">لوحة اليوم</p>
          <h2 className="hero-title">شغل إنهاردة</h2>
          <p className="hero-sub">تابع الحجوزات والخدمات الفورية والمصاريف في لمحة واحدة.</p>
          <div className="metric-pills mt-3">
            <div className="metric-pill">
              <span>عدد الحجوزات الجديدة</span>
              <strong>{summary.bookingCount}</strong>
            </div>
            <div className="metric-pill">
              <span>حجوزات ميك آب</span>
              <strong>{categorized.makeupBookings?.length || 0}</strong>
            </div>
            <div className="metric-pill">
              <span>حجوزات تصوير</span>
              <strong>{categorized.photographyBookings?.length || 0}</strong>
            </div>
            <div className="metric-pill">
              <span>الصافي</span>
              <strong>{summary.net} ج</strong>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <Form.Group className="mb-3">
            <Form.Label>اختر التاريخ</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Form.Group>
          <div className="hero-buttons">
            <Button variant="primary" onClick={() => setShowBookingModal(true)}>
              <FontAwesomeIcon icon={faPlus} /> إنشاء حجز
            </Button>
            <Button variant="primary" onClick={() => setShowInstantServiceModal(true)}>
              <FontAwesomeIcon icon={faPlus} /> شغل جديد
            </Button>
            <Button variant="primary" onClick={() => setShowExpenseAdvanceModal(true)}>
              <FontAwesomeIcon icon={faPlus} /> مصروف/سلفة
            </Button>
            <Button as={Link} to="/hall-supervision" variant="secondary">
              اشراف الصالة
            </Button>
          </div>
        </div>
      </div>


      <div className="d-flex align-items-center">
        <h3 className="mb-0">حجوزات الميك آب</h3>
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {categorized.makeupBookings.length}</small>
      </div>
      {categorized.makeupBookings.length === 0 && <Alert variant="info">لا توجد حجوزات ميك آب لهذا اليوم</Alert>}
      <Row>
        {categorized.makeupBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName} ({isSameDay(booking.eventDate, startOfDay) ? 'زفاف/شبكة' : 'حنة'})
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handlePrint(booking)}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleBookingEdit(booking)}>
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

      <div className="d-flex align-items-center">
        <h3 className="mb-0">حجوزات فرد الشعر</h3>
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {categorized.hairStraighteningBookings.length}</small>
      </div>
      {categorized.hairStraighteningBookings.length === 0 && <Alert variant="info">لا توجد حجوزات فرد شعر لهذا اليوم</Alert>}
      <Row>
        {categorized.hairStraighteningBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName}
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handlePrint(booking)}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleBookingEdit(booking)}>
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

      <div className="d-flex align-items-center">
        <h3 className="mb-0">حجوزات صبغة الشعر</h3>
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {categorized.hairDyeBookings.length}</small>
      </div>
      {categorized.hairDyeBookings.length === 0 && <Alert variant="info">لا توجد حجوزات صبغة شعر لهذا اليوم</Alert>}
      <Row>
        {categorized.hairDyeBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName}
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  تاريخ الصبغة: {booking.hairDyeDate ? new Date(booking.hairDyeDate).toLocaleDateString() : 'غير متوفر'}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handlePrint(booking)}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleBookingEdit(booking)}>
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

      <div className="d-flex align-items-center">
        <h3 className="mb-0">حجوزات التصوير</h3>
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {categorized.photographyBookings.length}</small>
      </div>
      {categorized.photographyBookings.length === 0 && <Alert variant="info">لا توجد حجوزات تصوير لهذا اليوم</Alert>}
      <Row>
        {categorized.photographyBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName} ({isSameDay(booking.eventDate, startOfDay) ? 'زفاف/شبكة' : 'حنة'})
                  {Number(booking.remaining) === 0 && (
                    <span className="badge bg-success ms-2">مدفوع بالكامل</span>
                  )}
                </Card.Title>
                <Card.Text>
                  رقم الهاتف: {booking.clientPhone}<br />
                  المدفوع: {booking.deposit} جنيه<br />
                  المتبقي: {booking.remaining} جنيه
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handlePrint(booking)}>
                  <FontAwesomeIcon icon={faPrint} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleBookingEdit(booking)}>
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

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>ملخص اليوم ({new Date(date).toLocaleDateString()})</Card.Title>
          <Card.Text>
            إجمالي العربون: {summary.totalDeposit} جنيه<br />
            إجمالي الخدمات الفورية: {summary.totalInstantServices} جنيه<br />
            إجمالي المصروفات: {summary.totalExpenses} جنيه<br />
            إجمالي السلف: {summary.totalAdvances} جنيه<br />
            <strong>الصافي: {summary.net} جنيه</strong>
          </Card.Text>
        </Card.Body>
      </Card>

      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editBooking ? 'تعديل حجز' : 'إنشاء حجز جديد'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleBookingSubmit} className="form-row">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>اسم العميل</Form.Label>
                  <Form.Control
                    type="text"
                    value={bookingFormData.clientName}
                    list="recent-clientName"
                    onChange={(e) => setBookingFormData({ ...bookingFormData, clientName: e.target.value })}
                    onBlur={(e) => rememberEntry('clientName', e.target.value)}
                    required
                  />
                  <datalist id="recent-clientName">
                    {(recentEntries.clientName || []).map((opt) => (
                      <option key={opt.value} value={opt.value} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>رقم الهاتف</Form.Label>
                  <Form.Control
                    type="text"
                    value={bookingFormData.clientPhone}
                    list="recent-clientPhone"
                    onChange={(e) => setBookingFormData({ ...bookingFormData, clientPhone: e.target.value })}
                    onBlur={(e) => rememberEntry('clientPhone', e.target.value)}
                    required
                  />
                  <datalist id="recent-clientPhone">
                    {(recentEntries.clientPhone || []).map((opt) => (
                      <option key={opt.value} value={opt.value} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>المدينة</Form.Label>
                  <Form.Control
                    type="text"
                    value={bookingFormData.city}
                    list="recent-city"
                    onChange={(e) => setBookingFormData({ ...bookingFormData, city: e.target.value })}
                    onBlur={(e) => rememberEntry('city', e.target.value)}
                  />
                  <datalist id="recent-city">
                    {(recentEntries.city || []).map((opt) => (
                      <option key={opt.value} value={opt.value} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>تاريخ المناسبة</Form.Label>
                  <Form.Control
                    type="date"
                    value={bookingFormData.eventDate}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, eventDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>نوع الباكدج</Form.Label>
                  <Form.Control
                    as="select"
                    value={bookingFormData.packageId}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, packageId: e.target.value })}
                    required
                  >
                    <option value="">اختر باكدج</option>
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>باكدج حنة (اختياري)</Form.Label>
                  <Form.Control
                    as="select"
                    value={bookingFormData.hennaPackageId}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, hennaPackageId: e.target.value })}
                  >
                    <option value="">لا يوجد</option>
                    {packages.filter((pkg) => pkg.type === 'makeup').map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              {bookingFormData.hennaPackageId && (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>تاريخ الحنة</Form.Label>
                    <Form.Control
                      type="date"
                      value={bookingFormData.hennaDate}
                      onChange={(e) => setBookingFormData({ ...bookingFormData, hennaDate: e.target.value })}
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
                    value={bookingFormData.photographyPackageId}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, photographyPackageId: e.target.value })}
                  >
                    <option value="">لا يوجد</option>
                    {packages.filter((pkg) => pkg.type === 'photography').map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>خدمات الشعر - فرد</Form.Label>
                  <Form.Control
                    as="select"
                    value={bookingFormData.hairStraightening}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, hairStraightening: e.target.value })}
                    className="custom-select"
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {bookingFormData.hairStraightening === 'yes' && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>سعر فرد الشعر</Form.Label>
                      <Form.Control
                        type="number"
                        value={bookingFormData.hairStraighteningPrice}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, hairStraighteningPrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>تاريخ فرد الشعر</Form.Label>
                      <Form.Control
                        type="date"
                        value={bookingFormData.hairStraighteningDate}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, hairStraighteningDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>خدمات الشعر - صبغة</Form.Label>
                  <Form.Control
                    as="select"
                    value={bookingFormData.hairDye}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, hairDye: e.target.value })}
                    className="custom-select"
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {bookingFormData.hairDye === 'yes' && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>سعر الصبغة</Form.Label>
                      <Form.Control
                        type="number"
                        value={bookingFormData.hairDyePrice}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, hairDyePrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>تاريخ الصبغة</Form.Label>
                      <Form.Control
                        type="date"
                        value={bookingFormData.hairDyeDate}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, hairDyeDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>مرتجع من الباكدجات (اختياري)</Form.Label>
                  <Select
                    isMulti
                    options={selectedPackageServices}
                    value={bookingFormData.returnedServices}
                    onChange={(selected) => setBookingFormData({ ...bookingFormData, returnedServices: selected })}
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
                    options={services.filter((srv) => srv.type === 'instant').map((srv) => ({ value: srv._id, label: srv.name, price: srv.price }))}
                    value={bookingFormData.extraServices}
                    onChange={(selected) => setBookingFormData({ ...bookingFormData, extraServices: selected })}
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
                  <Form.Label>العربون</Form.Label>
                  <Form.Control
                    type="number"
                    value={bookingFormData.deposit}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, deposit: e.target.value })}
                    disabled={!!editBooking}
                    readOnly={!!editBooking}
                    required
                  />
                </Form.Group>
              </Col>
              {editBooking?.installments?.length > 0 && (
                <Col md={12}>
                  <h6 className="mt-3">الأقساط المدفوعة (عرض فقط)</h6>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>الموظف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editBooking.installments.map((inst, index) => (
                        <tr key={index}>
                          <td>{inst.amount} جنيه</td>
                          <td>{new Date(inst.date).toLocaleDateString()}</td>
                          <td>{inst.employeeId?.username || 'غير معروف'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>
              )}
              <Col md={3}>
                <Form.Group>
                  <Form.Label>الإجمالي: {total} جنيه</Form.Label>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>المتبقي: {remaining} جنيه</Form.Label>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Button type="submit" className="mt-3" disabled={bookingSubmitting}>
                  {bookingSubmitting ? 'جارٍ الحفظ...' : editBooking ? 'تعديل' : 'حفظ'}
                </Button>
                <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                  setBookingFormData({
                    packageId: '', hennaPackageId: '', photographyPackageId: '', extraServices: [], returnedServices: [],
                    hairStraightening: 'no', hairStraighteningPrice: '', hairStraighteningDate: '',
                    hairDye: 'no', hairDyePrice: '', hairDyeDate: '',
                    clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: ''
                  });
                  setEditBooking(null);
                  setShowBookingModal(false);
                }}>
                  إلغاء
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showInstantServiceModal} onHide={() => setShowInstantServiceModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'تعديل خدمة فورية' : 'إنشاء خدمة فورية'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleInstantServiceSubmit} className="form-row">
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>اسم الموظف (اختياري)</Form.Label>
                  <Form.Control
                    as="select"
                    value={instantServiceFormData.employeeId}
                    onChange={(e) => setInstantServiceFormData({ ...instantServiceFormData, employeeId: e.target.value })}
                  >
                    <option value="">لا يوجد</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>{u.username}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>الخدمات</Form.Label>
                  <Select
                    isMulti
                    options={services.filter((srv) => srv.type === 'instant').map((srv) => ({ value: srv._id, label: srv.name }))}
                    value={instantServiceFormData.services}
                    onChange={(selected) => setInstantServiceFormData({ ...instantServiceFormData, services: selected })}
                    isSearchable
                    placeholder="اختر الخدمات..."
                    className="booking-services-select"
                    classNamePrefix="booking-services"
                    styles={customStyles}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>الإجمالي: {instantServiceTotal} جنيه</Form.Label>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Button type="submit" className="mt-3" disabled={instantSubmitting}>
                  {instantSubmitting ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
                </Button>
                <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                  setInstantServiceFormData({ employeeId: '', services: [] });
                  setEditItem(null);
                  setShowInstantServiceModal(false);
                }}>
                  إلغاء
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showExpenseAdvanceModal} onHide={() => setShowExpenseAdvanceModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>إضافة عملية جديدة</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleExpenseAdvanceSubmit} className="form-row">
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>نوع العملية</Form.Label>
                  <Form.Control
                    as="select"
                    value={expenseAdvanceFormData.type}
                    onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, type: e.target.value, details: '', userId: '' })}
                  >
                    <option value="expense">مصروف</option>
                    <option value="advance">سلفة</option>
                    <option value="deduction">خصم إداري</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              {expenseAdvanceFormData.type === 'expense' ? (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>تفاصيل المصروف</Form.Label>
                      <Form.Control
                        type="text"
                        value={expenseAdvanceFormData.details}
                        list="recent-expenseDetails-deduction"
                        onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, details: e.target.value })}
                        onBlur={(e) => rememberEntry('expenseDetails', e.target.value)}
                        required
                      />
                      <datalist id="recent-expenseDetails-deduction">
                        {(recentEntries.expenseDetails || []).map((opt) => (
                          <option key={opt.value} value={opt.value} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>المبلغ</Form.Label>
                      <Form.Control
                        type="number"
                        value={expenseAdvanceFormData.amount}
                        onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, amount: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              ) : expenseAdvanceFormData.type === 'advance' ? (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>اسم الموظف</Form.Label>
                      <Select
                        options={userOptions}
                        value={userOptions.find((opt) => opt.value === expenseAdvanceFormData.userId?.toString()) || null}
                        onChange={(selected) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, userId: selected ? selected.value.toString() : '' })}
                        isSearchable
                        placeholder="اختر الموظف..."
                        className="booking-services-select"
                        classNamePrefix="react-select"
                        styles={customStyles}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>المبلغ</Form.Label>
                      <Form.Control
                        type="number"
                        value={expenseAdvanceFormData.amount}
                        onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, amount: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              ) : (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>اسم الموظف</Form.Label>
                      <Select
                        options={userOptions}
                        value={userOptions.find((opt) => opt.value === expenseAdvanceFormData.userId?.toString()) || null}
                        onChange={(selected) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, userId: selected ? selected.value.toString() : '' })}
                        isSearchable
                        placeholder="اختر الموظف..."
                        className="booking-services-select"
                        classNamePrefix="react-select"
                        styles={customStyles}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>المبلغ</Form.Label>
                      <Form.Control
                        type="number"
                        value={expenseAdvanceFormData.amount}
                        onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, amount: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>سبب الخصم</Form.Label>
                      <Form.Control
                        type="text"
                        value={expenseAdvanceFormData.details}
                        list="recent-expenseDetails"
                        onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, details: e.target.value })}
                        onBlur={(e) => rememberEntry('expenseDetails', e.target.value)}
                        required
                      />
                      <datalist id="recent-expenseDetails">
                        {(recentEntries.expenseDetails || []).map((opt) => (
                          <option key={opt.value} value={opt.value} />
                        ))}
                      </datalist>
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={12}>
                <Button type="submit" className="mt-3" disabled={expenseSubmitting}>
                  {expenseSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
                </Button>
                <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                  setExpenseAdvanceFormData({ type: 'expense', details: '', amount: '', userId: '' });
                  setShowExpenseAdvanceModal(false);
                }}>
                  إلغاء
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

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
          <Button variant="primary" disabled={installmentSubmitting || !installmentAmount} onClick={() => handleAddInstallment(deleteItem?._id)}>
            {installmentSubmitting ? 'جارٍ الإضافة...' : 'حفظ'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>وصل {currentReceipt?.type === 'booking' ? 'الحجز' : 'الخدمة الفورية'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ReceiptPrint data={currentReceipt} type={currentReceipt?.type || 'booking'} />
        </Modal.Body>
          <Modal.Footer>
          <Button variant="primary" onClick={handlePrintReceipt}>طباعة</Button>
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
              <p>تاريخ المناسبة: {currentDetails.eventDate ? new Date(currentDetails.eventDate).toLocaleDateString() : 'غير متوفر'}</p>
              {currentDetails.hennaDate && <p>تاريخ الحنة: {new Date(currentDetails.hennaDate).toLocaleDateString()}</p>}
              <p>الباكدج: {currentDetails.package?.name || 'غير محدد'}</p>
              {currentDetails.hennaPackage && <p>باكدج حنة: {currentDetails.hennaPackage.name || '-'}</p>}
              {currentDetails.photographyPackage && <p>باكدج تصوير: {currentDetails.photographyPackage.name || '-'}</p>}
              {currentDetails.returnedServices?.length > 0 && (
                <p>الخدمات المرتجعة: {currentDetails.returnedServices.map((srv) => srv.name || srv._id).join(', ')}</p>
              )}
              {currentDetails.extraServices?.length > 0 && (
                <p>الخدمات الإضافية: {currentDetails.extraServices.map((srv) => srv.name || srv._id).join(', ')}</p>
              )}
              {currentDetails.hairStraightening && (
                <>
                  <p>فرد شعر: نعم</p>
                  <p>سعر فرد الشعر: {currentDetails.hairStraighteningPrice} جنيه</p>
                  <p>تاريخ فرد الشعر: {currentDetails.hairStraighteningDate ? new Date(currentDetails.hairStraighteningDate).toLocaleDateString() : 'غير متوفر'}</p>
                </>
              )}
              {currentDetails.hairDye && (
                <>
                  <p>صبغة شعر: نعم</p>
                  <p>سعر الصبغة: {currentDetails.hairDyePrice} جنيه</p>
                  <p>تاريخ الصبغة: {currentDetails.hairDyeDate ? new Date(currentDetails.hairDyeDate).toLocaleDateString() : 'غير متوفر'}</p>
                </>
              )}
              <p>الإجمالي: {currentDetails.total} جنيه</p>
              <p>العربون: {currentDetails.deposit} جنيه</p>
              <p>المتبقي: {currentDetails.remaining} جنيه</p>
              {currentDetails.installments?.length > 0 && (
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
              {currentDetails.updates?.length > 0 && (
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
                          <td>{update.changes ? Object.keys(update.changes).map((key) => `${key}: ${update.changes[key]}`).join(', ') : 'غير معروف'}</td>
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

export default Dashboard;
