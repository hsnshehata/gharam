import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPause, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';
import { Link } from 'react-router-dom';

function AfrakoushToolsRegistry() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const fetchTools = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/afrakoush', {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setTools(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('ليس لديك صلاحية لعرض لوحة الإدارة الخاصة بعفركوش.');
      } else {
        setError('حدث خطأ أثناء جلب قائمة الأدوات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'published' ? 'paused' : 'published';
      await axios.put(`/api/afrakoush/${id}`, { status: newStatus }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast(newStatus === 'published' ? 'تم تفعيل الأداة بنجاح' : 'تم إيقاف الأداة مؤقتاً', 'success');
      fetchTools();
    } catch (err) {
      showToast('خطأ أثناء تغيير حالة الأداة', 'danger');
    }
  };

  const deleteTool = async (id) => {
    if (!window.confirm('هل أنت متأكد من أنك تريد حذف هذه الأداة نهائياً؟')) return;
    try {
      await axios.delete(`/api/afrakoush/${id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      showToast('تم حذف الأداة بنجاح', 'success');
      fetchTools();
    } catch (err) {
      showToast('خطأ أثناء حذف الأداة', 'danger');
    }
  };

  const roleLabel = (role) => {
    const labels = {
      admin: { text: 'المدير', bg: 'danger' },
      supervisor: { text: 'المشرفين', bg: 'primary' },
      employee: { text: 'الموظفين', bg: 'info' },
      public: { text: 'عام', bg: 'success' }
    };
    const c = labels[role] || labels['supervisor'];
    return <Badge bg={c.bg}>{c.text}</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">جاري تحميل سجل أدوات عفركوش...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 style={{ color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>مكتبة أدوات عفركوش</h3>
              <p className="text-muted mt-2 mb-0">الأدوات والصفحات الديناميكية التي تم بناؤها بواسطة الذكاء الاصطناعي</p>
            </div>
          </div>

          {tools.length === 0 ? (
            <Alert variant="info" className="text-center">لا توجد أي أدوات مسجلة حتى الآن. يمكنك الطلب من عفركوش في الشات بناء أداة جديدة.</Alert>
          ) : (
            <Table responsive hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>اسم الأداة</th>
                  <th>الرابط (Name)</th>
                  <th>الصلاحية</th>
                  <th>الحالة</th>
                  <th>تاريخ الإنشاء</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tools.map(tool => (
                  <tr key={tool._id}>
                    <td><strong>{tool.title}</strong></td>
                    <td dir="ltr" className="text-end"><code>{tool.name}</code></td>
                    <td>{roleLabel(tool.allowedRole)}</td>
                    <td>
                      {tool.status === 'published' ? (
                        <Badge bg="success">نشط</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">متوقف</Badge>
                      )}
                    </td>
                    <td>{new Date(tool.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="text-center">
                      <Button
                        variant="light"
                        size="sm"
                        className="me-2"
                        as={Link}
                        to={tool.allowedRole === 'public' ? `/p/afrakoush/${tool.name}` : `/admin/afrakoush/${tool.name}`}
                        target="_blank"
                        title="معاينة"
                      >
                        <FontAwesomeIcon icon={faEye} className="text-primary" />
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="me-2"
                        onClick={() => toggleStatus(tool._id, tool.status)}
                        title={tool.status === 'published' ? "إيقاف مؤقت" : "تفعيل"}
                      >
                        <FontAwesomeIcon icon={tool.status === 'published' ? faPause : faPlay} className={tool.status === 'published' ? "text-warning" : "text-success"} />
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => deleteTool(tool._id)}
                        title="حذف الأداة"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AfrakoushToolsRegistry;
