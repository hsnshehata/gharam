import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Card, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';

// ── Provider metadata ──────────────────────────────────────────
const PROVIDER_META = {
  google: { icon: '🔷', color: '#4285f4', label: 'Google Gemini', keyVar: 'GEMINI_API_KEY' },
  openai: { icon: '🟢', color: '#10a37f', label: 'OpenAI', keyVar: 'OPENAI_API_KEY' },
  openrouter: { icon: '🌌', color: '#8a2be2', label: 'OpenRouter', keyVar: 'OPENROUTER_API_KEY' },
};

// fallback فقط عند غياب حقل provider من السيرفر
// النماذج الثابتة (gemini-*, gpt-*, o4-*) لا تحتوي على "/" في الاسم → نميّز بها
// أي نموذج فيه "/" → openrouter دائماً (لأن صيغة OpenRouter هي provider/model)
const guessProvider = (modelId = '') => {
  const id = modelId.toLowerCase();
  if (id.includes('/')) return 'openrouter'; // openrouter format: "google/gemini-..." or "openai/gpt-..."
  if (id.startsWith('gemini')) return 'google';
  if (id.startsWith('gpt-') || id.startsWith('o4-') || id.startsWith('o3-') || id.startsWith('o1-')) return 'openai';
  return 'openrouter';
};

