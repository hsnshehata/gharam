import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function AITeamsManager({ isNested = false }) {
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [formData, setFormData] = useState({
    name: '', description: '', leader: '', members: []
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchTeams();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/admin/agents', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        setAgents(res.data.agents);
        if(res.data.agents.length > 0 && !formData.leader) {
             setFormData(prev => ({...prev, leader: res.data.agents[0]._id}));
        }
      }
    } catch (err) {
      toast.error('فشل جلب الموظفين');
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/teams', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) setTeams(res.data.teams);
    } catch (err) {
      toast.error('فشل جلب الفرق');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMemberToggle = (id) => {
    setFormData(prev => {
      const members = prev.members.includes(id) 
        ? prev.members.filter(m => m !== id)
        : [...prev.members, id];
      return { ...prev, members };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leader) {
        return toast.error('الرجاء اختيار قائد للفريق');
    }

    try {
      if (editingId) {
        const res = await axios.put(`/api/admin/teams/${editingId}`, formData, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم التحديث بنجاح');
      } else {
        const res = await axios.post('/api/admin/teams', formData, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        if (res.data.success) toast.success('تم إنشاء الفريق بنجاح');
      }
      setFormData({ name: '', description: '', leader: agents[0]?._id || '', members: [] });
      setEditingId(null);
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleEdit = (team) => {
    setEditingId(team._id);
    setFormData({
      name: team.name,
      description: team.description,
      leader: team.leader?._id || '',
      members: team.members?.map(m => m._id) || []
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفريق؟')) return;
    try {
      const res = await axios.delete(`/api/admin/teams/${id}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        toast.success('تم الحذف بنجاح');
        fetchTeams();
      }
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  return (
    <div className={`p-6 ${isNested ? '' : 'bg-gray-50 min-h-screen'}`} dir="rtl">
      {!isNested && <h1 className="text-3xl font-bold mb-6 text-gray-800">إدارة فرق المساعدين (Teams)</h1>}
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">{editingId ? 'تعديل الفريق' : 'إنشاء فريق جديد'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفريق</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="مثال: الفريق البرمجي" className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف الفريق (اختياري)</label>
              <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="مثال: يختص بالبرمجة والتطوير" className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">قائد الفريق 👑</label>
             <select name="leader" value={formData.leader} onChange={handleChange} required className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg bg-yellow-50">
                <option value="" disabled>-- اختر قائداً --</option>
                {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.emoji} {a.name} ({a.role})</option>
                ))}
             </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">أعضاء الفريق المساعدين 👥 (يمكنك اختيار متعدد)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              {agents.map(a => {
                if (a._id === formData.leader) return null; // القائد لا يجب أن يكون ضمن الأعضاء العاديين في نفس الوقت هنا
                const isSelected = formData.members.includes(a._id);
                return (
                  <label key={a._id} className={`flex items-center gap-2 p-2 px-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => handleMemberToggle(a._id)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    <span className="text-sm font-medium">{a.emoji} {a.name}</span>
                  </label>
                );
              })}
              {agents.length === 0 && <span className="text-gray-500 text-sm">لا يوجد موظفين متاحين. قم بإنشاء موظفين أولاً.</span>}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
              {editingId ? 'حفظ تعديلات الفريق' : 'إنشاء الفريق'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', leader: agents[0]?._id || '', members: [] }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors">
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? <p className="text-gray-500">جاري التحميل...</p> : teams.map(team => (
          <div key={team._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4 border-b pb-4">
                <div>
                  <h3 className="font-bold text-xl text-gray-800">{team.name}</h3>
                  {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(team)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-sm transition-colors">تعديل</button>
                  <button onClick={() => handleDelete(team._id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-sm transition-colors">حذف</button>
                </div>
              </div>

              <div className="space-y-4">
                 <div>
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-2">القائد 👑</span>
                    {team.leader ? (
                        <div className="flex items-center gap-3 bg-yellow-50/50 p-2 rounded-lg border border-yellow-100 w-max">
                            <div className="text-2xl">{team.leader.emoji}</div>
                            <div>
                                <div className="font-bold text-sm">{team.leader.name}</div>
                                <div className="text-xs text-gray-500">{team.leader.role}</div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-red-400 text-xs">لا يوجد قائد محدد</span>
                    )}
                 </div>

                 {team.members && team.members.length > 0 && (
                 <div>
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-2">المساعدين 👥 ({team.members.length})</span>
                    <div className="flex flex-wrap gap-2">
                        {team.members.map(member => (
                            <div key={member._id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 text-sm">
                                <span>{member.emoji}</span>
                                <span className="font-medium text-gray-700">{member.name}</span>
                            </div>
                        ))}
                    </div>
                 </div>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
