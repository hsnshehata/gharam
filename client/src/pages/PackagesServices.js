import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Tabs, Tab, Card, Row, Col, Modal } from 'react-bootstrap';
import { useRxdb } from '../db/RxdbProvider';

function PackagesServices() {
  const [packageForm, setPackageForm] = useState({ name: '', price: 0, type: 'makeup' });
  const [serviceForm, setServiceForm] = useState({ name: '', price: 0, type: 'instant', packageId: '' });
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [pkgSubmitting, setPkgSubmitting] = useState(false);
  const [srvSubmitting, setSrvSubmitting] = useState(false);
  const { collections, queueOperation } = useRxdb() || {};

  const newId = (prefix) => (crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const upsertLocal = async (collectionName, doc, op = 'update') => {
    const col = collections?.[collectionName];
    if (!col) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await col.upsert(withTs);
    if (queueOperation) await queueOperation(collectionName, op, withTs);
    return withTs;
  };

  useEffect(() => {
    if (!collections?.packages || !collections?.services) return;

    const pkgSub = collections.packages
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => setPackages(docs.map((d) => d.toJSON())));

    const srvSub = collections.services
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => setServices(docs.map((d) => d.toJSON())));

    return () => {
      pkgSub?.unsubscribe();
      srvSub?.unsubscribe();
    };
  }, [collections]);

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    if (pkgSubmitting) return;
    setPkgSubmitting(true);
    try {
      const doc = {
        _id: editItem?._id || newId('pkg'),
        name: packageForm.name,
        price: Number(packageForm.price) || 0,
        type: packageForm.type,
        createdAt: editItem?.createdAt || new Date().toISOString(),
        _deleted: false
      };
      await upsertLocal('packages', doc, editItem ? 'update' : 'insert');
      setMessage(`تم ${editItem ? 'تعديل' : 'إضافة'} الباكدج محلياً وسيتم رفعه عند الاتصال`);
      setEditItem(null);
      setPackageForm({ name: '', price: 0, type: 'makeup' });
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الباكدج');
    } finally {
      setPkgSubmitting(false);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (srvSubmitting) return;
    setSrvSubmitting(true);
    try {
      const doc = {
        _id: editItem?._id || newId('srv'),
        name: serviceForm.name,
        price: Number(serviceForm.price) || 0,
        type: serviceForm.type,
        packageId: serviceForm.type === 'package' ? serviceForm.packageId || null : null,
        createdAt: editItem?.createdAt || new Date().toISOString(),
        _deleted: false
      };
      await upsertLocal('services', doc, editItem ? 'update' : 'insert');
      setMessage(`تم ${editItem ? 'تعديل' : 'إضافة'} الخدمة محلياً وسيتم رفعها عند الاتصال`);
      setEditItem(null);
      setServiceForm({ name: '', price: 0, type: 'instant', packageId: '' });
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الخدمة');
    } finally {
      setSrvSubmitting(false);
    }
  };

  const handleEdit = (item, type) => {
    if (type === 'package') {
      setPackageForm({ name: item.name, price: item.price, type: item.type });
      setEditItem(item);
    } else {
      setServiceForm({ name: item.name, price: item.price, type: item.type, packageId: item.packageId?._id || item.packageId || '' });
      setEditItem(item);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteItem.type === 'package') {
        await upsertLocal('packages', { ...deleteItem, _deleted: true }, 'delete');
        setMessage('تم حذف الباكدج محلياً وسيتم رفعه عند الاتصال');
      } else {
        await upsertLocal('services', { ...deleteItem, _deleted: true }, 'delete');
        setMessage('تم حذف الخدمة محلياً وسيتم رفعها عند الاتصال');
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
            <Button type="submit" className="mt-3" disabled={pkgSubmitting}>
              {pkgSubmitting ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
            </Button>
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
            <Button type="submit" className="mt-3" disabled={srvSubmitting}>
              {srvSubmitting ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
            </Button>
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