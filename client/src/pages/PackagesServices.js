import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Card, Row, Col, Modal } from 'react-bootstrap';
import axios from 'axios';

function PackagesServices() {
  const [packageForm, setPackageForm] = useState({ name: '', price: 0, type: 'makeup' });
  const [serviceForm, setServiceForm] = useState({ name: '', price: 0, type: 'instant', packageId: '' });
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  
  // New modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState('package'); // 'package' or 'service'
  const [editItem, setEditItem] = useState(null);
  
  const [pkgSubmitting, setPkgSubmitting] = useState(false);
  const [srvSubmitting, setSrvSubmitting] = useState(false);

  // Search and Filter States
  const [packageSearch, setPackageSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

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

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditItem(null);
    setPackageForm({ name: '', price: 0, type: 'makeup' });
    setServiceForm({ name: '', price: 0, type: 'instant', packageId: '' });
  };

  const openAddModal = (type) => {
    setFormType(type);
    setEditItem(null);
    if (type === 'package') {
      setPackageForm({ name: '', price: 0, type: 'makeup' });
    } else {
      setServiceForm({ name: '', price: 0, type: 'instant', packageId: '' });
    }
    setShowFormModal(true);
  };

  const handleEdit = (item, type) => {
    setFormType(type);
    if (type === 'package') {
      setPackageForm({ name: item.name, price: item.price, type: item.type });
      setEditItem(item);
    } else {
      setServiceForm({ name: item.name, price: item.price, type: item.type, packageId: item.packageId?._id || '' });
      setEditItem(item);
    }
    setShowFormModal(true);
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    if (pkgSubmitting) return;
    setPkgSubmitting(true);
    try {
      if (editItem) {
        const res = await axios.put(`/api/packages/package/${editItem._id}`, packageForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages(packages.map(pkg => (pkg._id === editItem._id ? res.data.pkg : pkg)));
        setMessage('تم تعديل الباكدج بنجاح');
      } else {
        const res = await axios.post('/api/packages/package', packageForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setPackages([...packages, res.data.pkg]);
        setMessage('تم إضافة الباكدج بنجاح');
      }
      closeFormModal();
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
      if (editItem) {
        const res = await axios.put(`/api/packages/service/${editItem._id}`, serviceForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setServices(services.map(srv => (srv._id === editItem._id ? res.data.service : srv)));
        setMessage('تم تعديل الخدمة بنجاح');
      } else {
        const res = await axios.post('/api/packages/service', serviceForm, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setServices([...services, res.data.service]);
        setMessage('تم إضافة الخدمة بنجاح');
      }
      closeFormModal();
    } catch (err) {
      setMessage('خطأ في إضافة/تعديل الخدمة');
    } finally {
      setSrvSubmitting(false);
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

  const filteredPackages = packages.filter(pkg => {
    const matchSearch = pkg.name.toLowerCase().includes(packageSearch.toLowerCase());
    const matchFilter = packageFilter === 'all' || pkg.type === packageFilter;
    return matchSearch && matchFilter;
  });

  const filteredServices = services.filter(srv => {
    const matchSearch = srv.name.toLowerCase().includes(serviceSearch.toLowerCase());
    const matchFilter = serviceFilter === 'all' || srv.type === serviceFilter;
    return matchSearch && matchFilter;
  });

  return (
    <Container className="mt-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <h2>إدارة الباكدجات والخدمات</h2>
        <div>
          <Button variant="success" className="me-2" onClick={() => openAddModal('package')}>
            + إضافة باكدج
          </Button>
          <Button variant="info" className="text-white" onClick={() => openAddModal('service')}>
            + إضافة خدمة
          </Button>
        </div>
      </div>
      
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      
      <h3 className="mt-4">الباكدجات</h3>
      <Row className="mb-3">
        <Col md={8} className="mb-2">
          <Form.Control 
            type="text" 
            placeholder="ابحث عن باكدج بالاسم..." 
            value={packageSearch}
            onChange={(e) => setPackageSearch(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Control 
            as="select" 
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
          >
            <option value="all">كل الأنواع</option>
            <option value="makeup">ميك اب</option>
            <option value="photography">تصوير</option>
          </Form.Control>
        </Col>
      </Row>
      {filteredPackages.length === 0 && <Alert variant="info">لا توجد باكدجات مطابقة للبحث</Alert>}
      <Row>
        {filteredPackages.map(pkg => (
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
      <Row className="mb-3">
        <Col md={8} className="mb-2">
          <Form.Control 
            type="text" 
            placeholder="ابحث عن خدمة بالاسم..." 
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Control 
            as="select" 
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="all">كل الأنواع</option>
            <option value="instant">فورية</option>
            <option value="package">خدمة باكدج</option>
          </Form.Control>
        </Col>
      </Row>
      {filteredServices.length === 0 && <Alert variant="info">لا توجد خدمات مطابقة للبحث</Alert>}
      <Row>
        {filteredServices.map(srv => (
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

      {/* Form Modal */}
      <Modal show={showFormModal} onHide={closeFormModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editItem 
              ? (formType === 'package' ? 'تعديل باكدج' : 'تعديل خدمة') 
              : (formType === 'package' ? 'إضافة باكدج' : 'إضافة خدمة')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formType === 'package' ? (
            <Form onSubmit={handlePackageSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>اسم الباكدج</Form.Label>
                <Form.Control
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>السعر</Form.Label>
                <Form.Control
                  type="number"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
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
              <div className="d-flex justify-content-end">
                <Button variant="secondary" className="ms-2" onClick={closeFormModal}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={pkgSubmitting} variant="primary">
                  {pkgSubmitting ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
                </Button>
              </div>
            </Form>
          ) : (
            <Form onSubmit={handleServiceSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>اسم الخدمة</Form.Label>
                <Form.Control
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>السعر</Form.Label>
                <Form.Control
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
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
                <Form.Group className="mb-3">
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
              <div className="d-flex justify-content-end">
                <Button variant="secondary" className="ms-2" onClick={closeFormModal}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={srvSubmitting} variant="primary">
                  {srvSubmitting ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
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