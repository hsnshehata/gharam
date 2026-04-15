import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col, ProgressBar, Badge, Alert } from 'react-bootstrap';

export default function DynamicTeamAI({ isNested = false }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [completedAgentIds, setCompletedAgentIds] = useState([]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get('/api/admin/teams', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        setTeams(res.data.teams);
        if (res.data.teams.length > 0) {
            setSelectedTeam(res.data.teams[0]);
        }
      }
    } catch (err) {
      toast.error('فشل جلب الفرق');
    }
  };

  const handleTeamChange = (e) => {
    const tId = e.target.value;
    const t = teams.find(x => x._id === tId);
    setSelectedTeam(t);
  };

  const handleRun = async () => {
    if (!task.trim() || isRunning || !selectedTeam) return;

    setIsRunning(true);
    setMessages([]);
    setActiveAgentId(null);
    setCompletedAgentIds([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/teams/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ teamId: selectedTeam._id, task })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setIsRunning(false); break; }

          try {
            const event = JSON.parse(raw);
            handleEvent(event);
          } catch (err) {
            // تجاهل محتوى غير قابل للتحليل
          }
        }
      }
    } catch (error) {
      console.error(error);
      setIsRunning(false);
      toast.error('انقطع الاتصال أو حدث خطأ');
    }
  };

  const handleEvent = (event) => {
    switch (event.type) {
      case 'start':
        setMessages(prev => [...prev, { type: 'system', content: event.message }]);
        break;

      case 'agent_start':
        setActiveAgentId(event.agentId);
        setMessages(prev => [...prev, {
          type: 'agent',
          agentId: event.agentId,
          agentName: event.agentName,
          agentRole: event.agentRole,
          agentEmoji: event.agentEmoji,
          content: '',
          status: 'working'
        }]);
        break;

      case 'agent_chunk':
        setMessages(prev => prev.map((msg, i) => {
          if (i === prev.length - 1 && msg.agentId === event.agentId) {
            return { ...msg, content: msg.content + event.chunk };
          }
          return msg;
        }));
        break;

      case 'agent_done':
        setActiveAgentId(null);
        setCompletedAgentIds(prev => [...prev, event.agentId]);
        setMessages(prev => prev.map((msg, i) => {
          if (i === prev.length - 1 && msg.agentId === event.agentId) {
            return { ...msg, status: event.status, duration: event.duration };
          }
          return msg;
        }));
        break;

      case 'complete':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'system', content: '🎉 ' + event.message }]);
        break;

      case 'error':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'error', content: event.message }]);
        break;
      
      default:
        break;
    }
  };

  const currentAgents = selectedTeam ? [selectedTeam.leader, ...(selectedTeam.members || [])].filter(Boolean) : [];
  const percent = currentAgents.length > 0 ? Math.round((completedAgentIds.length / currentAgents.length) * 100) : 0;

  return (
    <div className={`${isNested ? '' : 'min-vh-100 bg-light py-4'} w-100`} dir="rtl">
      {!isNested && (
        <Container className="mb-4">
          <div className="d-flex align-items-center justify-content-between p-4 bg-white shadow-sm rounded">
            <div>
              <h1 className="h4 fw-bold d-flex align-items-center gap-2 mb-1">
                👥 محادثات الفرق (Multi-Agent Teams)
              </h1>
              <p className="text-muted small mb-0">تفاعل حي مع فرقك التي أنشأتها</p>
            </div>
            <div>
              {teams.length > 0 ? (
                  <Form.Select 
                      value={selectedTeam?._id || ''} 
                      onChange={handleTeamChange}
                      disabled={isRunning}
                  >
                      {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </Form.Select>
              ) : (
                  <span className="small text-warning fw-bold">يرجى إنشاء فريق أولاً</span>
              )}
            </div>
          </div>
        </Container>
      )}

      {isNested && (
        <div className="px-4 py-3 d-flex align-items-center justify-content-between bg-light border-bottom mb-4 rounded">
           <span className="fw-bold small">التيم النشط:</span>
           {teams.length > 0 ? (
                <Form.Select 
                    value={selectedTeam?._id || ''} 
                    onChange={handleTeamChange}
                    disabled={isRunning}
                    className="w-auto"
                >
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </Form.Select>
            ) : (
                <span className="small text-warning fw-bold">يرجى إنشاء فريق من تبويب بناء الفرق</span>
            )}
        </div>
      )}

      <Container>
        {selectedTeam && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <h3 className="h6 fw-bold mb-3 pb-2 border-bottom">تشكيل الفريق: {selectedTeam.name}</h3>
              <Row className="g-3">
                {currentAgents.map((agent) => {
                  const isActive = activeAgentId === agent._id;
                  const isDone = completedAgentIds.includes(agent._id);
                  return (
                    <Col xs={6} md={3} lg={2} key={agent._id}>
                      <Card className={`h-100 text-center transition-all ${isActive ? 'border-primary bg-primary bg-opacity-10 shadow' : ''} ${isDone ? 'opacity-50 border-success' : ''}`}>
                        <Card.Body className="p-3">
                            <div className={`fs-1 mb-2 ${isActive ? 'spinner-grow spinner-grow-sm text-primary mx-auto d-block' : ''}`}>
                                {isActive ? '' : agent.emoji}
                            </div>
                            <div className="fw-bold small text-truncate">{agent.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{agent.role}</div>
                            {agent._id === selectedTeam.leader?._id && <Badge bg="warning" text="dark" className="mt-2">القائد</Badge>}
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
              {isRunning && (
                  <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2 small">
                          <span className="text-muted">تقدم الفريق</span>
                          <span className="fw-bold">{percent}%</span>
                      </div>
                      <ProgressBar now={percent} />
                  </div>
              )}
            </Card.Body>
          </Card>
        )}

        <Card className="shadow-sm border-0 d-flex flex-column" style={{height: '60vh'}}>
          <Card.Body className="overflow-auto d-flex flex-column p-4" style={{ gap: '1rem' }}>
             {messages.length === 0 && (
                <div className="d-flex align-items-center justify-content-center h-100 flex-column gap-3 text-muted">
                  <div className="display-1">✍️</div>
                  <p>اكتب مهمتك للفريق للبدء...</p>
                </div>
             )}
             {messages.map((msg, idx) => (
                <div key={idx} className="w-100">
                    {msg.type === 'system' && <div className="text-center text-muted small my-3">{msg.content}</div>}
                    {msg.type === 'error' && <Alert variant="danger" className="py-2 mb-0">❌ {msg.content}</Alert>}
                    {msg.type === 'agent' && (
                        <div className="bg-light border rounded p-3 w-100">
                            <div className="d-flex align-items-center gap-3 mb-3 border-bottom pb-2">
                                <div className="fs-3 bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                                    {msg.agentEmoji}
                                </div>
                                <div>
                                    <div className="fw-bold text-primary mb-0">{msg.agentName}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{msg.agentRole}</div>
                                </div>
                                <div className="me-auto">
                                   {msg.status === 'working' ? <span className="small text-primary d-flex align-items-center gap-2"><span className="spinner-border spinner-border-sm" /> يعمل...</span> : <span className="small text-success fw-bold">✓ 완료 {(msg.duration/1000).toFixed(1)}s</span>}
                                </div>
                            </div>
                            <div className="text-dark small overflow-hidden" dir="auto">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
             ))}
             <div ref={messagesEndRef} />
          </Card.Body>

          <Card.Footer className="p-3 bg-white">
             <div className="d-flex gap-2">
                 <Form.Control
                    as="textarea"
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    disabled={isRunning || !selectedTeam}
                    rows={2}
                    placeholder="اكتب المهمة المطلوبة للفريق..."
                    style={{ resize: 'none' }}
                 />
                 <Button
                    variant="primary"
                    disabled={!task.trim() || isRunning || !selectedTeam}
                    onClick={handleRun}
                    className="px-4 fw-bold"
                 >
                    إرسال
                 </Button>
             </div>
          </Card.Footer>
        </Card>

      </Container>
    </div>
  );
}
