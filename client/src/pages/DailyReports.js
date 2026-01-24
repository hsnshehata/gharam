import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Alert, Form, Button, Table, Spinner, Badge } from 'react-bootstrap';
import { useRxdb } from '../db/RxdbProvider';

const currency = (v) => `${Number(v || 0).toLocaleString('ar-EG')} ج`;

const BarLines = ({ data = [], accent = '#c49841' }) => {
  if (!data.length) return <div className="muted">لا يوجد بيانات</div>;
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  return (
    <div className="bar-lines">
      {data.map((d) => (
        <div className="bar-line" key={d.label}>
          <div className="bar-meta">
            <span>{d.label}</span>
            <strong>{currency(d.value)}</strong>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${((d.value || 0) / max) * 100}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MiniList = ({ title, items = [], formatter }) => (
  <Card className="h-100">
    <Card.Body>
      <div className="section-head">
        <h5 className="mb-0">{title}</h5>
      </div>
      {!items.length && <div className="muted">لا يوجد بيانات</div>}
      {items.map((item) => (
        <div className="mini-row" key={item.name || item.username}>
          <div>
            <div className="mini-title">{item.name || item.username}</div>
            {item.role && <div className="mini-sub">{item.role}</div>}
          </div>
          <div className="mini-value">{formatter ? formatter(item) : currency(item.amount || item.points || 0)}</div>
        </div>
      ))}
    </Card.Body>
  </Card>
);

const SummaryGrid = ({ summary, stats }) => (
  <Row className="g-3 mb-3">
    <Col md={3} sm={6} xs={12}>
      <Card className="summary-card positive">
        <Card.Body>
          <div className="label">حجوزات وأقساط</div>
          <div className="value">{currency(summary.totalDeposit)}</div>
        </Card.Body>
      </Card>
    </Col>
    <Col md={3} sm={6} xs={12}>
      <Card className="summary-card positive">
        <Card.Body>
          <div className="label">خدمات فورية</div>
          <div className="value">{currency(summary.totalInstantServices)}</div>
        </Card.Body>
      </Card>
    </Col>
    <Col md={3} sm={6} xs={12}>
      <Card className="summary-card negative">
        <Card.Body>
          <div className="label">مصروفات + سلف</div>
          <div className="value">{currency((summary.totalExpenses || 0) + (summary.totalAdvances || 0))}</div>
        </Card.Body>
      </Card>
    </Col>
    <Col md={3} sm={6} xs={12}>
      <Card className="summary-card neutral">
        <Card.Body>
          <div className="label">الصافي</div>
          <div className="value">{currency(summary.net)}</div>
          {stats && (
            <div className="mini-sub">صافي يومي متوسّط: {currency(stats.averageNetPerDay || summary.net)}</div>
          )}
        </Card.Body>
      </Card>
    </Col>
  </Row>
);

const typeLabels = {
  booking: 'حجز',
  installment: 'قسط',
  instantService: 'خدمة فورية',
  expense: 'مصروف',
  advance: 'سلفة'
};

const msInDay = 1000 * 60 * 60 * 24;

const flattenPoints = (points) => {
  if (!Array.isArray(points)) return [];
  return points.flatMap((p) => (Array.isArray(p) ? p : [p])).filter(Boolean);
};

const between = (dateLike, start, end) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

function Reports() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const { collections } = useRxdb() || {};

  const [bookings, setBookings] = useState([]);
  const [instantServices, setInstantServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(todayStr);
  const [month, setMonth] = useState(monthStr);
  const [range, setRange] = useState({ from: monthStart.slice(0, 7), to: monthStr });
  const [dailyData, setDailyData] = useState({ summary: {}, operations: [], analytics: {} });
  const [monthlyData, setMonthlyData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState({ daily: false, monthly: false, range: false });
  const [showAllMonthlyDays, setShowAllMonthlyDays] = useState(false);

  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const key = (u._id && u._id.toString()) || u.id || u.userId || u.username;
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

  const buildReport = useMemo(() => {
    return ({ startDate, endDate, includeOperations = false, includeDailyBreakdown = false }) => {
      if (!startDate || !endDate) return { summary: {}, operations: [], analytics: {} };

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { summary: {}, operations: [], analytics: {} };
      }

      const dailyMap = new Map();
      const addToDay = (date, amount) => {
        if (!includeDailyBreakdown || !date) return;
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);
        const iso = d.toISOString().slice(0, 10);
        dailyMap.set(iso, (dailyMap.get(iso) || 0) + (amount || 0));
      };

      const bookingsInRange = bookings.filter((b) => between(b.createdAt, start, end));
      const bookingsWithInstallments = bookings.filter((b) => Array.isArray(b.installments) && b.installments.some((inst) => between(inst.date, start, end)));

      const totalDepositFromBookings = bookingsInRange.reduce((sum, booking) => {
        const installmentsSum = (booking.installments || []).reduce((s, inst) => s + (inst.amount || 0), 0);
        const initialDeposit = (booking.deposit || 0) - installmentsSum;
        addToDay(booking.createdAt, initialDeposit);
        return sum + initialDeposit;
      }, 0);

      const totalInstallments = bookingsWithInstallments.reduce((sum, booking) => {
        const instSum = (booking.installments || [])
          .filter((inst) => between(inst.date, start, end))
          .reduce((s, inst) => {
            addToDay(inst.date, inst.amount || 0);
            return s + (inst.amount || 0);
          }, 0);
        return sum + instSum;
      }, 0);

      const totalDeposit = totalDepositFromBookings + totalInstallments;

      const instantInRange = instantServices.filter((i) => between(i.createdAt, start, end));
      const totalInstantServices = instantInRange.reduce((sum, service) => {
        addToDay(service.createdAt, service.total || 0);
        return sum + (service.total || 0);
      }, 0);

      const expensesInRange = expenses.filter((e) => between(e.createdAt, start, end));
      const totalExpenses = expensesInRange.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const advancesInRange = advances.filter((a) => between(a.createdAt, start, end));
      const totalAdvances = advancesInRange.reduce((sum, advance) => sum + (advance.amount || 0), 0);

      const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

      const packageMix = { makeup: 0, photography: 0, unknown: 0 };
      const topPackagesMap = new Map();

      bookingsInRange.forEach((booking) => {
        const installmentsSum = (booking.installments || []).reduce((s, inst) => s + (inst.amount || 0), 0);
        const initialDeposit = (booking.deposit || 0) - installmentsSum;
        const pkgId = (booking.package && booking.package._id) || booking.package;
        const pkg = pkgId ? packagesMap.get(pkgId) : null;
        const pkgType = pkg?.type || 'unknown';
        const pkgName = pkg?.name || 'باكدج غير محدد';
        packageMix[pkgType] = (packageMix[pkgType] || 0) + initialDeposit;
        const current = topPackagesMap.get(pkgName) || { name: pkgName, count: 0, amount: 0 };
        topPackagesMap.set(pkgName, { name: pkgName, count: current.count + 1, amount: current.amount + initialDeposit });
      });

      bookingsWithInstallments.forEach((booking) => {
        const pkgId = (booking.package && booking.package._id) || booking.package;
        const pkg = pkgId ? packagesMap.get(pkgId) : null;
        const pkgType = pkg?.type || 'unknown';
        const pkgName = pkg?.name || 'باكدج غير محدد';
        (booking.installments || [])
          .filter((inst) => between(inst.date, start, end))
          .forEach((inst) => {
            packageMix[pkgType] = (packageMix[pkgType] || 0) + (inst.amount || 0);
            const current = topPackagesMap.get(pkgName) || { name: pkgName, count: 0, amount: 0 };
            topPackagesMap.set(pkgName, { name: pkgName, count: current.count, amount: current.amount + (inst.amount || 0) });
          });
      });

      const topPackages = Array.from(topPackagesMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const topServicesMap = new Map();
      instantInRange.forEach((service) => {
        (service.services || []).forEach((s) => {
          const name = s.name || servicesMap.get(s._id)?.name || 'خدمة';
          const current = topServicesMap.get(name) || { name, count: 0, amount: 0 };
          topServicesMap.set(name, { name, count: current.count + 1, amount: current.amount + (s.price || 0) });
        });
      });

      const topServices = Array.from(topServicesMap.values())
        .sort((a, b) => (b.count - a.count) || (b.amount - a.amount))
        .slice(0, 5);

      const daysCount = Math.max(1, Math.round((end - start) / msInDay) + 1);
      const gross = totalDeposit + totalInstantServices;
      const expenseRatio = gross ? Number(((totalExpenses + totalAdvances) / gross).toFixed(3)) : 0;
      const averageNetPerDay = Number((net / daysCount).toFixed(2));

      const topEarners = users
        .map((u) => {
          const total = flattenPoints(u.points)
            .filter((p) => between(p.date, start, end))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          return { username: u.username, role: u.role, points: total };
        })
        .filter((u) => u.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      const dailyRevenue = includeDailyBreakdown
        ? (() => {
            const days = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const iso = new Date(d).toISOString().slice(0, 10);
              days.push({ date: iso, total: Number((dailyMap.get(iso) || 0).toFixed(2)) });
            }
            return days;
          })()
        : [];

      const revenueStreams = [
        { label: 'حجوزات وأقساط', value: totalDeposit },
        { label: 'شغل فوري', value: totalInstantServices }
      ];

      const outflows = [
        { label: 'مصروفات', value: totalExpenses },
        { label: 'سلف', value: totalAdvances }
      ];

      const resolveUser = (id) => {
        const key = (id && id.toString && id.toString()) || id;
        return usersMap.get(key)?.username || 'غير معروف';
      };

      const operations = includeOperations
        ? [
            ...bookingsInRange.map((booking) => {
              const installmentsSum = (booking.installments || []).reduce((s, inst) => s + (inst.amount || 0), 0);
              const initialDeposit = (booking.deposit || 0) - installmentsSum;
              const pkgId = (booking.package && booking.package._id) || booking.package;
              const pkg = pkgId ? packagesMap.get(pkgId) : null;
              return {
                type: 'booking',
                details: `حجز لـ ${booking.clientName || '-'}${pkg ? ` (باكدج: ${pkg.name || '-'})` : ''}`,
                amount: initialDeposit,
                createdAt: booking.createdAt,
                createdBy: resolveUser(booking.createdBy)
              };
            }),
            ...bookingsWithInstallments.flatMap((booking) =>
              (booking.installments || [])
                .filter((inst) => between(inst.date, start, end))
                .map((inst) => ({
                  type: 'installment',
                  details: `قسط لـ ${booking.clientName || '-'}${booking.receiptNumber ? ` (وصل ${booking.receiptNumber})` : ''}`,
                  amount: inst.amount || 0,
                  createdAt: inst.date,
                  createdBy: resolveUser(inst.employeeId)
                }))
            ),
            ...instantInRange.map((service) => ({
              type: 'instantService',
              details: `خدمة فورية (${(service.services || []).map((s) => s.name || servicesMap.get(s._id)?.name || 'خدمة').join(', ')})`,
              amount: service.total || 0,
              createdAt: service.createdAt,
              createdBy: resolveUser(service.employeeId)
            })),
            ...expensesInRange.map((expense) => ({
              type: 'expense',
              details: expense.details,
              amount: expense.amount || 0,
              createdAt: expense.createdAt,
              createdBy: resolveUser(expense.createdBy || expense.userId)
            })),
            ...advancesInRange.map((advance) => ({
              type: 'advance',
              details: `سلفة لـ ${resolveUser(advance.userId)}`,
              amount: advance.amount || 0,
              createdAt: advance.createdAt,
              createdBy: resolveUser(advance.createdBy || advance.userId)
            }))
          ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        : [];

      return {
        summary: {
          totalDeposit,
          totalInstantServices,
          totalExpenses,
          totalAdvances,
          net
        },
        operations,
        analytics: {
          revenueStreams,
          outflows,
          packageMix,
          topPackages,
          topServices,
          topEarners,
          stats: {
            gross,
            expenseRatio,
            averageNetPerDay,
            daysCount
          },
          dailyRevenue
        }
      };
    };
  }, [advances, bookings, expenses, instantServices, packagesMap, servicesMap, users, usersMap]);

  useEffect(() => {
    if (!collections) return undefined;
    const subs = [];

    const listen = (col, setter) => {
      if (!col) return;
      const sub = col
        .find({ selector: { _deleted: { $eq: false } } })
        .$.subscribe((docs) => setter(docs.map((d) => (d.toJSON ? d.toJSON() : d))));
      subs.push(sub);
    };

    listen(collections.bookings, setBookings);
    listen(collections.instantServices, setInstantServices);
    listen(collections.expenses, setExpenses);
    listen(collections.advances, setAdvances);
    listen(collections.packages, setPackages);
    listen(collections.services, setServices);
    listen(collections.users, setUsers);

    return () => subs.forEach((s) => s && s.unsubscribe && s.unsubscribe());
  }, [collections]);

  const fetchDaily = () => {
    if (!collections) {
      setMessage('البيانات لسه بتتحمل');
      return;
    }
    setLoading((p) => ({ ...p, daily: true }));
    setMessage('');
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    const report = buildReport({ startDate, endDate, includeOperations: true });
    setDailyData(report);
    setLoading((p) => ({ ...p, daily: false }));
  };

  const fetchMonthly = () => {
    if (!collections) {
      setMessage('البيانات لسه بتتحمل');
      return;
    }
    setLoading((p) => ({ ...p, monthly: true }));
    setMessage('');
    const target = month ? new Date(`${month}-01`) : new Date();
    if (Number.isNaN(target.getTime())) {
      setMessage('شهر غير صالح');
      setLoading((p) => ({ ...p, monthly: false }));
      return;
    }
    const startDate = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);
    const payload = buildReport({ startDate, endDate, includeDailyBreakdown: true });
    payload.meta = { label: startDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) };
    setMonthlyData(payload);
    setLoading((p) => ({ ...p, monthly: false }));
  };

  const fetchRange = () => {
    if (!collections) {
      setMessage('البيانات لسه بتتحمل');
      return;
    }
    if (!range.from || !range.to) {
      setMessage('حدد شهر البداية وشهر النهاية');
      return;
    }
    const fromDate = new Date(`${range.from}-01`);
    const [toYear, toMonth] = range.to.split('-').map(Number);
    const endDate = new Date(toYear, toMonth, 0, 23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setMessage('التواريخ غير صالحة');
      return;
    }
    const startDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    setLoading((p) => ({ ...p, range: true }));
    setMessage('');
    const payload = buildReport({ startDate, endDate, includeDailyBreakdown: true });
    payload.meta = { from: range.from, to: range.to };
    setRangeData(payload);
    setLoading((p) => ({ ...p, range: false }));
  };

  useEffect(() => {
    if (!collections) return;
    fetchDaily();
    fetchMonthly();
    fetchRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, buildReport]);

  const monthlyFromDaily = (daily = []) => {
    const map = new Map();
    daily.forEach((d) => {
      const key = d.date.slice(0, 7); // YYYY-MM
      const current = map.get(key) || 0;
      map.set(key, current + (d.total || 0));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
  };

  const analyticsBlock = (data, options = {}) => {
    const dailyRevenueData = options.dailyRevenueData || data.analytics?.dailyRevenue || [];
    const dailyTitle = options.dailyTitle || 'الدخل اليومي خلال الشهر';
    const dailyBadgeLabel = options.dailyBadgeLabel || data.analytics?.stats?.daysCount;
    const dailyNote = options.dailyNote || 'الأرقام تمثل إجمالي الدخل (حجوزات + خدمات فورية) لكل يوم.';
    const dailyControls = options.dailyControls;

    return (
    <>
      <SummaryGrid summary={data.summary || {}} stats={data.analytics?.stats} />
      <Row className="g-3 mb-3">
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <div className="section-head">
                <h5 className="mb-1">التدفقات النقدية</h5>
                <Badge bg="light" text="dark">صافي: {currency(data.summary?.net)}</Badge>
              </div>
              <BarLines data={[...(data.analytics?.revenueStreams || []), ...(data.analytics?.outflows || [])]} accent="#c49841" />
              <div className="muted mt-2">نسبة المصروفات للسحب: {(data.analytics?.stats?.expenseRatio || 0) * 100}%</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <div className="section-head">
                <h5 className="mb-1">{dailyTitle}</h5>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Badge bg="light" text="dark">أيام: {dailyBadgeLabel}</Badge>
                  {dailyControls}
                </div>
              </div>
              <BarLines
                data={dailyRevenueData.map((d) => ({ label: d.date.slice(8, 10), value: d.total }))}
                accent="#1fb6a6"
              />
              <div className="muted mt-2">{dailyNote}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="g-3 mb-3">
        <Col md={4}><MiniList title="أعلى باكدجات" items={data.analytics?.topPackages || []} /></Col>
        <Col md={4}><MiniList title="أكثر شغل اتعمل" items={data.analytics?.topServices || []} formatter={(i) => `${i.count} مرة / ${currency(i.amount)}`} /></Col>
        <Col md={4}><MiniList title="أعلى مجمعين نقاط" items={data.analytics?.topEarners || []} formatter={(i) => `${i.points} نقطة`} /></Col>
      </Row>
    </>
    );
  };

  return (
    <Container className="mt-4 reports-page">
      <div className="reports-header">
        <div>
          <h2 className="mb-1">التقارير</h2>
          <div className="muted">تتبع الأرباح والخساير والمصروفات والسلف برسومات خفيفة وقراءة سريعة.</div>
        </div>
        <div className="reports-tabs">
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>التقارير اليومية</button>
          <button className={activeTab === 'monthly' ? 'active' : ''} onClick={() => setActiveTab('monthly')}>التقارير الشهرية</button>
          <button className={activeTab === 'range' ? 'active' : ''} onClick={() => setActiveTab('range')}>تقارير الفترة الزمنية</button>
        </div>
      </div>

      {message && <Alert variant="danger">{message}</Alert>}

      {activeTab === 'daily' && (
        <>
          <Card className="mb-3">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col md={4} sm={6}>
                  <Form.Group>
                    <Form.Label>اختر التاريخ</Form.Label>
                    <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && fetchDaily()} />
                  </Form.Group>
                </Col>
                <Col md={3} sm={6}>
                  <Button variant="primary" onClick={fetchDaily} disabled={loading.daily}>
                    {loading.daily ? 'جارٍ التحميل...' : 'عرض التقرير'}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {loading.daily ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : (
            <>
              <SummaryGrid summary={dailyData.summary || {}} />
              <Card className="mb-3">
                <Card.Body>
                  <div className="section-head mb-2">
                    <h5 className="mb-0">تفاصيل العمليات</h5>
                    <Badge bg="light" text="dark">{dailyData.operations?.length || 0} حركة</Badge>
                  </div>
                  <Table striped bordered hover responsive className="mt-2">
                    <thead>
                      <tr>
                        <th>النوع</th>
                        <th>التفاصيل</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>أضيف بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dailyData.operations || []).map((op, index) => (
                        <tr key={`${op.createdAt}-${index}`}>
                          <td><Badge bg="secondary">{typeLabels[op.type] || 'غير معروف'}</Badge></td>
                          <td>{op.details}</td>
                          <td className={['expense', 'advance'].includes(op.type) ? 'text-danger' : 'text-success'}>{currency(op.amount)}</td>
                          <td>{new Date(op.createdAt).toLocaleDateString()}</td>
                          <td>{op.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </>
      )}

      {activeTab === 'monthly' && (
        <>
          <Card className="mb-3">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col md={4} sm={6}>
                  <Form.Label>اختر الشهر</Form.Label>
                  <Form.Control type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </Col>
                <Col md={3} sm={6}>
                  <Button variant="primary" onClick={fetchMonthly} disabled={loading.monthly}>
                    {loading.monthly ? 'جارٍ التحميل...' : 'عرض التقرير'}
                  </Button>
                </Col>
                {monthlyData?.meta?.label && (
                  <Col md={5} className="text-md-end text-sm-start muted">{monthlyData.meta.label}</Col>
                )}
              </Row>
            </Card.Body>
          </Card>
          {loading.monthly ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : monthlyData && (
            (() => {
              const daily = monthlyData.analytics?.dailyRevenue || [];
              const top5 = [...daily].sort((a, b) => b.total - a.total).slice(0, 5);
              const dailyForChart = showAllMonthlyDays ? daily : top5;
              const controlButton = daily.length > 5 ? (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setShowAllMonthlyDays((p) => !p)}
                >
                  {showAllMonthlyDays ? 'عرض أعلى 5 أيام' : 'عرض الشهر كامل'}
                </Button>
              ) : null;

              return analyticsBlock(monthlyData, {
                dailyRevenueData: dailyForChart,
                dailyTitle: showAllMonthlyDays ? 'الدخل اليومي للشهر كامل' : 'أعلى 5 أيام دخل في الشهر',
                dailyBadgeLabel: dailyForChart.length,
                dailyNote: showAllMonthlyDays
                  ? 'إجمالي الدخل اليومي (حجوزات + خدمات فورية) لجميع أيام الشهر.'
                  : 'ترتيب تنازلي لأعلى 5 أيام دخل في الشهر.',
                dailyControls: controlButton
              });
            })()
          )}
        </>
      )}

      {activeTab === 'range' && (
        <>
          <Card className="mb-3">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col md={4} sm={6}>
                  <Form.Label>من (شهر)</Form.Label>
                  <Form.Control type="month" value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
                </Col>
                <Col md={4} sm={6}>
                  <Form.Label>إلى (شهر)</Form.Label>
                  <Form.Control type="month" value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
                </Col>
                <Col md={3} sm={6}>
                  <Button variant="primary" onClick={fetchRange} disabled={loading.range}>
                    {loading.range ? 'جارٍ التحميل...' : 'عرض التقرير'}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          {loading.range ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : rangeData && (
            (() => {
              const monthlyTotals = monthlyFromDaily(rangeData.analytics?.dailyRevenue || []);
              return analyticsBlock(rangeData, {
                dailyRevenueData: monthlyTotals.map((m) => ({ date: `${m.month}-01`, total: m.total })),
                dailyTitle: 'الدخل الشهري خلال الفترة المختارة',
                dailyBadgeLabel: monthlyTotals.length,
                dailyNote: 'إجمالي الدخل (حجوزات + خدمات فورية) لكل شهر في الفترة.',
                dailyControls: null
              });
            })()
          )}
        </>
      )}
    </Container>
  );
}

export default Reports;