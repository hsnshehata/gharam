import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
      const res = await axios.get('/api/admin/agents/meta');
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
      const res = await axios.get('/api/admin/agents');
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
        const res = await axios.put(`/api/admin/agents/${editingId}`, formData);
        if (res.data.success) toast.success('تم التحديث بنجاح');
      } else {
        const res = await axios.post('/api/admin/agents', formData);
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
      const res = await axios.delete(`/api/admin/agents/${id}`);
      if (res.data.success) {
        toast.success('تم الحذف بنجاح');
        fetchAgents();
      }
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  return (
    <div className={`p-6 ${isNested ? '' : 'bg-gray-50 min-h-screen'}`} dir="rtl">
      {!isNested && <h1 className="text-3xl font-bold mb-6 text-gray-800">إدارة فريق المساعدين (Agents)</h1>}
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">{editingId ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2>
        
        {!editingId && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-2">💡 استيراد من نموذج جاهز لتوفير الوقت:</label>
            <select onChange={handleTemplateSelect} className="w-full p-2 border border-blue-200 rounded-lg bg-white" defaultValue="">
              <option value="" disabled>-- اختر شخصية --</option>
              {meta.templates.map(t => (
                <option key={t.templateId} value={t.templateId}>{t.emoji} {t.name} ({t.role})</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الدور الوظيفي</label>
              <input type="text" name="role" value={formData.role} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رمز تعبيري (Emoji)</label>
              <input type="text" name="emoji" value={formData.emoji} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">لون الواجهة</label>
              <select name="color" value={formData.color} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="gray">رمادي (افتراضي)</option>
                <option value="blue">أزرق</option>
                <option value="purple">بنفسجي</option>
                <option value="pink">وردي</option>
                <option value="green">أخضر</option>
                <option value="yellow">أصفر</option>
                <option value="indigo">نيلي</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نموذج الذكاء الاصطناعي (OpenRouter Model)</label>
            <select name="modelName" value={formData.modelName} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm">
              <option value="" disabled>-- اختر الموديل --</option>
              {meta.models.map(m => (
                <option key={m.id} value={m.id}>{m.id} - {m.name} ({m.desc})</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">يتم استهلاك رصيد OpenRouter الخاص بك حسب النموذج المختار. النماذج المجانية (free) لا تستهلك رصيد.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">برومت التعليمات (System Instruction)</label>
            <textarea name="systemInstruction" value={formData.systemInstruction} onChange={handleChange} required rows={4} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="أنت مساعد ذكي..."></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
              {editingId ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', role: '', emoji: '🤖', color: 'gray', modelName: meta.models[0]?.id || '', systemInstruction: '' }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors">
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <p className="text-gray-500">جاري التحميل...</p> : agents.map(agent => (
          <div key={agent._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-2 bg-${agent.color === 'gray' ? 'gray-400' : agent.color + '-500'}`}></div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{agent.emoji}</div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-col">
                  <button onClick={() => handleEdit(agent)} className="text-blue-600 hover:bg-blue-50 p-1 rounded text-sm">تعديل</button>
                  <button onClick={() => handleDelete(agent._id)} className="text-red-600 hover:bg-red-50 p-1 rounded text-sm">حذف</button>
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 break-all mb-2 border border-gray-100">
                🤖 {agent.modelName}
              </div>
              <p className="text-gray-600 text-xs line-clamp-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {agent.systemInstruction}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
