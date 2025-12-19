import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Form, Button, Table, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';

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

function Reports() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(todayStr);
  const [month, setMonth] = useState(monthStr);
  const [range, setRange] = useState({ from: monthStart, to: todayStr });
  const [dailyData, setDailyData] = useState({ summary: {}, operations: [], analytics: {} });
  const [monthlyData, setMonthlyData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState({ daily: false, monthly: false, range: false });
  const [showAllMonthlyDays, setShowAllMonthlyDays] = useState(false);

  const fetchDaily = async () => {
    setLoading((p) => ({ ...p, daily: true }));
    setMessage('');
    try {
      const res = await axios.get(`/api/reports/daily?date=${date}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setDailyData(res.data);
    } catch (err) {
      setMessage('خطأ في جلب التقرير اليومي');
    } finally {
      setLoading((p) => ({ ...p, daily: false }));
    }
  };

  const fetchMonthly = async () => {
    setLoading((p) => ({ ...p, monthly: true }));
    setMessage('');
    try {
      const res = await axios.get(`/api/reports/monthly?month=${month}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setMonthlyData(res.data);
    } catch (err) {
      setMessage('خطأ في جلب التقرير الشهري');
    } finally {
      setLoading((p) => ({ ...p, monthly: false }));
    }
  };

  const fetchRange = async () => {
    if (!range.from || !range.to) {
      setMessage('حدد تاريخ البداية والنهاية');
      return;
    }
    setLoading((p) => ({ ...p, range: true }));
    setMessage('');
    try {
      const res = await axios.get(`/api/reports/range?from=${range.from}&to=${range.to}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setRangeData(res.data);
    } catch (err) {
      setMessage('خطأ في جلب تقرير الفترة');
    } finally {
      setLoading((p) => ({ ...p, range: false }));
    }
  };

  useEffect(() => {
    fetchDaily();
    fetchMonthly();
    fetchRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  <Form.Label>من</Form.Label>
                  <Form.Control type="date" value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
                </Col>
                <Col md={4} sm={6}>
                  <Form.Label>إلى</Form.Label>
                  <Form.Control type="date" value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
                </Col>
                <Col md={3} sm={6}>
                  <Button variant="primary" onClick={fetchRange} disabled={loading.range}>
                    {loading.range ? 'جارٍ التحميل...' : 'عرض التقرير'}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          {loading.range ? <div className="text-center"><Spinner animation="border" /></div> : rangeData && analyticsBlock(rangeData)}
        </>
      )}
    </Container>
  );
}

export default Reports;