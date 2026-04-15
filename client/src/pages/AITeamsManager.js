import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';

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
    <div className={`p-3 ai-premium-container ${isNested ? '' : 'min-vh-100'}`} dir="rtl">
      {!isNested && <h1 className="h3 fw-bold mb-4 premium-title">إدارة فرق المساعدين (Teams)</h1>}
      
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <h2 className="h5 fw-bold mb-4">{editingId ? 'تعديل الفريق' : 'إنشاء فريق جديد'}</h2>
          
          <Form onSubmit={handleSubmit}>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>اسم الفريق</Form.Label>
                  <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="مثال: الفريق البرمجي" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>وصف الفريق (اختياري)</Form.Label>
                  <Form.Control type="text" name="description" value={formData.description} onChange={handleChange} placeholder="مثال: يختص بالبرمجة والتطوير" />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
               <Form.Label>قائد الفريق 👑</Form.Label>
               <Form.Select name="leader" value={formData.leader} onChange={handleChange} required className="w-50 bg-warning bg-opacity-10">
                  <option value="" disabled>-- اختر قائداً --</option>
                  {agents.map(a => (
                      <option key={a._id} value={a._id}>{a.emoji} {a.name} ({a.role})</option>
                  ))}
               </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>أعضاء الفريق المساعدين 👥 (يمكنك اختيار متعدد)</Form.Label>
              <div className="bg-light p-4 rounded border">
                <Row className="g-3">
                  {agents.map(a => {
                    if (a._id === formData.leader) return null; // القائد لا يجب أن يكون ضمن الأعضاء العاديين في نفس الوقت هنا
                    const isSelected = formData.members.includes(a._id);
                    return (
                      <Col xs={6} md={4} lg={3} key={a._id}>
                        <div 
                          className={`d-flex align-items-center gap-2 p-2 rounded border cursor-pointer ${isSelected ? 'bg-info bg-opacity-10 border-info' : 'bg-white'}`}
                          onClick={() => handleMemberToggle(a._id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Form.Check 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => handleMemberToggle(a._id)} 
                            onClick={(e) => e.stopPropagation()}
                            id={`member-${a._id}`}
                          />
                          <Form.Check.Label className="mb-0" htmlFor={`member-${a._id}`} style={{ cursor: 'pointer' }}>
                            {a.emoji} {a.name}
                          </Form.Check.Label>
                        </div>
                      </Col>
                    );
                  })}
                  {agents.length === 0 && <span className="text-muted small">لا يوجد موظفين متاحين. قم بإنشاء موظفين أولاً.</span>}
                </Row>
              </div>
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" className="px-4">
                {editingId ? 'حفظ تعديلات الفريق' : 'إنشاء الفريق'}
              </Button>
              {editingId && (
                <Button variant="secondary" className="px-4" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', leader: agents[0]?._id || '', members: [] }); }}>
                  إلغاء التعديل
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {loading ? <Col><p className="text-muted">جاري التحميل...</p></Col> : teams.map(team => (
          <Col xs={12} md={6} key={team._id}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold mb-1">{team.name}</h5>
                    {team.description && <p className="text-muted small mb-0">{team.description}</p>}
                  </div>
                  <div className="d-flex gap-1">
                    <Button variant="outline-primary" size="sm" onClick={() => handleEdit(team)}>تعديل</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(team._id)}>حذف</Button>
                  </div>
                </div>

                <div className="d-flex flex-column gap-3">
                   <div>
                      <span className="text-muted small fw-bold text-uppercase d-block mb-2">القائد 👑</span>
                      {team.leader ? (
                          <div className="d-inline-flex align-items-center gap-3 bg-warning bg-opacity-10 p-2 rounded border border-warning">
                              <div className="fs-3">{team.leader.emoji}</div>
                              <div>
                                  <div className="fw-bold small">{team.leader.name}</div>
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{team.leader.role}</div>
                              </div>
                          </div>
                      ) : (
                          <span className="text-danger small">لا يوجد قائد محدد</span>
                      )}
                   </div>

                   {team.members && team.members.length > 0 && (
                   <div>
                      <span className="text-muted small fw-bold text-uppercase d-block mb-2">المساعدين 👥 ({team.members.length})</span>
                      <div className="d-flex flex-wrap gap-2">
                          {team.members.map(member => (
                              <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1 p-2 fw-normal" key={member._id}>
                                  <span>{member.emoji}</span>
                                  <span>{member.name}</span>
                              </Badge>
                          ))}
                      </div>
                   </div>
                   )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
