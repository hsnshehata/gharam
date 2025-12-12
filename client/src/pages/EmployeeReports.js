import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import axios from 'axios';
import Select from 'react-select';

function EmployeeReports() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const userOptions = useMemo(() => (
    users.map(u => ({ value: u._id?.toString(), label: u.username }))
  ), [users]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/users', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setUsers(res.data.map(u => ({ ...u, _id: u._id?.toString() })));
      } catch (err) {
        setMessage('خطأ في جلب الموظفين');
      }
    };
    fetchUsers();
  }, []);

  const loadReport = async () => {
    if (!selectedUser) {
      setMessage('اختر موظف أولاً');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.get('/api/reports/employee', {
        params: { userId: selectedUser, from: fromDate || undefined, to: toDate || undefined },
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setReport(res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'خطأ في جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

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
                    <tr key={idx}>
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
                    <tr key={a._id}>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
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
                    <tr key={d._id}>
                      <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td>{d.amount}</td>
                      <td>{d.reason}</td>
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
