import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Card, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';

export default function AIAgentsManager({ isNested = false }) {
  const [agents, setAgents] = useState([]);
  const [meta, setMeta] = useState({ models: [], templates: [] });
  const [formData, setFormData] = useState({
    name: '', role: '', emoji: '🤖', color: 'gray', modelName: '', systemInstruction: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMeta();
    fetchAgents();
  }, []);

  const fetchMeta = async () => {
    try {
      const res = await axios.get('/api/admin/agents/meta', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        setMeta(res.data);
        if (res.data.models.length > 0) {
          setFormData(prev => ({ ...prev, modelName: res.data.models[0].id }));
        }
      }
    } catch (err) {
      toast.error('فشل في جلب البيانات الوصفية');
    }
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/agents', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) setAgents(res.data.agents);
    } catch (err) {
      toast.error('فشل في جلب الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTemplateSelect = (e) => {
    const tId = e.target.value;
    if (!tId) return;
    const template = meta.templates.find(t => t.templateId === tId);
    if (template) {
      setFormData({
        name: template.name,
        role: template.role,
        emoji: template.emoji,
        color: template.color,
        modelName: template.modelName,
        systemInstruction: template.systemInstruction
      });
      toast.success('تم استيراد بيانات النموذج');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await axios.put(`/api/admin/agents/${editingId}`, formData, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم التحديث بنجاح');
      } else {
        const res = await axios.post('/api/admin/agents', formData, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم إضافة الموظف بنجاح');
      }
      setFormData({ name: '', role: '', emoji: '🤖', color: 'gray', modelName: meta.models[0]?.id || '', systemInstruction: '' });
      setEditingId(null);
      fetchAgents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleEdit = (agent) => {
    setEditingId(agent._id);
    setFormData({
      name: agent.name,
      role: agent.role,
      emoji: agent.emoji,
      color: agent.color,
      modelName: agent.modelName,
      systemInstruction: agent.systemInstruction
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      const res = await axios.delete(`/api/admin/agents/${id}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        toast.success('تم الحذف بنجاح');
        fetchAgents();
      }
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  return (
    <div className={`p-3 ${isNested ? '' : 'bg-light min-vh-100'}`} dir="rtl">
      {!isNested && <h1 className="h3 fw-bold mb-4">إدارة فريق المساعدين (Agents)</h1>}
      
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <h2 className="h5 fw-bold mb-4">{editingId ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2>
          
          {!editingId && (
            <Alert variant="info" className="mb-4">
              <div className="fw-bold mb-2">💡 استيراد من نموذج جاهز لتوفير الوقت:</div>
              <Form.Select onChange={handleTemplateSelect} defaultValue="">
                <option value="" disabled>-- اختر شخصية --</option>
                {meta.templates.map(t => (
                  <option key={t.templateId} value={t.templateId}>{t.emoji} {t.name} ({t.role})</option>
                ))}
              </Form.Select>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6} lg={3}>
                <Form.Group>
                  <Form.Label>الاسم</Form.Label>
                  <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <Form.Group>
                  <Form.Label>الدور الوظيفي</Form.Label>
                  <Form.Control type="text" name="role" value={formData.role} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <Form.Group>
                  <Form.Label>رمز تعبيري (Emoji)</Form.Label>
                  <Form.Control type="text" name="emoji" value={formData.emoji} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <Form.Group>
                  <Form.Label>لون الواجهة</Form.Label>
                  <Form.Select name="color" value={formData.color} onChange={handleChange}>
                    <option value="gray">رمادي (افتراضي)</option>
                    <option value="primary">أزرق</option>
                    <option value="info">لبني</option>
                    <option value="danger">أحمر</option>
                    <option value="success">أخضر</option>
                    <option value="warning">أصفر</option>
                    <option value="dark">أسود</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>نموذج الذكاء الاصطناعي (OpenRouter Model)</Form.Label>
              <Form.Select name="modelName" value={formData.modelName} onChange={handleChange} required className="font-monospace font-sm">
                <option value="" disabled>-- اختر الموديل --</option>
                {meta.models.map(m => (
                  <option key={m.id} value={m.id}>{m.id} - {m.name} ({m.desc})</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                يتم استهلاك رصيد OpenRouter الخاص بك حسب النموذج المختار. النماذج المجانية (free) لا تستهلك رصيد.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>برومت التعليمات (System Instruction)</Form.Label>
              <Form.Control as="textarea" name="systemInstruction" value={formData.systemInstruction} onChange={handleChange} required rows={4} placeholder="أنت مساعد ذكي..." />
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" className="px-4">
                {editingId ? 'حفظ التعديلات' : 'إضافة الموظف'}
              </Button>
              {editingId && (
                <Button variant="secondary" className="px-4" onClick={() => { setEditingId(null); setFormData({ name: '', role: '', emoji: '🤖', color: 'gray', modelName: meta.models[0]?.id || '', systemInstruction: '' }); }}>
                  إلغاء التعديل
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {loading ? <Col><p className="text-muted">جاري التحميل...</p></Col> : agents.map(agent => (
          <Col xs={12} md={6} lg={4} key={agent._id}>
            <Card className="h-100 shadow-sm border-0">
              <div className={`bg-${agent.color === 'gray' ? 'secondary' : agent.color}`} style={{ height: '5px' }}></div>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="fs-1">{agent.emoji}</div>
                    <div>
                      <h5 className="fw-bold mb-0">{agent.name}</h5>
                      <span className="text-muted small">{agent.role}</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-1">
                    <Button variant="outline-primary" size="sm" onClick={() => handleEdit(agent)}>تعديل</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(agent._id)}>حذف</Button>
                  </div>
                </div>
                <div className="bg-light p-2 rounded mb-2 font-monospace small text-break border">
                  🤖 {agent.modelName}
                </div>
                <div className="bg-light p-3 rounded small text-muted border overflow-hidden" style={{ maxHeight: '100px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {agent.systemInstruction}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
