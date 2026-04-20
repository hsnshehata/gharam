import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-hot-toast';
import { Container, Card, Form, Button, Row, Col, ProgressBar, Badge, Alert, Modal } from 'react-bootstrap';

// ===========================
// Frontend Console Error Reporter
// يُسجّل الـ errors وينقلها للسيرفر ليقرأها القائد
// Rate-limited: لا أكثر من 3 تقارير كل 30 ثانية لتجنب إغراق السيرفر
// ===========================
(function setupFrontendErrorReporter() {
  let reportCount = 0;
  const RESET_MS = 30000;
  const MAX_REPORTS = 3;
  setInterval(() => { reportCount = 0; }, RESET_MS);

  const sendError = (payload) => {
    if (reportCount >= MAX_REPORTS) return;
    reportCount++;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/admin/teams/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify(payload),
    }).catch(() => { });
  };

  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    try {
      const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      sendError({ message, source: 'console.error', url: window.location.href });
    } catch (e) { }
  };
  window.onerror = (message, source, lineno, colno, error) => {
    sendError({ message: String(message), source, stack: error?.stack, url: window.location.href });
  };
})();

export default function DynamicTeamAI({ isNested = false }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [completedAgentIds, setCompletedAgentIds] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetchTeams();
    fetchSessions();
  }, []);

  useEffect(() => {
    // Scroll only inside the chat container, NOT the outer page
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get('/api/admin/teams', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) {
        setTeams(res.data.teams);
        if (res.data.teams.length > 0) setSelectedTeam(res.data.teams[0]);
      }
    } catch (err) {
      toast.error('فشل جلب الفرق');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/admin/teams/sessions', { headers: { 'x-auth-token': localStorage.getItem('token') } });
      if (res.data.success) setSessions(res.data.sessions);
    } catch (err) { /* تجاهل */ }
  };

  const handleTeamChange = (e) => {
    const t = teams.find(x => x._id === e.target.value);
    setSelectedTeam(t);
    // إعادة الضبط عند تغيير الفريق
    setMessages([]);
    setCurrentSessionId(null);
    setCompletedAgentIds([]);
  };

  // استئناف جلسة قديمة
  const handleResumeSession = async (session) => {
    setShowSessions(false);
    const team = teams.find(t => t._id === (session.teamId?._id || session.teamId));
    if (team) setSelectedTeam(team);

    // إعادة بناء الرسائل من السجل
    const restoredMessages = session.log.map(l => ({
      type: l.type || 'agent',
      agentId: l.agentId,
      agentName: l.agentName,
      agentRole: l.agentRole,
      agentEmoji: l.agentEmoji,
      content: l.content,
      status: l.status,
      duration: l.duration
    }));
    setMessages([{ type: 'system', content: `📂 استئناف محادثة: "${session.task}"` }, ...restoredMessages]);
    setCurrentSessionId(session._id);
    setCompletedAgentIds(session.log.map(l => l.agentId));
    setTask('');
    toast.success('تم تحميل الجلسة السابقة. اكتب طلبك للمتابعة من حيث توقفنا!');
  };

  // إيقاف المهمة
  const handleStop = async () => {
    if (!currentSessionId || isStopping) return;
    setIsStopping(true);
    try {
      abortControllerRef.current?.abort();
      await axios.post(`/api/admin/teams/stop/${currentSessionId}`, {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      toast.success('تم إرسال طلب الإيقاف. سيتوقف الفريق خلال لحظات.');
    } catch (e) {
      toast.error('فشل إيقاف المهمة');
    } finally {
      setIsStopping(false);
    }
  };

  // إرسال ملاحظة حية للقائد أثناء التشغيل
  const handleSendNote = async () => {
    if (!task.trim() || !currentSessionId) return;
    const noteText = task.trim();
    setTask('');
    // عرض الملاحظة فوراً في الواجهة
    setMessages(prev => [...prev, { type: 'user', content: noteText }]);
    try {
      await axios.post(`/api/admin/teams/sessions/${currentSessionId}/note`,
        { note: noteText },
        { headers: { 'x-auth-token': localStorage.getItem('token') } }
      );
      toast.success('✅ تم إرسال توجيهك للقائد وسيراه في جولته القادمة', { duration: 3000 });
    } catch (e) {
      toast.error('فشل إرسال الملاحظة');
    }
  };

  const handleRun = async () => {
    if (!task.trim() || isRunning || !selectedTeam) return;

    const currentTask = task.trim();
    setTask(''); // مسح مربع الإدخال فوراً
    setIsRunning(true);
    setActiveAgentId(null);
    setCompletedAgentIds([]);

    // إضافة رسالة المستخدم للواجهة فوراً
    setMessages(prev => {
      if (!currentSessionId) {
        return [{ type: 'user', content: currentTask }];
      }
      return [...prev, { type: 'user', content: currentTask }];
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const body = { teamId: selectedTeam._id, task: currentTask };
      if (currentSessionId) body.sessionId = currentSessionId; // استئناف

      const response = await fetch('/api/admin/teams/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        try {
          const errData = await response.json();
          toast.error(errData.error || 'فشل تشغيل الفريق');
        } catch (e) {
          toast.error('حدثت مشكلة في السيرفر');
        }
        setIsRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // الاحتفاظ بالسطر غير المكتمل

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setIsRunning(false); break; }
          try {
            const event = JSON.parse(raw);
            handleEvent(event);
          } catch (err) { /* تجاهل */ }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error);
        toast.error('انقطع الاتصال أو حدث خطأ');
      }
    } finally {
      setIsRunning(false);
      fetchSessions();
      setTask('');
    }
  };


  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'session_id':
        setCurrentSessionId(event.sessionId);
        break;

      case 'start':
        setMessages(prev => [...prev, { type: 'system', content: '🔄 ' + event.message }]);
        break;

      case 'agent_start':
        setActiveAgentId(event.agentId);
        setMessages(prev => {
          // منع تكرار إضافة نفس الموظف إذا كان لا يزال "working"
          const alreadyWorking = prev.some(m => m.agentId === event.agentId && m.status === 'working');
          if (alreadyWorking) return prev;
          return [...prev, {
            type: 'agent',
            agentId: event.agentId,
            agentName: event.agentName,
            agentRole: event.agentRole,
            agentEmoji: event.agentEmoji,
            content: '',
            status: 'working'
          }];
        });
        break;

      case 'agent_chunk':
        setMessages(prev => prev.map(msg => {
          if (msg.agentId === event.agentId && msg.status === 'working') {
            return { ...msg, content: msg.content + event.chunk };
          }
          return msg;
        }));
        break;

      case 'agent_done':
        setActiveAgentId(null);
        setCompletedAgentIds(prev => prev.includes(event.agentId) ? prev : [...prev, event.agentId]);
        setMessages(prev => prev.map(msg => {
          if (msg.agentId === event.agentId && msg.status === 'working') {
            return { ...msg, status: event.status, duration: event.duration };
          }
          return msg;
        }));
        break;

      case 'complete':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'system', content: '🎉 ' + event.message }]);
        if (event.sessionId) setCurrentSessionId(event.sessionId);
        break;

      case 'error':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'error', content: event.message }]);
        break;

      default:
        break;
    }
  }, []);

  const currentAgents = selectedTeam ? [selectedTeam.leader, ...(selectedTeam.members || [])].filter(Boolean) : [];
  const percent = currentAgents.length > 0 ? Math.round((completedAgentIds.length / currentAgents.length) * 100) : 0;

  const statusBadge = (status) => {
    const map = { completed: ['success', '✓ مكتمل'], running: ['primary', '⚡ جارٍ'], failed: ['danger', '✗ فشل'], stopped: ['warning', '⛔ موقوف'] };
    const [bg, label] = map[status] || ['secondary', status];
    return <Badge bg={bg} className="ms-2">{label}</Badge>;
  };

  // Function to delete session
  const handleDeleteSession = async (id) => {
    if (!window.confirm('هل أنت متأكد من مسح هذه المحادثة بالكامل؟')) return;
    try {
      await axios.delete(`/api/admin/teams/sessions/${id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setSessions(prev => prev.filter(s => s._id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast.success('تم مسح المحادثة');
    } catch (e) {
      toast.error('فشل مسح المحادثة');
    }
  };

  return (
    <div className={`ai-premium-container ${isNested ? '' : 'min-vh-100 py-4'} w-100`} dir="rtl">
      {/* رأس الصفحة (غير مدمج) */}
      {!isNested && (
        <Container className="mb-4">
          <div className="d-flex align-items-center justify-content-between p-4 bg-white shadow-sm rounded">
            <div>
              <h1 className="h4 fw-bold d-flex align-items-center gap-2 mb-1 premium-title">
                👥 محادثات الفرق (Multi-Agent Teams)
              </h1>
              <p className="text-muted small mb-0">القائد يدير الفريق بشكل تفاعلي وذكي</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button variant="outline-secondary" size="sm" onClick={() => setShowSessions(true)}>
                📂 السجلات
              </Button>
              {teams.length > 0 ? (
                <Form.Select value={selectedTeam?._id || ''} onChange={handleTeamChange} disabled={isRunning}>
                  {(teams ?? []).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </Form.Select>
              ) : (
                <span className="small text-warning fw-bold">يرجى إنشاء فريق أولاً</span>
              )}
            </div>
          </div>
        </Container>
      )}

      {/* رأس مدمج */}
      {isNested && (
        <div className="px-4 py-3 d-flex align-items-center justify-content-between bg-light border-bottom mb-4 rounded">
          <span className="fw-bold small">التيم النشط:</span>
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => setShowSessions(true)}>📂</Button>
            {teams.length > 0 ? (
              <Form.Select value={selectedTeam?._id || ''} onChange={handleTeamChange} disabled={isRunning} className="w-auto">
                {(teams ?? []).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Form.Select>
            ) : (
              <span className="small text-warning fw-bold">يرجى إنشاء فريق من تبويب بناء الفرق</span>
            )}
          </div>
        </div>
      )}

      <Container>
        {/* بطاقة تشكيل الفريق */}
        {selectedTeam && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <h3 className="h6 fw-bold mb-3 pb-2 border-bottom">
                تشكيل الفريق: {selectedTeam.name}
                {currentSessionId && (
                  <Badge bg="info" className="ms-2" style={{ fontSize: '0.65rem' }}>جلسة نشطة</Badge>
                )}
              </h3>
              <Row className="g-3">
                {(currentAgents ?? []).map((agent) => {
                  const isActive = activeAgentId === agent._id;
                  const isDone = completedAgentIds.includes(agent._id);
                  return (
                    <Col xs={6} md={3} lg={2} key={agent._id}>
                      <Card className={`h-100 text-center transition-all ${isActive ? 'ai-agent-card-active bg-primary bg-opacity-10 shadow' : ''} ${isDone ? 'opacity-60 border-success' : ''}`}>
                        <Card.Body className="p-3">
                          <div className={`fs-1 mb-2 ${isActive ? 'spinner-grow spinner-grow-sm text-primary mx-auto d-block' : ''}`}>
                            {isActive ? '' : agent.emoji}
                          </div>
                          <div className="fw-bold small text-truncate">{agent.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{agent.role}</div>
                          {agent._id === selectedTeam.leader?._id && <Badge bg="warning" text="dark" className="mt-2">القائد</Badge>}
                          {isDone && <Badge bg="success" className="mt-1 d-block">✓</Badge>}
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
                  <ProgressBar animated now={percent} />
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* CSS للـ Markdown داخل المحادثة */}
        <style>{`
          .team-chat-md {
            direction: rtl;
            text-align: right;
            unicode-bidi: plaintext;
            line-height: 1.8;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .team-chat-md p { margin: 0 0 0.5em 0; }
          .team-chat-md p:last-child { margin-bottom: 0; }
          .team-chat-md h1, .team-chat-md h2, .team-chat-md h3,
          .team-chat-md h4, .team-chat-md h5, .team-chat-md h6 {
            margin: 0.8em 0 0.4em 0;
            font-weight: 700;
            color: #1a1a2e;
          }
          .team-chat-md h1 { font-size: 1.3em; }
          .team-chat-md h2 { font-size: 1.15em; }
          .team-chat-md h3 { font-size: 1.05em; }
          .team-chat-md ul, .team-chat-md ol {
            margin: 0.4em 0;
            padding-right: 1.5em;
            padding-left: 0;
          }
          .team-chat-md li { margin-bottom: 0.2em; }
          .team-chat-md strong { color: #0f2736; }
          .team-chat-md em { color: #555; }
          .team-chat-md blockquote {
            border-right: 4px solid #028090;
            border-left: none;
            margin: 0.6em 0;
            padding: 0.5em 1em 0.5em 0.5em;
            background: rgba(2, 128, 144, 0.05);
            border-radius: 0 8px 8px 0;
            color: #444;
          }
          .team-chat-md a {
            color: #028090;
            text-decoration: underline;
          }
          .team-chat-md hr {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 0.8em 0;
          }
          /* Code blocks */
          .team-chat-md pre {
            direction: ltr;
            text-align: left;
            background: #1e1e2e;
            color: #cdd6f4;
            border-radius: 10px;
            padding: 14px 16px;
            margin: 0.6em 0;
            overflow-x: auto;
            font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
            font-size: 0.82em;
            line-height: 1.6;
            border: 1px solid #313244;
            position: relative;
          }
          .team-chat-md pre code {
            background: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            color: inherit;
            font-size: inherit;
          }
          /* Inline code */
          .team-chat-md code {
            direction: ltr;
            unicode-bidi: embed;
            background: #f0f0f5;
            color: #c7254e;
            padding: 2px 6px;
            border-radius: 5px;
            font-family: 'Fira Code', 'Cascadia Code', monospace;
            font-size: 0.88em;
            white-space: pre-wrap;
          }
          /* Tables */
          .team-chat-md table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.6em 0;
            font-size: 0.88em;
            border-radius: 8px;
            overflow: hidden;
          }
          .team-chat-md th {
            background: #f1f5f9;
            border-bottom: 2px solid #028090;
            padding: 8px 12px;
            font-weight: 700;
            text-align: right;
            white-space: nowrap;
          }
          .team-chat-md td {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          .team-chat-md tr:hover td { background: #f8fafc; }
          /* Images */
          .team-chat-md img {
            max-width: 100%;
            border-radius: 10px;
            margin: 0.5em 0;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
          }
        `}</style>

        {/* منطقة المحادثة */}
        <Card className="shadow-sm border-0 d-flex flex-column" style={{ height: '60vh' }}>
          <Card.Body ref={chatBodyRef} className="overflow-auto d-flex flex-column p-4" style={{ gap: '1rem' }}>
            {messages.length === 0 && (
              <div className="d-flex align-items-center justify-content-center h-100 flex-column gap-3 text-muted">
                <div className="display-1">✍️</div>
                <p>اكتب مهمتك للفريق للبدء... القائد سيوزع ويدير كل شيء!</p>
              </div>
            )}
            {(messages ?? []).map((msg, idx) => (
              <div key={idx} className="w-100">
                {msg.type === 'system' && <div className="text-center text-muted small my-3 border-bottom pb-2">{msg.content}</div>}
                {msg.type === 'error' && <Alert variant="danger" className="ai-message-enter py-2 mb-0">❌ {msg.content}</Alert>}
                {msg.type === 'agent' && (
                  <div className={`ai-message-enter border rounded p-3 w-100 ${msg.status === 'working' ? 'border-primary ai-glass-bubble' : msg.status === 'error' ? 'border-danger bg-danger bg-opacity-5 ai-glass-bubble' : 'bg-light'}`}>
                    <div className="d-flex align-items-center gap-3 mb-3 border-bottom pb-2">
                      <div className="fs-3 bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                        {msg.agentEmoji}
                      </div>
                      <div>
                        <div className="fw-bold text-primary mb-0">{msg.agentName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{msg.agentRole}</div>
                      </div>
                      <div className="me-auto">
                        {msg.status === 'working'
                          ? <span className="small text-primary d-flex align-items-center gap-2">
                              <div className="ai-typing-indicator"><span/><span/><span/></div> يعمل...
                            </span>
                          : msg.status === 'error'
                            ? <span className="small text-danger fw-bold">✗ خطأ {msg.duration ? `(${(msg.duration / 1000).toFixed(1)}s)` : ''}</span>
                            : <span className="small text-success fw-bold">✓ اكتمل {msg.duration ? `${(msg.duration / 1000).toFixed(1)}s` : ''}</span>
                        }
                      </div>
                    </div>
                    <div className="team-chat-md small" dir="rtl">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ children }) => <pre dir="ltr">{children}</pre>,
                          code: ({ inline, className, children, ...props }) => {
                            if (inline) return <code {...props}>{children}</code>;
                            const lang = (className || '').replace('language-', '');
                            return (
                              <>
                                {lang && <div style={{ background: '#313244', color: '#a6adc8', padding: '4px 12px', borderRadius: '10px 10px 0 0', fontSize: '0.75em', fontFamily: 'monospace', marginBottom: '-1px' }}>{lang}</div>}
                                <code className={className} {...props}>{children}</code>
                              </>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div style={{ maxWidth: '100%', overflowX: 'auto', margin: '8px 0', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <table {...props} />
                            </div>
                          ),
                          img: ({ node, ...props }) => <img loading="lazy" {...props} />
                        }}
                      >
                        {msg.content || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {msg.type === 'user' && (
                  <div className="ai-message-enter d-flex justify-content-end w-100 mb-2">
                     <div className="ai-user-bubble rounded p-3" style={{ maxWidth: '85%', borderBottomLeftRadius: '0px' }}>
                      <div className="fw-bold small mb-1 opacity-75">أنت (المدير)</div>
                      <div className="small" style={{ whiteSpace: 'pre-wrap' }} dir="auto">{msg.content}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </Card.Body>

          <Card.Footer className="ai-floating-input p-3 bg-white">
            {currentSessionId && !isRunning && (
              <div className="mb-2 small text-info d-flex align-items-center gap-2">
                <span>🔗 الجلسة النشطة محفوظة</span>
                <Button variant="link" size="sm" className="p-0 text-secondary" onClick={() => { setCurrentSessionId(null); setMessages([]); setCompletedAgentIds([]); }}>
                  بدء جديد
                </Button>
              </div>
            )}
            {isRunning && currentSessionId && (
              <div className="mb-2 small d-flex align-items-center gap-2" style={{ color: '#f59e0b' }}>
                <span className="spinner-border spinner-border-sm" style={{ width: '0.7rem', height: '0.7rem' }} />
                <span>⚡ الفريق يعمل — يمكنك إرسال توجيهات للقائد وسيراها في جولته القادمة</span>
              </div>
            )}
            <div className="d-flex gap-2">
              <Form.Control
                as="textarea"
                value={task}
                onChange={e => setTask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isRunning) handleSendNote();
                    else handleRun();
                  }
                }}
                disabled={!selectedTeam}
                rows={2}
                placeholder={
                  isRunning
                    ? '💬 أرسل توجيهاً للقائد أثناء العمل... (Enter)'
                    : currentSessionId
                      ? 'اكتب طلبك للمتابعة من حيث توقفنا... (Enter)'
                      : 'اكتب المهمة المطلوبة للفريق... (Enter للإرسال)'
                }
                style={{ resize: 'none' }}
                dir="rtl"
              />
              <div className="d-flex flex-column gap-1">
                {isRunning ? (
                  <>
                    <Button
                      variant="warning"
                      disabled={!task.trim() || !currentSessionId}
                      onClick={handleSendNote}
                      className="px-3 fw-bold flex-grow-1"
                      title="إرسال توجيه للقائد أثناء التشغيل"
                    >
                      📝 وجّه
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleStop}
                      disabled={isStopping}
                      className="px-3 fw-bold"
                    >
                      {isStopping ? <span className="spinner-border spinner-border-sm" /> : '⛔'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!task.trim() || !selectedTeam}
                    onClick={handleRun}
                    className="px-4 fw-bold h-100"
                  >
                    إرسال
                  </Button>
                )}
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Container>
      {/* Modal: سجل الجلسات */}
      <Modal show={showSessions} onHide={() => setShowSessions(false)} size="lg" dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>💬 سجل المحادثات السابقة</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sessions.length === 0 ? (
            <p className="text-center text-muted py-4">لا توجد محادثات محفوظة بعد.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {(sessions ?? []).map(s => (
                <Card key={s._id} className="border-0 shadow-sm">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold mb-1">
                          {s.teamId?.name || 'فريق محذوف'}
                          {statusBadge(s.status)}
                        </div>
                        <div className="text-muted small mb-2">{s.task}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {new Date(s.createdAt).toLocaleString('ar-EG')} — {s.log?.length || 0} رسالة
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleResumeSession(s)}
                          disabled={isRunning}
                        >
                          استئناف
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteSession(s._id)}
                          disabled={isRunning}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
