import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import Select from 'react-select';
import { useRxdb } from '../db/RxdbProvider';

const newId = (prefix = 'loc') => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const normalizeId = (id) => (id?._id || id || '').toString();

const inRange = (dt, start, end) => {
  if (!dt) return false;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

function EmployeeReports({ user }) {
  const { collections } = useRxdb() || {};
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [instantServices, setInstantServices] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [deductions, setDeductions] = useState([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
    listen(collections.users, setUsers);
    listen(collections.bookings, setBookings);
    listen(collections.services, setServices);
    listen(collections.instantServices, setInstantServices);
    listen(collections.advances, setAdvances);
    listen(collections.deductions, setDeductions);
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

  const userOptions = useMemo(() => (
    users.map((u) => ({ value: normalizeId(u), label: u.username }))
  ), [users]);

  const loadReport = useCallback(() => {
    if (!selectedUser) {
      setMessage('اختر موظف أولاً');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const target = usersMap.get(selectedUser);
      if (!target) {
        setMessage('الموظف غير موجود محلياً');
        setLoading(false);
        return;
      }

      const start = fromDate ? new Date(fromDate) : null;
      const end = toDate ? new Date(toDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const rawPoints = Array.isArray(target.points)
        ? target.points.flatMap((p) => (Array.isArray(p) ? p : [p]))
        : [];

      const workPoints = rawPoints
        .filter((p) => p && p.date && inRange(p.date, start, end))
        .map((p) => ({
          amount: p.amount || 0,
          date: p.date,
          bookingId: normalizeId(p.bookingId),
          serviceId: normalizeId(p.serviceId),
          serviceName: p.serviceName || null,
          receiptNumber: p.receiptNumber || null,
          instantServiceId: normalizeId(p.instantServiceId)
        }));

      const bookingsMap = bookings.reduce((acc, b) => {
        acc[normalizeId(b)] = b;
        return acc;
      }, {});
      const servicesMap = services.reduce((acc, s) => {
        acc[normalizeId(s)] = s;
        return acc;
      }, {});
      const instantMap = instantServices.reduce((acc, i) => {
        acc[normalizeId(i)] = i;
        return acc;
      }, {});

      const workWithNames = workPoints.map((p) => {
        const booking = p.bookingId ? bookingsMap[p.bookingId] : null;
        const instant = p.instantServiceId ? instantMap[p.instantServiceId] : null;
        const instantService = instant ? (instant.services || []).find((s) => normalizeId(s) === p.serviceId) : null;
        const receipt = p.receiptNumber
          || (instant ? instant.receiptNumber || '-' : null)
          || (booking ? booking.receiptNumber || '-' : '-');
        const serviceName = p.serviceName
          || (instantService ? instantService.name : null)
          || (p.serviceId && servicesMap[p.serviceId] ? servicesMap[p.serviceId].name : '-')
          || '-';
        return {
          ...p,
          bookingReceipt: receipt || '-',
          serviceName
        };
      });

      const advancesFiltered = advances.filter((a) => normalizeId(a.userId) === selectedUser && inRange(a.createdAt, start, end));
      const deductionsFiltered = deductions.filter((d) => normalizeId(d.userId) === selectedUser && inRange(d.createdAt, start, end));

      const pointsTotal = workPoints.reduce((sum, p) => sum + (p.amount || 0), 0);
      const advancesTotal = advancesFiltered.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const deductionsTotal = deductionsFiltered.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

      setReport({
        user: { id: selectedUser, username: target.username, role: target.role, remainingSalary: target.remainingSalary, monthlySalary: target.monthlySalary },
        range: { from: fromDate || null, to: toDate || null },
        work: workWithNames,
        advances: advancesFiltered,
        deductions: deductionsFiltered,
        totals: { pointsTotal, advancesTotal, deductionsTotal }
      });
    } catch (err) {
      console.error('Offline employee report error:', err);
      setMessage('خطأ في تجهيز التقرير محلياً');
    } finally {
      setLoading(false);
    }
  }, [selectedUser, fromDate, toDate, usersMap, bookings, services, instantServices, advances, deductions]);

  return (
    <Container className="mt-5">
      <h2>تقارير الموظفين</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'warning'}>{message}</Alert>}
      <Card className="p-3 mb-4">
        <Row className="g-3 align-items-end">
          <Col md={4}>
            <Form.Group>
              <Form.Label>الموظف</Form.Label>
              <Select
                options={userOptions}
                value={userOptions.find(opt => opt.value === selectedUser) || null}
                onChange={(opt) => setSelectedUser(opt ? opt.value : '')}
                placeholder="اختر الموظف"
                isSearchable
                className="booking-services-select"
                classNamePrefix="react-select"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>من تاريخ</Form.Label>
              <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>إلى تاريخ</Form.Label>
              <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Button variant="primary" onClick={loadReport} disabled={loading} className="w-100">
              {loading ? 'جارٍ التحميل...' : 'إنشاء تقرير'}
            </Button>
          </Col>
        </Row>
      </Card>

      {report && (
        <>
          <Row className="mb-3">
            <Col md={4}>
              <Card className="p-3">
                <strong>إجمالي النقاط</strong>
                <div>{report.totals?.pointsTotal || 0}</div>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="p-3">
                <strong>إجمالي السلف</strong>
                <div>{report.totals?.advancesTotal || 0} ج</div>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="p-3">
                <strong>إجمالي الخصومات</strong>
                <div>{report.totals?.deductionsTotal || 0} ج</div>
              </Card>
            </Col>
          </Row>

          <Card className="p-3 mb-4">
            <h5>الشغل (نقاط)</h5>
            {report.work?.length ? (
              <Table striped responsive className="mt-2">
                <thead>
                  <tr>
                    <th>م</th>
                    <th>التاريخ</th>
                    <th>النقاط</th>
                    <th>اسم الخدمة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.work.map((w, idx) => (
                    <tr key={`${w.date}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{new Date(w.date).toLocaleDateString()}</td>
                      <td>{w.amount}</td>
                      <td>{w.serviceName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">لا يوجد شغل في المدة المختارة</p>
            )}
          </Card>

          <Card className="p-3 mb-4">
            <h5>السلف</h5>
            {report.advances?.length ? (
              <Table striped responsive className="mt-2">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>أضيف بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.advances.map((a) => (
                    <tr key={a._id || newId('adv')}>
                      <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                      <td>{a.amount}</td>
                      <td>{a.createdBy?.username || 'غير معروف'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">لا توجد سلف في المدة المختارة</p>
            )}
          </Card>

          <Card className="p-3 mb-4">
            <h5>الخصومات الإدارية</h5>
            {report.deductions?.length ? (
              <Table striped responsive className="mt-2">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>السبب</th>
                    <th>أضيف بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.deductions.map((d) => (
                    <tr key={d._id || newId('ded')}>
                      <td>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                      <td>{d.amount}</td>
                      <td>{d.reason || d.note || '—'}</td>
                      <td>{d.createdBy?.username || 'غير معروف'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted">لا توجد خصومات في المدة المختارة</p>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}

export default EmployeeReports;
