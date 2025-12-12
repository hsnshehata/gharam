import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Tabs, Tab, Card, Row, Col, Modal } from 'react-bootstrap';
import axios from 'axios';

function PackagesServices() {
  const [packageForm, setPackageForm] = useState({ name: '', price: 0, type: 'makeup' });
  const [serviceForm, setServiceForm] = useState({ name: '', price: 0, type: 'instant', packageId: '' });
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pkgRes = await axios.get('/api/packages/packages', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const srvRes = await axios.get('/api/packages/services', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages(pkgRes.data);
        setServices(srvRes.data);
      } catch (err) {
        setMessage('خطأ في جلب البيانات');
      }
    };
    fetchData();
  }, []);

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        const res = await axios.put(`/api/packages/package/${editItem._id}`, packageForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages(packages.map(pkg => (pkg._id === editItem._id ? res.data.pkg : pkg)));
        setMessage('تم تعديل الباكدج بنجاح');
        setEditItem(null);
      } else {
        const res = await axios.post('/api/packages/package', packageForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages([...packages, res.data.pkg]);
        setMessage('تم إضافة الباكدج بنجاح');
      }
      setPackageForm({ name: '', price: 0, type: 'makeup' });
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الباكدج');
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        const res = await axios.put(`/api/packages/service/${editItem._id}`, serviceForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setServices(services.map(srv => (srv._id === editItem._id ? res.data.service : srv)));
        setMessage('تم تعديل الخدمة بنجاح');
        setEditItem(null);
      } else {
        const res = await axios.post('/api/packages/service', serviceForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setServices([...services, res.data.service]);
        setMessage('تم إضافة الخدمة بنجاح');
      }
      setServiceForm({ name: '', price: 0, type: 'instant', packageId: '' });
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الخدمة');
    }
  };

  const handleEdit = (item, type) => {
    if (type === 'package') {
      setPackageForm({ name: item.name, price: item.price, type: item.type });
      setEditItem(item);
    } else {
      setServiceForm({ name: item.name, price: item.price, type: item.type, packageId: item.packageId?._id || '' });
      setEditItem(item);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteItem.type === 'package') {
        await axios.delete(`/api/packages/package/${deleteItem._id}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages(packages.filter(pkg => pkg._id !== deleteItem._id));
        setMessage('تم حذف الباكدج بنجاح');
      } else {
        await axios.delete(`/api/packages/service/${deleteItem._id}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setServices(services.filter(srv => srv._id !== deleteItem._id));
        setMessage('تم حذف الخدمة بنجاح');
      }
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2>إضافة باكدجات وخدمات</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Tabs defaultActiveKey="package" className="mb-3">
        <Tab eventKey="package" title="إضافة باكدج">
          <Form onSubmit={handlePackageSubmit}>
            <Form.Group>
              <Form.Label>اسم الباكدج</Form.Label>
              <Form.Control
                type="text"
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>السعر</Form.Label>
              <Form.Control
                type="number"
                value={packageForm.price}
                onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>نوع الباكدج</Form.Label>
              <Form.Control
                as="select"
                value={packageForm.type}
                onChange={(e) => setPackageForm({ ...packageForm, type: e.target.value })}
              >
                <option value="makeup">ميك اب</option>
                <option value="photography">تصوير</option>
              </Form.Control>
            </Form.Group>
            <Button type="submit" className="mt-3">{editItem ? 'تعديل' : 'حفظ'}</Button>
            <Button variant="secondary" className="mt-3 ms-2" onClick={() => { setPackageForm({ name: '', price: 0, type: 'makeup' }); setEditItem(null); }}>
              إلغاء
            </Button>
          </Form>
        </Tab>
        <Tab eventKey="service" title="إضافة خدمة">
          <Form onSubmit={handleServiceSubmit}>
            <Form.Group>
              <Form.Label>اسم الخدمة</Form.Label>
              <Form.Control
                type="text"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>السعر</Form.Label>
              <Form.Control
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>نوع الخدمة</Form.Label>
              <Form.Control
                as="select"
                value={serviceForm.type}
                onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value })}
              >
                <option value="instant">فورية</option>
                <option value="package">خدمة باكدج</option>
              </Form.Control>
            </Form.Group>
            {serviceForm.type === 'package' && (
              <Form.Group>
                <Form.Label>الباكدج</Form.Label>
                <Form.Control
                  as="select"
                  value={serviceForm.packageId}
                  onChange={(e) => setServiceForm({ ...serviceForm, packageId: e.target.value })}
                >
                  <option value="">اختر باكدج</option>
                  {packages.map(pkg => (
                    <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            )}
            <Button type="submit" className="mt-3">{editItem ? 'تعديل' : 'حفظ'}</Button>
            <Button variant="secondary" className="mt-3 ms-2" onClick={() => { setServiceForm({ name: '', price: 0, type: 'instant', packageId: '' }); setEditItem(null); }}>
              إلغاء
            </Button>
          </Form>
        </Tab>
      </Tabs>

      <h3 className="mt-5">الباكدجات</h3>
      <Row>
        {packages.map(pkg => (
          <Col md={4} key={pkg._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{pkg.name}</Card.Title>
                <Card.Text>
                  السعر: {pkg.price} جنيه<br />
                  النوع: {pkg.type === 'makeup' ? 'ميك اب' : 'تصوير'}<br />
                  تاريخ الإضافة: {new Date(pkg.createdAt).toLocaleDateString()}
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(pkg, 'package')}>
                  تعديل
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem({ _id: pkg._id, type: 'package' }); setShowDeleteModal(true); }}>
                  حذف
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h3 className="mt-5">الخدمات</h3>
      <Row>
        {services.map(srv => (
          <Col md={4} key={srv._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{srv.name}</Card.Title>
                <Card.Text>
                  السعر: {srv.price} جنيه<br />
                  النوع: {srv.type === 'instant' ? 'فورية' : 'خدمة باكدج'}<br />
                  {srv.packageId && `الباكدج: ${srv.packageId.name}`}<br />
                  تاريخ الإضافة: {new Date(srv.createdAt).toLocaleDateString()}
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(srv, 'service')}>
                  تعديل
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem({ _id: srv._id, type: 'service' }); setShowDeleteModal(true); }}>
                  حذف
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف {deleteItem?.type === 'package' ? 'الباكدج' : 'الخدمة'}؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            حذف
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PackagesServices;