import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = '';

const formatDate = (dateString) => {
  if (!dateString) return 'غير متوفر';
  const d = new Date(dateString);
  if (isNaN(d)) return 'غير متوفر';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const paymentLabels = { cash: 'كاش', vodafone: 'فودافون', visa: 'فيزا', instapay: 'انستاباي' };
const paymentColors = { cash: 'var(--v2-cash)', vodafone: 'var(--v2-vodafone)', visa: 'var(--v2-visa)', instapay: 'var(--v2-instapay)' };

function V2Dashboard({ user }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({ bookingCount: 0, totalDeposit: 0, instantServiceCount: 0, totalInstantServices: 0, totalExpenses: 0, totalAdvances: 0, net: 0 });
  const [bookings, setBookings] = useState({ makeupBookings: [], hairStraighteningBookings: [], hairDyeBookings: [], photographyBookings: [] });
  const [operations, setOperations] = useState([]);
  const [activeTab, setActiveTab] = useState('makeup');
  const [logFilter, setLogFilter] = useState('all');
  const [showOperations, setShowOperations] = useState(true);
  const [showFab, setShowFab] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem('token'), []);
  const headers = useMemo(() => ({ headers: { 'x-auth-token': token } }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, bookingsRes, opsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/dashboard/summary?date=${date}`, headers),
        axios.get(`${API_BASE}/api/today-work?date=${date}`, headers),
        axios.get(`${API_BASE}/api/dashboard/operations?date=${date}`, headers),
      ]);
      setSummary(summaryRes.data);
      setBookings(bookingsRes.data || { makeupBookings: [], hairStraighteningBookings: [], hairDyeBookings: [], photographyBookings: [] });
      setOperations(opsRes.data || []);
    } catch (err) {
      console.error('V2Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [date, headers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Tab data ── */
  const tabsConfig = useMemo(() => [
    { key: 'makeup', label: '💄 ميك آب', data: bookings.makeupBookings, accent: '#8b5cf6' },
    { key: 'hair', label: '✨ فرد شعر', data: bookings.hairStraighteningBookings, accent: '#ec4899' },
    { key: 'dye', label: '🎨 صبغة', data: bookings.hairDyeBookings, accent: '#f59e0b' },
    { key: 'photo', label: '📸 تصوير', data: bookings.photographyBookings, accent: '#06b6d4' },
  ], [bookings]);

  const activeBookings = tabsConfig.find(t => t.key === activeTab)?.data || [];
  const activeAccent = tabsConfig.find(t => t.key === activeTab)?.accent || '#6366f1';

  /* ── Filtered operations ── */
  const filteredOps = useMemo(() => {
    if (logFilter === 'all') return operations;
    return operations.filter(op => op.type === logFilter);
  }, [operations, logFilter]);

  const getOpBadgeClass = (type) => {
    if (type.includes('حجز') && !type.includes('حذف')) return 'v2-tag-primary';
    if (type.includes('قسط') || type.includes('دفعة')) return 'v2-tag-info';
    if (type.includes('خدمة فورية') && !type.includes('حذف')) return 'v2-tag-success';
    if (type.includes('مصروف') && !type.includes('حذف')) return 'v2-tag-danger';
    if (type.includes('سلفة') && !type.includes('حذف')) return 'v2-tag-warning';
    if (type.includes('حذف')) return 'v2-tag-dark';
    return 'v2-tag-primary';
  };

  /* ── Navigate to V1 to open modals (temporary — until V2 modals are built) ── */
  const goToV1Action = (hash) => navigate(`/dashboard${hash ? '#' + hash : ''}`);

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="v2-section-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--v2-text)' }}>شغل إنهاردة</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--v2-muted)', margin: 0 }}>تابع حجوزات وعمليات اليوم في لمحة واحدة</p>
        </div>
        <div className="v2-date-picker">
          <input
            type="date"
            className="v2-date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="v2-empty">
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div className="v2-empty-text">جاري تحميل البيانات...</div>
        </div>
      ) : (
        <>
          {/* ── Summary Hero Card ── */}
          <div className="v2-summary-card v2-animate-in" style={{ marginBottom: 20 }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="v2-summary-title">صافي اليوم</div>
              <div className="v2-summary-value">{summary.net} <small style={{ fontSize: '1rem', opacity: 0.7 }}>جنيه</small></div>
              <div className="v2-summary-details">
                <div className="v2-summary-item">
                  <span className="v2-summary-item-label">العربون</span>
                  <span className="v2-summary-item-value">{summary.totalDeposit} ج</span>
                </div>
                <div className="v2-summary-item">
                  <span className="v2-summary-item-label">خدمات فورية</span>
                  <span className="v2-summary-item-value">{summary.totalInstantServices} ج</span>
                </div>
                <div className="v2-summary-item">
                  <span className="v2-summary-item-label">مصروفات</span>
                  <span className="v2-summary-item-value">-{summary.totalExpenses} ج</span>
                </div>
                <div className="v2-summary-item">
                  <span className="v2-summary-item-label">سلف</span>
                  <span className="v2-summary-item-value">-{summary.totalAdvances} ج</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="v2-stats-grid v2-stagger" style={{ marginBottom: 20 }}>
            <div className="v2-stat-card v2-animate-in" style={{ '--stat-accent': '#6366f1' }}>
              <div className="v2-stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>📋</div>
              <div className="v2-stat-info">
                <div className="v2-stat-label">الحجوزات الجديدة</div>
                <div className="v2-stat-value">{summary.bookingCount}</div>
              </div>
            </div>
            <div className="v2-stat-card v2-animate-in" style={{ '--stat-accent': '#ec4899' }}>
              <div className="v2-stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>💄</div>
              <div className="v2-stat-info">
                <div className="v2-stat-label">حجوزات ميك آب</div>
                <div className="v2-stat-value">{bookings.makeupBookings?.length || 0}</div>
              </div>
            </div>
            <div className="v2-stat-card v2-animate-in" style={{ '--stat-accent': '#06b6d4' }}>
              <div className="v2-stat-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>📸</div>
              <div className="v2-stat-info">
                <div className="v2-stat-label">حجوزات تصوير</div>
                <div className="v2-stat-value">{bookings.photographyBookings?.length || 0}</div>
              </div>
            </div>
            <div className="v2-stat-card v2-animate-in" style={{ '--stat-accent': '#10b981' }}>
              <div className="v2-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>⚡</div>
              <div className="v2-stat-info">
                <div className="v2-stat-label">خدمات فورية</div>
                <div className="v2-stat-value">{summary.instantServiceCount}</div>
              </div>
            </div>
          </div>

          {/* ── Payment Channels ── */}
          {summary.paymentBreakdown && (
            <div style={{ marginBottom: 20 }}>
              <div className="v2-section-header">
                <div className="v2-section-title">💳 قنوات الدفع</div>
              </div>
              <div className="v2-payments-bar v2-stagger">
                {['cash', 'vodafone', 'visa', 'instapay'].map(pm => (
                  <div key={pm} className="v2-payment-chip v2-animate-in" style={{ '--chip-color': paymentColors[pm] }}>
                    <div className="v2-payment-dot" style={{ background: paymentColors[pm] }} />
                    <span className="v2-payment-label">{paymentLabels[pm]}</span>
                    <span className="v2-payment-value">{summary.paymentBreakdown[pm] || 0} ج</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions (Desktop) ── */}
          <div className="v2-quick-actions" style={{ marginBottom: 24 }}>
            <button className="v2-action-btn v2-action-booking" onClick={() => goToV1Action()}>
              ➕ إنشاء حجز
            </button>
            <button className="v2-action-btn v2-action-instant" onClick={() => goToV1Action()}>
              ⚡ شغل جديد
            </button>
            <button className="v2-action-btn v2-action-expense" onClick={() => goToV1Action()}>
              💸 مصروف / سلفة
            </button>
            <button className="v2-action-btn v2-action-hall" onClick={() => navigate('/v2/hall-supervision')}>
              🏛️ إشراف الصالة
            </button>
          </div>

          {/* ── Booking Tabs ── */}
          <div style={{ marginBottom: 20 }}>
            <div className="v2-section-header">
              <div className="v2-section-title">
                📅 حجوزات اليوم
                <span className="v2-badge">
                  {tabsConfig.reduce((sum, t) => sum + t.data.length, 0)}
                </span>
              </div>
            </div>

            <div className="v2-tabs" style={{ marginBottom: 16 }}>
              {tabsConfig.map(tab => (
                <button
                  key={tab.key}
                  className={`v2-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="v2-tab-count">{tab.data.length}</span>
                </button>
              ))}
            </div>

            {activeBookings.length === 0 ? (
              <div className="v2-card">
                <div className="v2-empty">
                  <div className="v2-empty-icon">📭</div>
                  <div className="v2-empty-text">لا توجد حجوزات في هذا القسم اليوم</div>
                </div>
              </div>
            ) : (
              <div className="v2-booking-grid v2-stagger">
                {activeBookings.map((booking, idx) => {
                  const isEventToday = new Date(booking.eventDate).toDateString() === new Date(date).toDateString();
                  const isPaid = Number(booking.remaining) === 0;
                  return (
                    <div
                      key={booking._id}
                      className="v2-booking-card v2-animate-in"
                      style={{ '--booking-accent': activeAccent }}
                    >
                      <div className="v2-booking-header">
                        <div className="v2-booking-name">
                          <span style={{ color: 'var(--v2-muted)', fontWeight: 400, fontSize: '0.85rem' }}>{idx + 1}.</span>
                          {booking.clientName}
                          {isPaid && <span className="v2-booking-type-badge v2-paid-badge">مدفوع ✓</span>}
                        </div>
                        {activeTab === 'makeup' && (
                          <span className="v2-booking-type-badge" style={{ background: isEventToday ? '#6366f1' : '#ec4899' }}>
                            {isEventToday ? 'زفاف/شبكة' : 'حنة'}
                          </span>
                        )}
                      </div>

                      <div className="v2-booking-details">
                        <div className="v2-booking-detail">
                          <span className="v2-booking-detail-icon">📞</span>
                          {booking.clientPhone}
                        </div>
                        <div className="v2-booking-detail">
                          <span className="v2-booking-detail-icon">💰</span>
                          المدفوع: {booking.deposit} ج — المتبقي: <strong style={{ color: isPaid ? 'var(--v2-success)' : 'var(--v2-danger)' }}>{booking.remaining} ج</strong>
                        </div>
                        {activeTab === 'dye' && booking.hairDyeDate && (
                          <div className="v2-booking-detail">
                            <span className="v2-booking-detail-icon">📅</span>
                            تاريخ الصبغة: {formatDate(booking.hairDyeDate)}
                          </div>
                        )}
                      </div>

                      <div className="v2-booking-actions">
                        <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => navigate('/dashboard')} title="طباعة">🖨️</button>
                        <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => navigate('/dashboard')} title="تعديل">✏️</button>
                        <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => navigate('/dashboard')} title="تفاصيل">👁️</button>
                        <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => navigate('/dashboard')} title="قسط">💵</button>
                        {user?.role === 'admin' && (
                          <button className="v2-btn v2-btn-ghost v2-btn-sm" style={{ color: 'var(--v2-danger)' }} onClick={() => navigate('/dashboard')} title="حذف">🗑️</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Operations Log ── */}
          <div style={{ marginBottom: 20 }}>
            <div className="v2-section-header">
              <div className="v2-section-title">
                📋 سجل تفاصيل العمليات
                <span className="v2-badge">{operations.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="v2-filter-select"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                >
                  <option value="all">عرض الكل</option>
                  <option value="إضافة حجز">إضافة حجز</option>
                  <option value="تعديل حجز">تعديل حجز</option>
                  <option value="حذف حجز">حذف حجز</option>
                  <option value="إضافة قسط">إضافة قسط</option>
                  <option value="إضافة خدمة فورية">خدمة فورية</option>
                  <option value="إضافة مصروف">مصروف</option>
                  <option value="إضافة سلفة">سلفة</option>
                </select>
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => setShowOperations(!showOperations)}
                >
                  {showOperations ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>

            {showOperations && (
              <div className="v2-card" style={{ padding: 0 }}>
                {filteredOps.length === 0 ? (
                  <div className="v2-empty" style={{ padding: 32 }}>
                    <div className="v2-empty-icon">📭</div>
                    <div className="v2-empty-text">لا توجد عمليات مسجلة</div>
                  </div>
                ) : (
                  <div className="v2-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="v2-table">
                      <thead>
                        <tr>
                          <th>النوع</th>
                          <th>التفاصيل</th>
                          <th>المبلغ</th>
                          <th>الدفع</th>
                          <th>الوقت</th>
                          <th>بواسطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOps.map(op => (
                          <tr key={op._id}>
                            <td>
                              <span className={`v2-tag ${getOpBadgeClass(op.type)}`}>{op.type}</span>
                            </td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.details}</td>
                            <td style={{ fontWeight: 700 }}>{op.amount} ج</td>
                            <td>
                              <span className="v2-tag" style={{
                                background: `${paymentColors[op.paymentMethod]}18`,
                                color: paymentColors[op.paymentMethod]
                              }}>
                                {paymentLabels[op.paymentMethod] || 'كاش'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--v2-muted)', fontSize: '0.82rem' }}>
                              {new Date(op.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ color: 'var(--v2-text-secondary)' }}>{op.addedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Day Summary Card ── */}
          <div className="v2-card v2-animate-in" style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--v2-text)' }}>📊 ملخص اليوم ({formatDate(date)})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--v2-border-light)' }}>
                <span style={{ color: 'var(--v2-muted)' }}>إجمالي العربون</span>
                <strong>{summary.totalDeposit} ج</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--v2-border-light)' }}>
                <span style={{ color: 'var(--v2-muted)' }}>خدمات فورية</span>
                <strong>{summary.totalInstantServices} ج</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--v2-border-light)' }}>
                <span style={{ color: 'var(--v2-muted)' }}>المصروفات</span>
                <strong style={{ color: 'var(--v2-danger)' }}>-{summary.totalExpenses} ج</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--v2-border-light)' }}>
                <span style={{ color: 'var(--v2-muted)' }}>السلف</span>
                <strong style={{ color: 'var(--v2-danger)' }}>-{summary.totalAdvances} ج</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontWeight: 700 }}>💰 الصافي</span>
                <strong style={{ color: 'var(--v2-success)', fontSize: '1.1rem' }}>{summary.net} ج</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FAB (Mobile) ── */}
      <button className="v2-fab" onClick={() => setShowFab(!showFab)}>
        {showFab ? '✕' : '➕'}
      </button>
      {showFab && (
        <div className="v2-fab-menu">
          <button className="v2-fab-item v2-action-booking" onClick={() => { setShowFab(false); goToV1Action(); }}>
            📋 إنشاء حجز
          </button>
          <button className="v2-fab-item v2-action-instant" onClick={() => { setShowFab(false); goToV1Action(); }}>
            ⚡ شغل جديد
          </button>
          <button className="v2-fab-item v2-action-expense" onClick={() => { setShowFab(false); goToV1Action(); }}>
            💸 مصروف / سلفة
          </button>
        </div>
      )}
    </div>
  );
}

export default V2Dashboard;
