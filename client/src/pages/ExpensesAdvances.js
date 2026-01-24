import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Modal, Pagination } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faEye, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useRxdb } from '../db/RxdbProvider';

const PAGE_SIZE = 9;

function ExpensesAdvances({ user }) {
  const [formData, setFormData] = useState({ type: 'expense', details: '', amount: 0, userId: '' });
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false); // إضافة الـ state هنا
  const [submitLoading, setSubmitLoading] = useState(false);
  const { collections, queueOperation } = useRxdb() || {};

  const userOptions = useMemo(() => (
    users.map(user => ({
      value: user._id?.toString(),
      label: `${user.username} (المتبقي: ${user.remainingSalary} جنيه)`
    }))
  ), [users]);

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

  // تحميل البيانات من RxDB محلياً
  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (u?._id) map.set(u._id.toString(), u);
    });
    return map;
  }, [users]);

  const resolveUser = useCallback((value) => {
    if (!value) return null;
    const id = (value?._id || value || '').toString();
    if (!id) return typeof value === 'object' ? value : null;
    return usersMap.get(id) || (typeof value === 'object' ? value : null);
  }, [usersMap]);

  const getUsername = useCallback((value) => {
    const resolved = resolveUser(value);
    return resolved?.username || 'غير معروف';
  }, [resolveUser]);

  // تحميل البيانات من RxDB محلياً
  useEffect(() => {
    if (!collections?.users || !collections?.expenses || !collections?.advances || !collections?.deductions) return;

    const usrSub = collections.users
      .find({ selector: { _deleted: { $ne: true } } })
      .$.subscribe((docs) => setUsers(docs.map((d) => d.toJSON())));

    const syncItems = () => {
      const expenseDocs = collections.expenses.find({ selector: { _deleted: { $ne: true } } }).exec();
      const advanceDocs = collections.advances.find({ selector: { _deleted: { $ne: true } } }).exec();
      const deductionDocs = collections.deductions.find({ selector: { _deleted: { $ne: true } } }).exec();
      return Promise.all([expenseDocs, advanceDocs, deductionDocs]);
    };

    let unsub = false;
    const load = async () => {
      const [expenseDocs, advanceDocs, deductionDocs] = await syncItems();
      if (unsub) return;
      const allItems = [
        ...expenseDocs.map((d) => ({ ...d.toJSON(), type: 'expense' })),
        ...advanceDocs.map((d) => ({ ...d.toJSON(), type: 'advance' })),
        ...deductionDocs.map((d) => ({ ...d.toJSON(), type: 'deduction' }))
      ].map((item) => ({
        ...item,
        userId: resolveUser(item.userId) || item.userId,
        createdBy: resolveUser(item.createdBy) || item.createdBy
      }));
      const filtered = allItems.filter((item) => {
        const q = search.trim();
        if (!q) return true;
        return (item.details || '').includes(q) || (getUsername(item.userId).includes(q));
      });
      const sorted = filtered.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
      const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
      const current = Math.min(currentPage, pages);
      const start = (current - 1) * PAGE_SIZE;
      setItems(sorted.slice(start, start + PAGE_SIZE));
      setTotalPages(pages);
      setCurrentPage(current);
    };

    load();

    // اشتراكات مباشرة لكل كولكشن للتحديث اللحظي
    const expenseSub = collections.expenses.$.subscribe(load);
    const advanceSub = collections.advances.$.subscribe(load);
    const deductionSub = collections.deductions.$.subscribe(load);

    return () => {
      unsub = true;
      usrSub?.unsubscribe();
      expenseSub?.unsubscribe();
      advanceSub?.unsubscribe();
      deductionSub?.unsubscribe();
    };
  }, [collections, currentPage, search, resolveUser, getUsername]);

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const upsertLocal = async (collectionName, doc, op = 'update') => {
    const col = collections?.[collectionName];
    if (!col) throw new Error('قاعدة البيانات غير جاهزة');
    const withTs = { ...doc, updatedAt: new Date().toISOString() };
    await col.upsert(withTs);
    if (queueOperation) await queueOperation(collectionName, op, withTs);
    return withTs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // فحص البيانات قبل الإرسال
    if (formData.type === 'expense' && (!formData.details || !formData.amount)) {
      setMessage('تفاصيل المصروف والمبلغ مطلوبة');
      return;
    }
    if (formData.type === 'advance' || formData.type === 'deduction') {
      if (!formData.userId || !formData.amount) {
        setMessage('اسم الموظف والمبلغ مطلوبين');
        return;
      }
      if (formData.type === 'deduction' && !formData.details) {
        setMessage('سبب الخصم مطلوب');
        return;
      }
      const selectedUser = users.find(u => u._id === formData.userId);
      if (selectedUser && parseFloat(formData.amount) > selectedUser.remainingSalary) {
        setMessage(formData.type === 'advance' ? 'السلفة أكبر من المتبقي من الراتب' : 'الخصم أكبر من المتبقي من الراتب');
        return;
      }
    }
    if (submitLoading) return;
    setSubmitLoading(true);
    setShowCreateModal(false);
    try {
      const baseDoc = {
        _id: editItem?._id || newId(),
        details: formData.details,
        amount: Number(formData.amount) || 0,
        userId: formData.userId || null,
        createdBy: user?.id || user?._id || null,
        createdAt: editItem?.createdAt || new Date().toISOString(),
        _deleted: false
      };

      let targetCollection = 'expenses';
      if (formData.type === 'advance') targetCollection = 'advances';
      if (formData.type === 'deduction') targetCollection = 'deductions';

      await upsertLocal(targetCollection, baseDoc, editItem ? 'update' : 'insert');
      const typeLabel = formData.type === 'expense' ? 'المصروف' : formData.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
      setMessage(`تم ${editItem ? 'تعديل' : 'إضافة'} ${typeLabel} محلياً وسيتم رفعه عند الاتصال`);
      setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
      setEditItem(null);
    } catch (err) {
      console.error('Submit error:', err);
      setMessage('خطأ في إضافة/تعديل العملية');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      type: item.type || (item.details ? 'expense' : 'advance'),
      details: item.details || '',
      amount: item.amount || 0,
      userId: item.userId?._id?.toString() || item.userId || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !deleteItem._id || !deleteItem.type) {
      setMessage('خطأ: لا يمكن الحذف بسبب بيانات غير صالحة');
      setShowDeleteModal(false);
      return;
    }
    try {
      const targetCollection = deleteItem.type === 'expense' ? 'expenses' : deleteItem.type === 'advance' ? 'advances' : 'deductions';
      await upsertLocal(targetCollection, { ...deleteItem, _deleted: true }, 'delete');
      const typeLabel = deleteItem.type === 'expense' ? 'المصروف' : deleteItem.type === 'advance' ? 'السلفة' : 'الخصم الإداري';
      setMessage(`تم حذف ${typeLabel} محلياً وسيتم رفعه عند الاتصال`);
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Delete error:', err);
      setMessage('خطأ في الحذف');
      setShowDeleteModal(false);
    }
  };

  const handleShowDetails = (item) => {
    console.log('Showing details for item:', item);
    setCurrentDetails(item);
    setShowDetailsModal(true);
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  return (
    <Container className="mt-5">
      <h2>إدارة المصروفات والسلف</h2>
      {message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        <FontAwesomeIcon icon={faPlus} /> إضافة عملية جديدة
      </Button>
      <Row className="mt-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>بحث بالاسم أو تفاصيل</Form.Label>
            <Form.Control
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو تفاصيل الصرف"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Form.Group>
        </Col>
      </Row>
      <Button variant="primary" onClick={handleSearch} className="mt-2">بحث</Button>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'تعديل العملية' : 'إضافة عملية جديدة'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} className="form-row">
            <Col md={6}>
              <Form.Group>
                <Form.Label>نوع العملية</Form.Label>
                <Form.Control
                  as="select"
                  value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, details: '', userId: '' })}
                >
                  <option value="expense">مصروف</option>
                  <option value="advance">سلفة</option>
                    <option value="deduction">خصم إداري</option>
                </Form.Control>
              </Form.Group>
            </Col>
              {formData.type === 'expense' ? (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>تفاصيل المصروف</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>المبلغ</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </>
              ) : formData.type === 'advance' ? (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>اسم الموظف</Form.Label>
                    <Select
                      options={userOptions}
                      value={userOptions.find(opt => opt.value === formData.userId?.toString()) || null}
                      onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value.toString() : '' })}
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
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                        value={userOptions.find(opt => opt.value === formData.userId?.toString()) || null}
                        onChange={(selected) => setFormData({ ...formData, userId: selected ? selected.value.toString() : '' })}
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
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>سبب الخصم</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.details}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
            )}
            <Col md={12}>
              <Button type="submit" className="mt-3" disabled={submitLoading}>
                {submitLoading ? 'جارٍ الحفظ...' : editItem ? 'تعديل' : 'حفظ'}
              </Button>
              <Button variant="secondary" className="mt-3 ms-2" onClick={() => {
                setFormData({ type: 'expense', details: '', amount: 0, userId: '' });
                setEditItem(null);
                setShowCreateModal(false);
              }}>
                إلغاء
              </Button>
            </Col>
          </Form>
        </Modal.Body>
      </Modal>

      <h3>المصروفات والسلف</h3>
      <Row>
        {items.map(item => (
          <Col md={4} key={item._id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>
                  {item.type === 'expense' ? 'مصروف' : item.type === 'advance' ? 'سلفة' : 'خصم إداري'}
                </Card.Title>
                <Card.Text>
                  {item.type === 'expense'
                    ? `التفاصيل: ${item.details || 'غير محدد'}`
                    : `الموظف: ${getUsername(item.userId)}`}
                  <br />
                  {item.type === 'deduction' && `سبب الخصم: ${item.details || 'غير محدد'}`}<br />
                  المبلغ: {item.amount || 0} جنيه<br />
                  التاريخ: {new Date(item.createdAt).toLocaleDateString()}<br />
                  أضيف بواسطة: {getUsername(item.createdBy) || getUsername(item.userId)}
                </Card.Text>
                <Button variant="primary" className="me-2" onClick={() => handleEdit(item)}>
                  <FontAwesomeIcon icon={faEdit} />
                </Button>
                <Button variant="primary" className="me-2" onClick={() => handleShowDetails(item)}>
                  <FontAwesomeIcon icon={faEye} />
                </Button>
                <Button variant="danger" onClick={() => { setDeleteItem(item); setShowDeleteModal(true); }}>
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Pagination className="justify-content-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>تأكيد الحذف</Modal.Title>
        </Modal.Header>
        <Modal.Body>هل أنت متأكد من حذف {deleteItem?.type === 'expense' ? 'المصروف' : 'السلفة'}؟</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete}>حذف</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل العملية</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentDetails && (
            <div>
              <p>النوع: {currentDetails.type === 'expense' ? 'مصروف' : 'سلفة'}</p>
              {currentDetails.type === 'expense' ? (
                <p>التفاصيل: {currentDetails.details || 'غير محدد'}</p>
              ) : currentDetails.type === 'advance' ? (
                <>
                  <p>الموظف: {getUsername(currentDetails.userId)}</p>
                  <p>المتبقي من الراتب: {resolveUser(currentDetails.userId)?.remainingSalary || 0} جنيه</p>
                </>
              ) : (
                <>
                  <p>الموظف: {getUsername(currentDetails.userId)}</p>
                  <p>سبب الخصم: {currentDetails.details || 'غير محدد'}</p>
                  <p>المتبقي من الراتب: {resolveUser(currentDetails.userId)?.remainingSalary || 0} جنيه</p>
                </>
              )}
              <p>المبلغ: {currentDetails.amount || 0} جنيه</p>
              <p>التاريخ: {new Date(currentDetails.createdAt).toLocaleDateString()}</p>
              <p>أضيف بواسطة: {getUsername(currentDetails.createdBy) || getUsername(currentDetails.userId)}</p>
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

export default ExpensesAdvances;