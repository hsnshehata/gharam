import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPrint, faEdit, faEye, faDollarSign, faTrash } from '@fortawesome/free-solid-svg-icons';
import ReceiptPrint, { printReceiptElement } from '../pages/ReceiptPrint';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { getRecentEntries, saveRecentEntry } from '../utils/recentEntries';

function Dashboard({ user }) {
  const [summary, setSummary] = useState({
    bookingCount: 0,
    totalDeposit: 0,
    instantServiceCount: 0,
    totalInstantServices: 0,
    totalExpenses: 0,
    totalAdvances: 0,
    net: 0
  });
  const [bookings, setBookings] = useState({
    makeupBookings: [],
    hairStraighteningBookings: [],
    hairDyeBookings: [],
    photographyBookings: []
  });
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
    clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: '', paymentMethod: 'cash'
  });
  const [instantServiceFormData, setInstantServiceFormData] = useState({ employeeId: '', services: [], customServices: [], paymentMethod: 'cash' });
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');
  const [expenseAdvanceFormData, setExpenseAdvanceFormData] = useState({ type: 'expense', details: '', amount: '', userId: '', paymentMethod: 'cash' });
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
  const [showOperations, setShowOperations] = useState(true);
  const [logFilter, setLogFilter] = useState('all');
  const [installmentPaymentMethod, setInstallmentPaymentMethod] = useState('cash');

  const paymentMethodLabel = (pm) => {
    const labels = { cash: 'كاش', vodafone: 'فودافون', visa: 'فيزا', instapay: 'انستاباي' };
    return labels[pm] || 'كاش';
  };
  const paymentMethodColor = (pm) => {
    const colors = { cash: '#28a745', vodafone: '#dc3545', visa: '#007bff', instapay: '#e67e22' };
    return colors[pm] || '#28a745';
  };

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
    users.map(user => ({
      value: user._id?.toString(),
      label: `${user.username} (المتبقي: ${user.remainingSalary} جنيه)`
    }))
  ), [users]);

  const tokenHeader = useMemo(() => ({ headers: { 'x-auth-token': localStorage.getItem('token') } }), []);

  const { data: summaryData, error: summaryError, mutate: mutateSummary } = useSWR(
    () => `/api/dashboard/summary?date=${date}`,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 30000, revalidateOnFocus: true }
  );

  const { data: bookingsData, error: bookingsError, mutate: mutateTodayWork } = useSWR(
    () => `/api/today-work?date=${date}`,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 30000 }
  );

  const { data: packagesData, mutate: mutatePackages } = useSWR(
    '/api/packages/packages',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const { data: servicesData, mutate: mutateServices } = useSWR(
    '/api/packages/services',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  const { data: operationsData, error: operationsError, mutate: mutateOperations } = useSWR(
    () => `/api/dashboard/operations?date=${date}`,
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 10000 }
  );

  const { data: usersData, mutate: mutateUsers } = useSWR(
    '/api/users',
    (url) => axios.get(url, tokenHeader).then(res => res.data),
    { dedupingInterval: 60000 }
  );

  useEffect(() => {
    if (summaryData) setSummary(summaryData);
  }, [summaryData]);

  useEffect(() => {
    if (bookingsData) {
      setBookings(bookingsData || { makeupBookings: [], hairStraighteningBookings: [], hairDyeBookings: [], photographyBookings: [] });
    }
  }, [bookingsData]);

  useEffect(() => {
    if (packagesData) setPackages(packagesData);
  }, [packagesData]);

  useEffect(() => {
    if (servicesData) setServices(servicesData);
  }, [servicesData]);

  useEffect(() => {
    if (usersData) setUsers(usersData.map(u => ({ ...u, _id: u._id?.toString() })));
  }, [usersData]);

  useEffect(() => {
    if (summaryError || bookingsError || operationsError) {
      setMessage('خطأ في جلب البيانات');
      setBookings({ makeupBookings: [], hairStraighteningBookings: [], hairDyeBookings: [], photographyBookings: [] });
    }
  }, [summaryError, bookingsError, operationsError, setMessage]);

  const revalidateAll = useCallback(() => {
    mutateSummary();
    mutateTodayWork();
    mutatePackages();
    mutateServices();
    mutateUsers();
    mutateOperations();
  }, [mutateSummary, mutateTodayWork, mutatePackages, mutateServices, mutateUsers, mutateOperations]);

  useEffect(() => {
    const calculateSelectedPackageServices = async () => {
      const selectedIds = [bookingFormData.packageId, bookingFormData.hennaPackageId, bookingFormData.photographyPackageId].filter(id => id);
      if (selectedIds.length > 0) {
        try {
          const res = await axios.get('/api/packages/services', {
            headers: { 'x-auth-token': localStorage.getItem('token') }
          });
          const filteredServices = res.data.filter(srv => selectedIds.includes(srv.packageId?._id.toString()));
          setSelectedPackageServices(filteredServices.map(srv => ({
            value: srv._id,
            label: `${srv.name} (${srv.packageId.name})`,
            price: srv.price
          })));
        } catch (err) {
          console.error('Fetch package services error:', err.response?.data || err.message);
        }
      } else {
        setSelectedPackageServices([]);
      }
    };
    calculateSelectedPackageServices();
  }, [bookingFormData.packageId, bookingFormData.hennaPackageId, bookingFormData.photographyPackageId]);

  useEffect(() => {
    const calculateTotal = () => {
      let tempTotal = 0;
      const selectedPkg = packages.find(pkg => pkg._id === bookingFormData.packageId);
      if (selectedPkg) tempTotal += selectedPkg.price;

      const hennaPkg = packages.find(pkg => pkg._id === bookingFormData.hennaPackageId);
      if (hennaPkg) tempTotal += hennaPkg.price;

      const photoPkg = packages.find(pkg => pkg._id === bookingFormData.photographyPackageId);
      if (photoPkg) tempTotal += photoPkg.price;

      bookingFormData.extraServices.forEach(id => {
        const srv = services.find(s => s._id === id.value);
        if (srv) tempTotal += srv.price;
      });

      bookingFormData.returnedServices.forEach(id => {
        const srv = selectedPackageServices.find(s => s.value === id.value);
        if (srv) tempTotal -= srv.price;
      });

      const hairPrice = bookingFormData.hairStraightening === 'yes'
        ? Number(bookingFormData.hairStraighteningPrice) || 0
        : 0;
      const hairDyePrice = bookingFormData.hairDye === 'yes'
        ? Number(bookingFormData.hairDyePrice) || 0
        : 0;
      tempTotal += hairPrice + hairDyePrice;

      const depositValue = Number(bookingFormData.deposit) || 0;

      setTotal(tempTotal);
      setRemaining(tempTotal - depositValue);
    };
    calculateTotal();
  }, [bookingFormData, packages, services, selectedPackageServices]);

  useEffect(() => {
    const calculateInstantServiceTotal = () => {
      let tempTotal = 0;
      instantServiceFormData.services.forEach(id => {
        const srv = services.find(s => s._id === id.value);
        if (srv) tempTotal += srv.price;
      });
      instantServiceFormData.customServices.forEach(srv => {
        tempTotal += (Number(srv.price) || 0);
      });
      setInstantServiceTotal(tempTotal);
    };
    calculateInstantServiceTotal();
  }, [instantServiceFormData.services, instantServiceFormData.customServices, services]);

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) {
      setMessage('الرجاء إدخال اسم وسعر الخدمة الخاصة', 'warning');
      return;
    }
    const newCustomService = {
      _id: `temp-${Date.now()}`,
      name: customServiceName,
      price: Number(customServicePrice)
    };
    setInstantServiceFormData(prev => ({
      ...prev,
      customServices: [...prev.customServices, newCustomService]
    }));
    setCustomServiceName('');
    setCustomServicePrice('');
  };

  const handleRemoveCustomService = (idToRemove) => {
    setInstantServiceFormData(prev => ({
      ...prev,
      customServices: prev.customServices.filter(s => s._id !== idToRemove)
    }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (bookingSubmitting) return;
    const submitData = {
      ...bookingFormData,
      deposit: Number(bookingFormData.deposit) || 0,
      hairStraighteningPrice: bookingFormData.hairStraightening === 'yes' ? Number(bookingFormData.hairStraighteningPrice) || 0 : 0,
      hairDyePrice: bookingFormData.hairDye === 'yes' ? Number(bookingFormData.hairDyePrice) || 0 : 0,
      packageId: bookingFormData.packageId || null,
      hennaPackageId: bookingFormData.hennaPackageId || null,
      photographyPackageId: bookingFormData.photographyPackageId || null,
      extraServices: bookingFormData.extraServices.map(s => s.value),
      returnedServices: bookingFormData.returnedServices.map(s => s.value),
      hairStraightening: bookingFormData.hairStraightening === 'yes',
      hairDye: bookingFormData.hairDye === 'yes',
      paymentMethod: bookingFormData.paymentMethod || 'cash'
    };
    setBookingSubmitting(true);
    setShowBookingModal(false);
    try {
      if (editBooking) {
        const res = await axios.put(`/api/bookings/${editBooking._id}`, submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setMessage('تم تعديل الحجز بنجاح');
        setCurrentReceipt({ ...res.data.booking, type: 'booking' });
        setShowReceiptModal(true);
        revalidateAll();
      } else {
        const res = await axios.post('/api/bookings', submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setMessage('تم إضافة الحجز بنجاح');
        setCurrentReceipt({ ...res.data.booking, type: 'booking' });
        setShowReceiptModal(true);
        revalidateAll();
      }
      setBookingFormData({
        packageId: '', hennaPackageId: '', photographyPackageId: '', extraServices: [], returnedServices: [],
        hairStraightening: 'no', hairStraighteningPrice: '', hairStraighteningDate: '',
        hairDye: 'no', hairDyePrice: '', hairDyeDate: '',
        clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: '', paymentMethod: 'cash'
      });
      setEditBooking(null);
    } catch (err) {
      console.error('Booking submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل الحجز');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleInstantServiceSubmit = async (e) => {
    e.preventDefault();
    if (!instantServiceFormData.services.length && !instantServiceFormData.customServices.length) {
      setMessage('الرجاء اختيار خدمة واحدة أو إضافة خدمة خاصة على الأقل');
      return;
    }
    if (instantSubmitting) return;
    const submitData = {
      employeeId: instantServiceFormData.employeeId || null,
      services: instantServiceFormData.services.filter(s => s.value !== 'custom-trigger').map(s => s.value),
      customServices: instantServiceFormData.customServices.map(s => ({ name: s.name, price: s.price })),
      paymentMethod: instantServiceFormData.paymentMethod || 'cash'
    };
    setInstantSubmitting(true);
    setShowInstantServiceModal(false);
    try {
      if (editItem) {
        const res = await axios.put(`/api/instant-services/${editItem._id}`, submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setMessage('تم تعديل الخدمة الفورية بنجاح');
        setCurrentReceipt({ ...res.data.instantService, type: 'instant' });
        setShowReceiptModal(true);
        revalidateAll();
      } else {
        const res = await axios.post('/api/instant-services', submitData, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setMessage('تم إضافة الخدمة الفورية بنجاح');
        setCurrentReceipt({ ...res.data.instantService, type: 'instant' });
        setShowReceiptModal(true);
        revalidateAll();
      }
      setInstantServiceFormData({ employeeId: '', services: [], customServices: [], paymentMethod: 'cash' });
      setCustomServiceName('');
      setCustomServicePrice('');
      setEditItem(null);
    } catch (err) {
      console.error('Instant service submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة/تعديل الخدمة الفورية');
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
      const selectedUser = users.find(u => u._id === expenseAdvanceFormData.userId);
      if (selectedUser && parseFloat(expenseAdvanceFormData.amount) > selectedUser.remainingSalary) {
        setMessage(expenseAdvanceFormData.type === 'advance' ? 'السلفة أكبر من المتبقي من الراتب' : 'الخصم أكبر من المتبقي من الراتب');
        return;
      }
    }
    if (expenseSubmitting) return;
    setExpenseSubmitting(true);
    setShowExpenseAdvanceModal(false);
    const expensePayload = { ...expenseAdvanceFormData, amount: Number(expenseAdvanceFormData.amount) || 0 };
    try {
      const res = await axios.post('/api/expenses-advances', expensePayload, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      const typeLabel = res.data.type === 'expense' ? 'المصروف' : res.data.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
      setMessage(`تم إضافة ${typeLabel} بنجاح`);
      setExpenseAdvanceFormData({ type: 'expense', details: '', amount: '', userId: '', paymentMethod: 'cash' });
      revalidateAll();
    } catch (err) {
      console.error('Expense/Advance submit error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة العملية');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleBookingEdit = (booking) => {
    setEditBooking(booking);
    setBookingFormData({
      packageId: booking.package?._id || '',
      hennaPackageId: booking.hennaPackage?._id || '',
      photographyPackageId: booking.photographyPackage?._id || '',
      extraServices: booking.extraServices.map(srv => ({ value: srv._id, label: srv.name })) || [],
      returnedServices: booking.returnedServices.map(srv => ({ value: srv._id, label: `${srv.name} (${srv.packageId.name})` })) || [],
      hairStraightening: booking.hairStraightening ? 'yes' : 'no',
      hairStraighteningPrice: booking.hairStraighteningPrice != null ? booking.hairStraighteningPrice.toString() : '',
      hairStraighteningDate: booking.hairStraighteningDate ? new Date(booking.hairStraighteningDate).toISOString().split('T')[0] : '',
      hairDye: booking.hairDye ? 'yes' : 'no',
      hairDyePrice: booking.hairDyePrice != null ? booking.hairDyePrice.toString() : '',
      hairDyeDate: booking.hairDyeDate ? new Date(booking.hairDyeDate).toISOString().split('T')[0] : '',
      clientName: booking.clientName || '',
      clientPhone: booking.clientPhone || '',
      city: booking.city || '',
      eventDate: booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : '',
      hennaDate: booking.hennaDate ? new Date(booking.hennaDate).toISOString().split('T')[0] : '',
      deposit: booking.deposit != null ? booking.deposit.toString() : '',
      paymentMethod: booking.paymentMethod || 'cash'
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
      await axios.delete(`/api/bookings/${deleteItem._id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setMessage('تم حذف الحجز بنجاح');
      setShowDeleteModal(false);
      setDeleteItem(null);
      revalidateAll();
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في الحذف');
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
      const res = await axios.post(`/api/bookings/${bookingId}/installment`, { amount: amountNumber, paymentMethod: installmentPaymentMethod || 'cash' }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings({
        makeupBookings: bookings.makeupBookings.map(b => (b._id === bookingId ? res.data.booking : b)),
        hairStraighteningBookings: bookings.hairStraighteningBookings.map(b => (b._id === bookingId ? res.data.booking : b)),
        hairDyeBookings: bookings.hairDyeBookings.map(b => (b._id === bookingId ? res.data.booking : b)),
        photographyBookings: bookings.photographyBookings.map(b => (b._id === bookingId ? res.data.booking : b))
      });
      setMessage('تم إضافة القسط بنجاح');
      setInstallmentAmount('');
      setInstallmentPaymentMethod('cash');
      revalidateAll();
    } catch (err) {
      console.error('Installment error:', err.response?.data || err.message);
      setMessage(err.response?.data?.msg || 'خطأ في إضافة القسط');
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

  // عرض التغييرات بأمان حتى لو الحقل changes ناقص من الـ backend
  const renderUpdateChanges = (changes) => {
    const normalized = changes || {};
    if (normalized.created) return 'إنشاء الحجز';
    const keys = Object.keys(normalized);
    if (!keys.length) return 'غير معروف';
    return keys.map((key) => `${key}: ${normalized[key]}`).join(', ');
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
              <strong>{bookings.makeupBookings?.length || 0}</strong>
            </div>
            <div className="metric-pill">
              <span>حجوزات تصوير</span>
              <strong>{bookings.photographyBookings?.length || 0}</strong>
            </div>
            <div className="metric-pill">
              <span>الصافي</span>
              <strong>{summary.net} ج</strong>
            </div>
          </div>
          {summary.paymentBreakdown && (
            <div className="metric-pills mt-2">
              <div className="metric-pill" style={{ borderRight: '3px solid #28a745' }}>
                <span>كاش</span>
                <strong style={{ color: '#28a745' }}>{summary.paymentBreakdown.cash || 0} ج</strong>
              </div>
              <div className="metric-pill" style={{ borderRight: '3px solid #dc3545' }}>
                <span>فودافون</span>
                <strong style={{ color: '#dc3545' }}>{summary.paymentBreakdown.vodafone || 0} ج</strong>
              </div>
              <div className="metric-pill" style={{ borderRight: '3px solid #007bff' }}>
                <span>فيزا</span>
                <strong style={{ color: '#007bff' }}>{summary.paymentBreakdown.visa || 0} ج</strong>
              </div>
              <div className="metric-pill" style={{ borderRight: '3px solid #e67e22' }}>
                <span>انستاباي</span>
                <strong style={{ color: '#e67e22' }}>{summary.paymentBreakdown.instapay || 0} ج</strong>
              </div>
            </div>
          )}
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
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {bookings.makeupBookings.length}</small>
      </div>
      {bookings.makeupBookings.length === 0 && <Alert variant="info">لا توجد حجوزات ميك آب لهذا اليوم</Alert>}
      <Row>
        {bookings.makeupBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName} ({new Date(booking.eventDate).toDateString() === new Date(date).toDateString() ? 'زفاف/شبكة' : 'حنة'})
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
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {bookings.hairStraighteningBookings.length}</small>
      </div>
      {bookings.hairStraighteningBookings.length === 0 && <Alert variant="info">لا توجد حجوزات فرد شعر لهذا اليوم</Alert>}
      <Row>
        {bookings.hairStraighteningBookings.map((booking, idx) => (
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
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {bookings.hairDyeBookings.length}</small>
      </div>
      {bookings.hairDyeBookings.length === 0 && <Alert variant="info">لا توجد حجوزات صبغة شعر لهذا اليوم</Alert>}
      <Row>
        {bookings.hairDyeBookings.map((booking, idx) => (
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
        <small className="text-muted ms-3">إجمالي الحجوزات اليوم: {bookings.photographyBookings.length}</small>
      </div>
      {bookings.photographyBookings.length === 0 && <Alert variant="info">لا توجد حجوزات تصوير لهذا اليوم</Alert>}
      <Row>
        {bookings.photographyBookings.map((booking, idx) => (
          <Col md={4} key={booking._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  <span className="me-2">{idx + 1}.</span>
                  {booking.clientName} ({new Date(booking.eventDate).toDateString() === new Date(date).toDateString() ? 'زفاف/شبكة' : 'حنة'})
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

      <div className="d-flex align-items-center justify-content-between mb-2 mt-4">
        <div className="d-flex align-items-center">
          <h3 className="mb-0">سجل تفاصيل العمليات</h3>
          <small className="text-muted ms-3">إجمالي العمليات اليوم: {operationsData?.length || 0}</small>
        </div>
        <div className="d-flex gap-2">
          <Form.Select 
            size="sm" 
            style={{ width: '150px' }} 
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
          >
            <option value="all">عرض الكل</option>
            <option value="حجز جديد">حجوزات</option>
            <option value="قسط/دفعة">أقساط</option>
            <option value="خدمة فورية">خدمات فورية</option>
            <option value="مصروف">مصروفات</option>
            <option value="سلفة">سلف</option>
          </Form.Select>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setShowOperations(!showOperations)}
          >
            {showOperations ? 'إخفاء السجل' : 'إظهار السجل'}
          </Button>
        </div>
      </div>
      
      {showOperations && (
        <Card className="mb-4">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead style={{ backgroundColor: 'var(--surface)' }}>
                <tr>
                  <th>النوع</th>
                  <th>التفاصيل</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>الوقت</th>
                  <th>أضيف بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {operationsData && operationsData.length > 0 ? (
                  operationsData
                    .filter(op => logFilter === 'all' || op.type === logFilter)
                    .map((op) => (
                    <tr key={op._id}>
                      <td>
                        <span className={`badge ${
                          op.type === 'حجز جديد' ? 'bg-primary' : 
                          op.type === 'قسط/دفعة' ? 'bg-info' : 
                          op.type === 'خدمة فورية' ? 'bg-success' : 
                          op.type === 'مصروف' ? 'bg-danger' : 'bg-warning'
                        }`}>
                          {op.type}
                        </span>
                      </td>
                      <td>{op.details}</td>
                      <td>{op.amount} جنيه</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: paymentMethodColor(op.paymentMethod), color: '#fff' }}>
                          {paymentMethodLabel(op.paymentMethod)}
                        </span>
                      </td>
                      <td>{new Date(op.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{op.addedBy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4">لا توجد عمليات مسجلة لهذا اليوم</td>
                  </tr>
                )}
                {operationsData && operationsData.length > 0 && 
                 operationsData.filter(op => logFilter === 'all' || op.type === logFilter).length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4">لا توجد نتائج لهذا النوع</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}


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
          {summary.paymentBreakdown && (
            <div className="mt-3">
              <strong>تفاصيل طرق الدفع:</strong>
              <div className="d-flex gap-3 flex-wrap mt-2">
                <span style={{ color: '#28a745' }}>كاش: {summary.paymentBreakdown.cash || 0} جنيه</span>
                <span style={{ color: '#dc3545' }}>فودافون: {summary.paymentBreakdown.vodafone || 0} جنيه</span>
                <span style={{ color: '#007bff' }}>فيزا: {summary.paymentBreakdown.visa || 0} جنيه</span>
                <span style={{ color: '#e67e22' }}>انستاباي: {summary.paymentBreakdown.instapay || 0} جنيه</span>
              </div>
            </div>
          )}
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
                    {packages.map(pkg => (
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
                    {packages.filter(pkg => pkg.type === 'makeup').map(pkg => (
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
                    {packages.filter(pkg => pkg.type === 'photography').map(pkg => (
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
                    options={services.filter(srv => srv.type === 'instant').map(srv => ({ value: srv._id, label: srv.name, price: srv.price }))}
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>طريقة الدفع</Form.Label>
                  <Form.Control
                    as="select"
                    value={bookingFormData.paymentMethod}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">كاش</option>
                    <option value="vodafone">فودافون كاش</option>
                    <option value="visa">فيزا</option>
                    <option value="instapay">انستاباي</option>
                  </Form.Control>
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
                    clientName: '', clientPhone: '', city: '', eventDate: '', hennaDate: '', deposit: '', paymentMethod: 'cash'
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
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.username}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>الخدمات</Form.Label>
                  <Select
                    isMulti
                    options={[
                      { value: 'custom-trigger', label: 'إدخال حر (خدمة خاصة)' },
                      ...services.filter(srv => srv.type === 'instant').map(srv => ({ value: srv._id, label: srv.name }))
                    ]}
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
              
              {(instantServiceFormData.services || []).some(s => s.value === 'custom-trigger') && (
                <Col md={12} className="mt-3">
                  <Card className="p-3 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <h5>إضافة خدمات خاصة (إدخال حر)</h5>
                    <Row>
                      <Col md={5}>
                        <Form.Group>
                          <Form.Label>اسم الخدمة</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={customServiceName}
                            onChange={(e) => setCustomServiceName(e.target.value)}
                            placeholder="أدخل اسم الخدمة"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>السعر</Form.Label>
                          <Form.Control 
                            type="number" 
                            value={customServicePrice}
                            onChange={(e) => setCustomServicePrice(e.target.value)}
                            placeholder="السعر بالجنيه"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3} className="d-flex align-items-end">
                        <Button variant="info" onClick={handleAddCustomService} className="w-100">
                          إضافة خدمة خاصة
                        </Button>
                      </Col>
                    </Row>
                    
                    {instantServiceFormData.customServices.length > 0 && (
                      <div className="mt-3">
                        <h6>الخدمات خاصة المضافة:</h6>
                        <ul>
                          {instantServiceFormData.customServices.map(srv => (
                            <li key={srv._id} className="d-flex justify-content-between align-items-center mb-2">
                              <span>{srv.name} - {srv.price} جنيه</span>
                              <Button variant="danger" size="sm" onClick={() => handleRemoveCustomService(srv._id)}>
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </Col>
              )}

              <Col md={6}>
                <Form.Group>
                  <Form.Label>طريقة الدفع</Form.Label>
                  <Form.Control
                    as="select"
                    value={instantServiceFormData.paymentMethod}
                    onChange={(e) => setInstantServiceFormData({ ...instantServiceFormData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">كاش</option>
                    <option value="vodafone">فودافون كاش</option>
                    <option value="visa">فيزا</option>
                    <option value="instapay">انستاباي</option>
                  </Form.Control>
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
                  setInstantServiceFormData({ employeeId: '', services: [], customServices: [], paymentMethod: 'cash' });
                  setCustomServiceName('');
                  setCustomServicePrice('');
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>طريقة الدفع</Form.Label>
                  <Form.Control
                    as="select"
                    value={expenseAdvanceFormData.paymentMethod}
                    onChange={(e) => setExpenseAdvanceFormData({ ...expenseAdvanceFormData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">كاش</option>
                    <option value="vodafone">فودافون كاش</option>
                    <option value="visa">فيزا</option>
                    <option value="instapay">انستاباي</option>
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
                        value={userOptions.find(opt => opt.value === expenseAdvanceFormData.userId?.toString()) || null}
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
                        value={userOptions.find(opt => opt.value === expenseAdvanceFormData.userId?.toString()) || null}
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
                  setExpenseAdvanceFormData({ type: 'expense', details: '', amount: '', userId: '', paymentMethod: 'cash' });
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
          <Form.Group className="mt-3">
            <Form.Label>طريقة الدفع</Form.Label>
            <Form.Control
              as="select"
              value={installmentPaymentMethod}
              onChange={(e) => setInstallmentPaymentMethod(e.target.value)}
            >
              <option value="cash">كاش</option>
              <option value="vodafone">فودافون كاش</option>
              <option value="visa">فيزا</option>
              <option value="instapay">انستاباي</option>
            </Form.Control>
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
              <p>تاريخ المناسبة: {new Date(currentDetails.eventDate).toLocaleDateString()}</p>
              {currentDetails.hennaDate && <p>تاريخ الحنة: {new Date(currentDetails.hennaDate).toLocaleDateString()}</p>}
              <p>الباكدج: {currentDetails.package?.name || 'غير محدد'}</p>
              {currentDetails.hennaPackage && <p>باكدج حنة: {currentDetails.hennaPackage.name}</p>}
              {currentDetails.photographyPackage && <p>باكدج تصوير: {currentDetails.photographyPackage.name}</p>}
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
                          <td>{renderUpdateChanges(update.changes)}</td>
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
