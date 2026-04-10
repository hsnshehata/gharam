import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Spinner, Modal, Button } from 'react-bootstrap';
import { API_BASE } from '../utils/apiBase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function AdminAIChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!user) return;
    
    if (currentId) {
      loadConversation(currentId);
    } else {
      setMessages([{
        role: 'model',
        text: `مرحباً بك أستاذ ${user?.username} في المساعد الذكي للإدارة 🤖\nكيف يمكنني مساعدتك اليوم؟ (تقارير مالية، عمليات موظفين، حجوزات...)`
      }]);
    }
  }, [currentId, user]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin-ai/conversations`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const loadConversation = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin-ai/conversations/${id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      if (res.data.success && res.data.data) {
        setMessages(res.data.data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/api/admin-ai/conversations/${id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setConversations(prev => prev.filter(c => c._id !== id));
      if (currentId === id) setCurrentId(null);
    } catch (err) {}
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            handleSend(null, audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        alert("يرجى السماح بالوصول إلى المايكروفون للتسجيل.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleSend = async (e, voiceBlob = null) => {
    e?.preventDefault();
    const txt = input.trim();
    if (!voiceBlob && !txt) return;

    const userMessage = { role: 'user', text: voiceBlob ? "🎤 رسالة صوتية..." : txt };
    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const cleanMessages = newMsgs
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, text: m.text }));

      let res;
      if (voiceBlob) {
          const formData = new FormData();
          formData.append('audio', voiceBlob, 'voice.webm');
          formData.append('messages', JSON.stringify(cleanMessages));
          if (currentId) formData.append('conversationId', currentId);
          res = await axios.post(`${API_BASE}/api/admin-ai/chat`, formData, {
              headers: { 
                  'x-auth-token': localStorage.getItem('token'),
                  'Content-Type': 'multipart/form-data' 
              }
          });
      } else {
          const payload = { messages: cleanMessages, text: txt };
          if (currentId) payload.conversationId = currentId;
          res = await axios.post(`${API_BASE}/api/admin-ai/chat`, payload, {
              headers: { 'x-auth-token': localStorage.getItem('token') }
          });
      }

      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'model', text: res.data.reply, audioParts: res.data.audioParts }]);
        if (!currentId && res.data.conversationId) {
          setCurrentId(res.data.conversationId);
          setTimeout(fetchConversations, 2000);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ.' }]);
      }
    } catch (err) {
      const errText = err.response?.data?.message || err.message;
      setMessages(prev => [...prev, { role: 'model', text: `خطأ: ${errText}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper component to play TTS response
  const VoiceResponse = ({ parts }) => {
    const [playing, setPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const audioRef = useRef(new Audio());

    const playNext = useCallback((index) => {
        if (index < parts.length) {
            audioRef.current.src = parts[index];
            audioRef.current.play().catch(e => console.error(e));
            setCurrentIndex(index);
            setPlaying(true);
        } else {
            setPlaying(false);
            setCurrentIndex(0);
        }
    }, [parts]);

    useEffect(() => {
        const handleEnded = () => playNext(currentIndex + 1);
        const audio = audioRef.current;
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [currentIndex, playNext]);

    return (
        <button type="button" onClick={() => playing ? (audioRef.current.pause(), setPlaying(false)) : playNext(0)} style={styles.voicePlayBtn}>
            {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
            )}
            <span>{playing ? "إيقاف" : "استماع"}</span>
        </button>
    );
  };

  if (!user || (user.role !== 'admin' && user.role !== 'supervisor' && user.role !== 'hallSupervisor')) return null;

  return (
    <>
      <button style={styles.fabBtn} onClick={() => setIsOpen(!isOpen)} title="مساعد الإدارة">
        <span style={{ fontSize: 24 }}>🧠</span>
        <span style={styles.fabText}>مساعد الإدارة</span>
      </button>

      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <div style={styles.headerLeft}>
              <button style={styles.menuBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={styles.headerTitle}>مساعد الإدارة الذكي</span>
                <span style={styles.headerSub}>مرحباً بك يا {user.username}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={styles.newChatHeaderBtn} onClick={() => setShowInfo(true)} title="دليل عفركوش">❕</button>
              <button style={styles.newChatHeaderBtn} onClick={() => { setCurrentId(null); setIsSidebarOpen(false); }} title="محادثة جديدة">➕</button>
              <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
            </div>
          </div>

          <div style={{ ...styles.sidebarOverlay, ...(isSidebarOpen ? styles.sidebarOverlayOpen : {}) }} onClick={() => setIsSidebarOpen(false)} />
          <div style={{ ...styles.sidebar, ...(isSidebarOpen ? styles.sidebarOpen : {}) }}>
            <div style={styles.sidebarHeader}>
              <span style={{ fontWeight: 800, color: '#fff' }}>سجل المحادثات</span>
              <button style={styles.sidebarCloseBtn} onClick={() => setIsSidebarOpen(false)}>✖</button>
            </div>
            <button style={styles.sidebarNewBtn} onClick={() => { setCurrentId(null); setIsSidebarOpen(false); }}>
              ➕ محادثة جديدة
            </button>
            <div style={styles.convList}>
              {conversations.length === 0 && <div style={{ padding: 15, color: '#888', fontSize: 13, textAlign: 'center' }}>لا توجد محادثات سابقة</div>}
              {conversations.map(c => (
                <div key={c._id} style={{ ...styles.convItem, ...(currentId === c._id ? styles.convItemActive : {}) }} onClick={() => { setCurrentId(c._id); setIsSidebarOpen(false); }}>
                  <div style={styles.convTitle}>{c.title || 'محادثة'}</div>
                  <button style={styles.convDelBtn} onClick={(e) => handleDeleteConversation(e, c._id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.chatBody}>
            {messages.map((msg, idx) => (
              <div key={idx} style={msg.role === 'user' ? styles.msgUserWrap : styles.msgModelWrap}>
                <div style={msg.role === 'user' ? styles.msgUser : { ...styles.msgModel, overflowX: 'auto' }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div style={{ maxWidth: '100%', overflowX: 'auto', margin: '10px 0', borderRadius: '6px', border: '1px solid #e0e0e0', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }} {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => <th style={{ padding: '8px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #028090', borderLeft: '1px solid #e0e0e0', whiteSpace: 'nowrap' }} {...props} />,
                      td: ({node, ...props}) => <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', borderLeft: '1px solid #e0e0e0', whiteSpace: 'nowrap' }} {...props} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  {msg.role === 'model' && msg.audioParts && msg.audioParts.length > 0 && (
                      <VoiceResponse parts={msg.audioParts} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.msgModelWrap}>
                <div style={styles.msgModel}>
                  <Spinner animation="border" size="sm" style={{ color: '#028090', borderWidth: '2px' }} />
                  <span style={{ fontSize: 12, marginRight: 8, color: '#666' }}>جاري التحليل المعقد...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.chatFooter}>
            <button 
                onClick={isRecording ? stopRecording : startRecording} 
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                style={{ ...styles.micBtn, backgroundColor: isRecording ? '#ff4757' : '#f1f2f6', color: isRecording ? '#fff' : '#2d3436' }}
                disabled={loading}
            >
                {isRecording ? "⬛" : "🎤"}
            </button>
            <textarea
              ref={inputRef}
              style={styles.inputArea}
              placeholder={isRecording ? "جاري التسجيل..." : "اكتب استفسارك هنا..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRecording}
              rows={1}
            />
            <button style={{ ...styles.sendBtn, opacity: !input.trim() || loading || isRecording ? 0.6 : 1 }} onClick={handleSend} disabled={!input.trim() || loading || isRecording}>
              إرسال
            </button>
          </div>
        </div>
      )}

      {/* نافذة التعليمات */}
      <Modal show={showInfo} onHide={() => setShowInfo(false)} centered size="lg" dir="rtl" className="admin-ai-info-modal">
        <Modal.Header style={{ borderBottom: '2px solid #028090', backgroundColor: '#0f2736', color: '#fff', direction: 'rtl', display: 'flex', justifyContent: 'space-between' }}>
            <Modal.Title style={{ fontWeight: 'bold', margin: 0 }}>🧠 دليل المساعد الإداري الذكي</Modal.Title>
            <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', outline: 'none' }}>×</button>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.6' }}><strong>المساعد الإداري الذكي</strong> هو عقلك المدبر في النظام. متصل بنبض قواعد البيانات وواجهات المركز ليمنحك تحكم كامل وعميق في كل تفصيلة، سواء عبر التحليل السريع، استخراج التقارير، أو بناء أدوات جديدة فورياً.</p>
            
            <hr />

            <h5 style={{ color: '#028090', fontWeight: 'bold' }}>أبرز أدوات المساعد 🛠️</h5>
            <div style={{ marginBottom: '15px', fontSize: '15px', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '8px' }}><strong>1. استخراج وتحليل البيانات:</strong> يمكنه قراءة آلاف السجلات، مقارنة الإيرادات، وتلخيص العمليات اليومية (حجوزات، سلف، مصروفات) في ثوانٍ معدودة.</p>
                <p><strong>2. العفريت المبرمج (عفركوش) 🧞‍♂️:</strong> أداة سحرية مدمجة وقوية جداً. "عفركوش" يمنح المساعد قدرة خرافية على كتابة أكواد برمجية حية لبناء <strong>صفحات وأدوات ولوحات تحكم ديناميكية تفاعلية</strong> وتخزينها في النظام لتستخدمها وقتما تشاء.</p>
            </div>
            
            <hr />
            
            <h5 style={{ color: '#028090', fontWeight: 'bold' }}>الصلاحيات 🔐</h5>
            <ul style={{ fontSize: '15px', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '8px' }}><strong>المدير (Admin):</strong> صلاحيات مطلقة لسؤال المساعد عن الإيرادات التفصيلية والمصاريف السرية، واستخدام "عفركوش" لبناء وتعديل لوحات للمراقبين والمديرين (مثل: manager-hub).</li>
                <li><strong>المشرف (Supervisor):</strong> صلاحيات جلب بيانات العمليات اليومية، الحجوزات، وأداء الموظفين، ولكن لا يمكنه الوصول للمعلومات الحساسة المخصصة للإدارة العليا.</li>
            </ul>

            <hr />

            <h5 style={{ color: '#028090', fontWeight: 'bold' }}>كيف تتحدث مع مساعدك؟ (أمثلة) ✨</h5>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
                <strong style={{ color: '#e84118' }}>لتفعيل عفركوش (للمديرين):</strong><br />
                <span style={{ color: '#555', fontSize: '14px' }}>"يا عفركوش، ابنيلي صفحة manager-hub تعرض إيرادات اليوم في 3 كروت ملونة، وتحتها جدول فيه أفضل 3 موظفين لهذا الشهر."</span>
            </div>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
                <strong style={{ color: '#0097e6' }}>للتحليل والتقارير المالية (للمشرفين والمديرين):</strong><br />
                <span style={{ color: '#555', fontSize: '14px' }}>"هاتلي تقرير مفصل عن إجمالي مصاريف وسلف اليوم وقارنها بإجمالي العربون المدفوع."</span>
            </div>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <strong style={{ color: '#44bd32' }}>لإدارة العمليات:</strong><br />
                <span style={{ color: '#555', fontSize: '14px' }}>"عاوز جدول يوضح الحجوزات اللي من المقرر تنفيذها بكرا مع اسم الباكدج والمبلغ الإجمالي."</span>
            </div>

            <hr />
            <h5 style={{ color: '#028090', fontWeight: 'bold' }}>نصائح هامة 💡</h5>
            <ul style={{ fontSize: '14px', lineHeight: '1.6', color: '#444' }}>
                <li>تحدث معه كأنه بشري. كن دقيقاً واذكر التواريخ المطلوبة إذا لزم الأمر.</li>
                <li>عندما تطلب منه بناء صفحة، لا تتردد في تحديد ألوان معينة وتفاصيل دقيقة في التصميم.</li>
                <li>استخدم علامة المايك 🎤 للتسجيل الصوتي وسيقوم بتحليل كلامك وتنفيذه فوراً.</li>
                <li>لتصفية ذهن المساعد لطلب جديد كلياً بعيداً عن السياق الحالي، اضغط على <strong>زر ➕ (محادثة جديدة)</strong>.</li>
            </ul>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #e0e0e0', justifyContent: 'flex-start' }}>
            <Button variant="secondary" onClick={() => setShowInfo(false)} style={{ backgroundColor: '#028090', border: 'none', fontWeight: 'bold', padding: '8px 24px' }}>
                علم، انطلق يا مساعدنا الذكي! 🚀
            </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

const styles = {
  fabBtn: { position: 'fixed', bottom: 24, right: 24, backgroundColor: '#0f2736', border: '2px solid #028090', borderRadius: 30, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 9999, transition: 'all 0.3s ease' },
  fabText: { fontWeight: 700, fontSize: 16 },
  chatWindow: { position: 'fixed', bottom: 90, right: 24, width: 380, height: 600, maxWidth: 'calc(100vw - 48px)', maxHeight: '80vh', backgroundColor: '#ffffff', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0', direction: 'rtl' },
  chatHeader: { backgroundColor: '#0f2736', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', borderBottom: '3px solid #028090', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0 },
  headerTitle: { fontWeight: 800, fontSize: 15 },
  headerSub: { fontSize: 11, color: '#8ac4ca' },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer', lineHeight: 1 },
  newChatHeaderBtn: { background: 'transparent', border: 'none', color: '#1fb6a6', fontSize: 20, cursor: 'pointer', lineHeight: 1 },
  
  sidebarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20, opacity: 0, pointerEvents: 'none', transition: 'all 0.3s' },
  sidebarOverlayOpen: { opacity: 1, pointerEvents: 'auto' },
  sidebar: { position: 'absolute', top: 0, right: -280, width: 280, height: '100%', backgroundColor: '#1a1a2e', zIndex: 30, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column' },
  sidebarOpen: { right: 0 },
  sidebarHeader: { padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d2d44' },
  sidebarCloseBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18 },
  sidebarNewBtn: { margin: '16px', padding: '12px', background: '#028090', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  convList: { flex: 1, overflowY: 'auto' },
  convItem: { padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #2d2d44', color: '#e0e0e0', transition: '0.2s', },
  convItemActive: { backgroundColor: '#2d2d44', borderRight: '4px solid #1fb6a6' },
  convTitle: { fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 },
  convDelBtn: { background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: 16, opacity: 0.8 },

  chatBody: { flex: 1, padding: 16, overflowY: 'auto', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 14 },
  msgUserWrap: { display: 'flex', justifyContent: 'flex-start' },
  msgModelWrap: { display: 'flex', justifyContent: 'flex-end' },
  msgUser: { backgroundColor: '#028090', color: '#fff', padding: '10px 14px', borderRadius: '16px 16px 0 16px', maxWidth: '85%', lineHeight: 1.5, boxShadow: '0 2px 8px rgba(2,128,144,0.2)' },
  msgModel: { backgroundColor: '#ffffff', color: '#2d3436', padding: '10px 14px', borderRadius: '16px 16px 16px 0', maxWidth: '95%', lineHeight: 1.6, border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: 14 },
  chatFooter: { padding: 12, backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8, alignItems: 'flex-end' },
  micBtn: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s', fontSize: 18, border: '1px solid #ccc' },
  inputArea: { flex: 1, border: '1px solid #ccc', borderRadius: 14, padding: '10px 14px', resize: 'none', backgroundColor: '#f1f2f6', color: '#2d3436', outline: 'none', fontFamily: 'inherit', maxHeight: 100 },
  sendBtn: { backgroundColor: '#028090', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', height: 44 },
  voicePlayBtn: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e0e0e0', borderRadius: 20, background: '#f8f9fa', color: '#028090', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: '0.2s'}
};

export default AdminAIChat;