// ── ModelPicker Component ──────────────────────────────────────
function ModelPicker({ models, value, onChange, label, excludeId, placeholder }) {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [showPaid, setShowPaid] = useState(false);
  const [open, setOpen] = useState(false);

  // استخدم provider من السيرفر إن وُجد، وإلا استنتجه (فقط للنماذج الثابتة القديمة)
  const enriched = (models ?? []).map(m => ({
    ...m,
    provider: m.provider || guessProvider(m.id),
    isFree: m.isFree !== undefined ? m.isFree : !(m.id || '').includes('openai') && !(m.id || '').startsWith('gpt') && !(m.id || '').startsWith('o4') && !(m.id || '').startsWith('o3'),
  }));

  const filtered = enriched.filter(m => {
    if (m.id === excludeId) return false;
    if (m.provider === 'openrouter' && !m.isFree && !showPaid) return false;
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q);
    }
    return true;
  });

  const selected = enriched.find(m => m.id === value);
  const provMeta = selected ? PROVIDER_META[selected.provider] : null;

  return (
    <Form.Group className="mb-3">
      <Form.Label className="fw-semibold">{label}</Form.Label>

      {/* Selected value display */}
      <div
        className="border rounded p-2 mb-2 d-flex align-items-center gap-2"
        style={{ background: '#f8f9fa', cursor: 'pointer', minHeight: 44 }}
        onClick={() => setOpen(o => !o)}
      >
        {selected ? (
          <>
            <span style={{ fontSize: 18 }}>{provMeta?.icon}</span>
            <span className="fw-bold small">{selected.name}</span>
            <Badge bg={selected.isFree ? 'success' : 'danger'} className="ms-1" style={{ fontSize: '0.65rem' }}>
              {selected.isFree ? 'مجاني' : 'مدفوع'}
            </Badge>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>({provMeta?.keyVar})</span>
            <span className="ms-auto text-muted small">{open ? '▲' : '▼'}</span>
          </>
        ) : (
          <span className="text-muted small">{placeholder || 'اختر نموذجاً...'}</span>
        )}
      </div>

      {open && (
        <div className="border rounded shadow-sm" style={{ background: '#fff', zIndex: 100 }}>
          {/* Filters */}
          <div className="d-flex gap-2 p-2 flex-wrap" style={{ background: '#f5f5f5', borderBottom: '1px solid #eee' }}>
            <input
              type="text"
              placeholder="🔍 ابحث..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control form-control-sm"
              style={{ maxWidth: 180 }}
              autoFocus
            />
            <select
              value={providerFilter}
              onChange={e => setProviderFilter(e.target.value)}
              className="form-select form-select-sm"
              style={{ maxWidth: 160 }}
            >
              <option value="all">🌐 كل المزودين</option>
              <option value="google">🔷 Google Gemini</option>
              <option value="openai">🟢 OpenAI</option>
              <option value="openrouter">🌌 OpenRouter</option>
            </select>
            <label className="d-flex align-items-center gap-1 small text-muted ms-auto" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} />
              💸 مدفوع
            </label>
          </div>

          {/* Model List */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {value && (
              <div
                className="px-3 py-2 border-bottom small text-muted"
                style={{ cursor: 'pointer', background: '#fff9e6' }}
                onClick={() => { onChange(''); setOpen(false); }}
              >
                ✕ إلغاء الاختيار
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-muted small text-center">لا توجد نماذج مطابقة</div>
            )}
            {filtered.map(m => {
              const meta = PROVIDER_META[m.provider];
              const isSelected = m.id === value;
              return (
                <div
                  key={m.id}
                  className="px-3 py-2 d-flex align-items-start gap-2"
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    background: isSelected ? `${meta.color}12` : 'transparent',
                    borderRight: isSelected ? `3px solid ${meta.color}` : '3px solid transparent',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1.4 }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      <span className="fw-bold" style={{ fontSize: '0.85rem' }}>{m.name || m.id}</span>
                      <Badge
                        style={{
                          background: m.isFree ? '#e8f5e9' : '#ffebee',
                          color: m.isFree ? '#2e7d32' : '#c62828',
                          fontWeight: 700,
                          fontSize: '0.6rem',
                          border: `1px solid ${m.isFree ? '#a5d6a7' : '#ef9a9a'}`
                        }}
                      >
                        {m.isFree ? '✓ مجاني' : '$ مدفوع'}
                      </Badge>
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: `${meta.color}15`,
                          color: meta.color,
                          border: `1px solid ${meta.color}40`,
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontWeight: 600
                        }}
                      >
                        {meta.icon} {meta.label} — 🔑 {meta.keyVar}
                      </span>
                      <span className="text-muted font-monospace" style={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {m.id}
                      </span>
                    </div>
                  </div>
                  {isSelected && <span style={{ color: meta.color, fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Form.Group>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function AIAgentsManager({ isNested = false }) {
  const [agents, setAgents] = useState([]);
  const [meta, setMeta] = useState({ models: [], templates: [] });
  const [formData, setFormData] = useState({
    name: '', role: '', emoji: '🤖', color: 'gray', modelName: '', fallbackModel: '', systemInstruction: ''
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
        // تأكد من وجود المصفوفات قبل الحفظ لتجنب .map() على undefined
        setMeta({
          models: res.data.models ?? [],
          templates: res.data.templates ?? [],
        });
        if ((res.data.models ?? []).length > 0 && !formData.modelName) {
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
        fallbackModel: '',
        systemInstruction: template.systemInstruction
      });
      toast.success('تم استيراد بيانات النموذج');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', role: '', emoji: '🤖', color: 'gray', modelName: meta.models[0]?.id || '', fallbackModel: '', systemInstruction: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (editingId) {
        const res = await axios.put(`/api/admin/agents/${editingId}`, payload, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم التحديث بنجاح');
      } else {
        const res = await axios.post('/api/admin/agents', payload, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم إضافة الموظف بنجاح');
      }
      resetForm();
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
      fallbackModel: agent.fallbackModel || '',
      systemInstruction: agent.systemInstruction
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      const res = await axios.delete(`/api/admin/agents/${id}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) { toast.success('تم الحذف بنجاح'); fetchAgents(); }
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  // ── Render provider badge for agent card ──
  // يبحث في قائمة النماذج من السيرفر أولاً للحصول على provider الصحيح
  const AgentModelBadge = ({ modelId }) => {
    if (!modelId) return null;
    // ابحث عن النموذج في القائمة القادمة من السيرفر (بيانات موثوقة)
    const modelData = (meta.models ?? []).find(m => m.id === modelId);
    const provider = modelData?.provider || guessProvider(modelId);
    const isFree = modelData ? modelData.isFree : !(String(modelId).toUpperCase()).includes('GPT') && !String(modelId).startsWith('o4') && !String(modelId).startsWith('o3');
    const meta2 = PROVIDER_META[provider] || PROVIDER_META.openrouter;
    return (
      <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
        <span style={{
          fontSize: '0.7rem', background: `${meta2.color}15`, color: meta2.color,
          border: `1px solid ${meta2.color}40`, borderRadius: 4, padding: '2px 6px', fontWeight: 700
        }}>
          {meta2.icon} {meta2.label}
        </span>
        <span style={{
          fontSize: '0.65rem',
          background: isFree ? '#e8f5e9' : '#ffebee',
          color: isFree ? '#2e7d32' : '#c62828',
          border: `1px solid ${isFree ? '#a5d6a7' : '#ef9a9a'}`,
          borderRadius: 4, padding: '2px 6px', fontWeight: 700
        }}>
          {isFree ? '✓ مجاني' : '$ مدفوع'}
        </span>
        <span className="text-muted" style={{ fontSize: '0.6rem' }}>🔑 {meta2.keyVar}</span>
      </div>
    );
  };

  return (
    <div className={`p-3 ai-premium-container ${isNested ? '' : 'min-vh-100'}`} dir="rtl">
      {!isNested && <h1 className="h3 fw-bold mb-4 premium-title">إدارة فريق المساعدين (Agents)</h1>}

      {/* Key Legend */}
      <Alert variant="light" className="border mb-4 p-3">
        <div className="fw-bold mb-2">🔑 دليل المفاتيح — أي مفتاح يستخدمه كل نموذج:</div>
        <div className="d-flex gap-3 flex-wrap">
          {Object.values(PROVIDER_META).map(p => (
            <span key={p.keyVar} style={{
              background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}40`,
              borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: '0.8rem'
            }}>
              {p.icon} {p.label} → <code style={{ color: p.color }}>{p.keyVar}</code>
            </span>
          ))}
        </div>
      </Alert>

      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <h2 className="h5 fw-bold mb-4">{editingId ? '✏️ تعديل بيانات الموظف' : '➕ إضافة موظف جديد'}</h2>

          {!editingId && (
            <Alert variant="info" className="mb-4">
              <div className="fw-bold mb-2">💡 استيراد من نموذج جاهز:</div>
              <Form.Select onChange={handleTemplateSelect} defaultValue="">
                <option value="" disabled>-- اختر شخصية --</option>
                {(meta.templates ?? []).map(t => (
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

            {/* Primary Model Picker */}
            <ModelPicker
              models={meta.models}
              value={formData.modelName}
              onChange={v => setFormData(p => ({ ...p, modelName: v }))}
              label="🤖 نموذج الذكاء الاصطناعي الأساسي"
              placeholder="اختر النموذج الأساسي..."
            />

            {/* Fallback Model Picker */}
            <ModelPicker
              models={meta.models}
              value={formData.fallbackModel}
              onChange={v => setFormData(p => ({ ...p, fallbackModel: v }))}
              label="🔄 نموذج احتياطي (Fallback) — يُستخدم تلقائياً عند فشل الأساسي"
              excludeId={formData.modelName}
              placeholder="اختر نموذجاً احتياطياً (اختياري)..."
            />

            <Form.Group className="mb-4">
              <Form.Label>برومت التعليمات (System Instruction)</Form.Label>
              <Form.Control as="textarea" name="systemInstruction" value={formData.systemInstruction} onChange={handleChange} required rows={4} placeholder="أنت مساعد ذكي..." />
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" className="px-4">
                {editingId ? '💾 حفظ التعديلات' : '➕ إضافة الموظف'}
              </Button>
              {editingId && (
                <Button variant="secondary" className="px-4" onClick={resetForm}>إلغاء التعديل</Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Agents Grid */}
      <Row className="g-4">
        {loading ? <Col><p className="text-muted">جاري التحميل...</p></Col> : (agents ?? []).map(agent => {
          const provider = guessProvider(agent.modelName);
          const provMeta = PROVIDER_META[provider];
          return (
            <Col xs={12} md={6} lg={4} key={agent._id}>
              <Card className="h-100 shadow-sm border-0">
                <div style={{ height: 5, background: provMeta.color }} />
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

                  {/* Primary model */}
                  <div className="bg-light p-2 rounded mb-2 border">
                    <div className="font-monospace small text-break">🤖 {agent.modelName}</div>
                    <AgentModelBadge modelId={agent.modelName} />
                  </div>

                  {/* Fallback model */}
                  {agent.fallbackModel && (
                    <div className="p-2 rounded mb-2 border" style={{ background: '#f5f0ff' }}>
                      <div className="font-monospace small text-break text-muted">🔄 {agent.fallbackModel}</div>
                      <AgentModelBadge modelId={agent.fallbackModel} />
                    </div>
                  )}

                  <div className="bg-light p-3 rounded small text-muted border overflow-hidden" style={{ maxHeight: '80px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {agent.systemInstruction}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
