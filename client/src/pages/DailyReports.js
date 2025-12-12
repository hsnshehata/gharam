import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Form, Button, Table } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

function DailyReports() {
  const [summary, setSummary] = useState({
    totalDeposit: 0,
    totalInstantServices: 0,
    totalExpenses: 0,
    totalAdvances: 0,
    net: 0
  });
  const [operations, setOperations] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`/api/reports/daily?date=${date}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        console.log('Report response:', res.data);
        setSummary(res.data.summary);
        setOperations(res.data.operations);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        setMessage('خطأ في جلب التقرير');
      }
    };
    fetchReport();
  }, [date]);

  const handleSearch = async () => {
    try {
      const res = await axios.get(`/api/reports/daily?date=${date}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      console.log('Search response:', res.data);
      setSummary(res.data.summary);
      setOperations(res.data.operations);
      setMessage('');
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      setMessage('خطأ في البحث');
    }
  };

  return (
    <Container className="mt-5">
      <h2>التقارير اليومية</h2>
      {message && <Alert variant="danger">{message}</Alert>}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>اختر التاريخ</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <Button variant="primary" onClick={handleSearch}>
            <FontAwesomeIcon icon={faSearch} /> بحث
          </Button>
        </Col>
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

      <h3>تفاصيل العمليات</h3>
      <Table striped bordered hover>
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
          {operations.map((op, index) => (
            <tr key={index}>
              <td>
                {op.type === 'booking' ? 'حجز' : 
                 op.type === 'instantService' ? 'خدمة فورية' : 
                 op.type === 'expense' ? 'مصروف' : 
                 op.type === 'advance' ? 'سلفة' : 
                 op.type === 'installment' ? 'قسط' : 'غير معروف'}
              </td>
              <td>{op.details}</td>
              <td>{op.amount} جنيه</td>
              <td>{new Date(op.createdAt).toLocaleDateString()}</td>
              <td>{op.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default DailyReports;