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
  const [toolStatus, setToolStatus] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Dragging states
  const [fabPos, setFabPos] = useState({ left: 24, bottom: 24, right: 'auto', top: 'auto' });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, rect: null, isMoved: false });
  const fabRef = useRef(null);

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
    } catch (err) { }
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

  // Tool name to Arabic label mapping
  const TOOL_LABELS = {
    '_thinking': '🧠 يُحلل الطلب ويفكر...',
    '_analyzing': '📊 يُراجع البيانات ويُعد الإجابة...',
    'get_employees_overview': '👥 يستعرض بيانات الموظفين...',
    'query_operations': '📋 يجمّع العمليات والحجوزات...',
    'query_financials_and_expenses': '💰 يفحص المصروفات والسلف...',
    'get_financial_report': '📈 يُعد التقرير المالي الشامل...',
    'get_packages_and_services': '📦 يجلب الباقات والخدمات...',
    'search_booking': '🔍 يبحث في سجلات الحجوزات...',
    'get_activity_log': '📝 يتتبع سجل النشاط والعمليات...',
    'get_client_details': '👤 يبحث عن بيانات العميلة...',
    'evaluate_employee_performance': '⭐ يُقيّم أداء الموظفين...',
    'detect_anomalies': '🚨 يكشف التجاوزات والأخطاء...',
    'get_past_clients': '📇 يجلب قائمة العميلات السابقات...',
    'predictive_scheduling': '🗓️ يُحلل جدول الحجوزات القادمة...',
    'search_admin_conversations': '💬 يبحث في أرشيف المحادثات...',
    'build_afrakoush_page': '💻 يُرسل الطلب للذراع التقني لبناء الواجهة...',
    'get_afrakoush_page': '📄 يقرأ كود الصفحة الحالية...'
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
    setToolStatus(null);

    try {
      const cleanMessages = newMsgs
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role, text: m.text }));

      if (voiceBlob) {
        // Voice messages use legacy axios (FormData can't use SSE easily)
        const formData = new FormData();
        formData.append('audio', voiceBlob, 'voice.webm');
        formData.append('messages', JSON.stringify(cleanMessages));
        if (currentId) formData.append('conversationId', currentId);
        const res = await axios.post(`${API_BASE}/api/admin-ai/chat`, formData, {
          headers: {
            'x-auth-token': localStorage.getItem('token'),
            'Content-Type': 'multipart/form-data'
          }
        });
        if (res.data.success) {
          setMessages(prev => [...prev, { role: 'model', text: res.data.reply, audioParts: res.data.audioParts }]);
          if (!currentId && res.data.conversationId) {
            setCurrentId(res.data.conversationId);
            setTimeout(fetchConversations, 2000);
          }
        } else {
          setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ.' }]);
        }
      } else {
        // Text messages use SSE streaming for real-time tool status
        const payload = { messages: cleanMessages, text: txt };
        if (currentId) payload.conversationId = currentId;

        const response = await fetch(`${API_BASE}/api/admin-ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token'),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(payload)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'thinking' || event.type === 'tool_start' || event.type === 'tool_done' || event.type === 'analyzing') {
                setToolStatus(TOOL_LABELS[event.tool] || `⚙️ ${event.tool}...`);
              } else if (event.type === 'done') {
                setToolStatus(null);
                setMessages(prev => [...prev, { role: 'model', text: event.reply, audioParts: event.audioParts }]);
                if (!currentId && event.conversationId) {
                  setCurrentId(event.conversationId);
                  setTimeout(fetchConversations, 2000);
                }
              } else if (event.type === 'error') {
                setToolStatus(null);
                setMessages(prev => [...prev, { role: 'model', text: `خطأ: ${event.message}` }]);
              }
            } catch (parseErr) { /* skip malformed SSE line */ }
          }
        }
      }
    } catch (err) {
      const errText = err.response?.data?.message || err.message;
      setMessages(prev => [...prev, { role: 'model', text: `خطأ: ${errText}` }]);
    } finally {
      setLoading(false);
      setToolStatus(null);
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

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      rect: fabRef.current.getBoundingClientRect(),
      isMoved: false
    };
    try { fabRef.current.setPointerCapture(e.pointerId); } catch (err) { }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.rect) return; // not dragging

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.isMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragRef.current.isMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.isMoved) {
      let newLeft = dragRef.current.rect.left + dx;
      let newTop = dragRef.current.rect.top + dy;

      // Keep within viewport bounds
      const btnSize = 65;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - btnSize));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - btnSize));

      setFabPos({ left: newLeft, top: newTop, right: 'auto', bottom: 'auto' });
    }
  };

  const snapToEdge = () => {
    if (!fabRef.current) return;
    const rect = fabRef.current.getBoundingClientRect();
    const btnSize = 65;
    const centerX = rect.left + btnSize / 2;
    const centerY = rect.top + btnSize / 2;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const distL = centerX;
    const distR = winW - centerX;
    const distB = winH - centerY; // Distance to bottom

    const minD = Math.min(distL, distR, distB);
    let finalPos = {};

    if (minD === distB) {
      finalPos = { left: Math.max(24, Math.min(rect.left, winW - btnSize - 24)), bottom: 24, right: 'auto', top: 'auto' };
    } else if (minD === distR) {
      finalPos = { right: 24, top: Math.max(24, Math.min(rect.top, winH - btnSize - 24)), left: 'auto', bottom: 'auto' };
    } else {
      finalPos = { left: 24, top: Math.max(24, Math.min(rect.top, winH - btnSize - 24)), right: 'auto', bottom: 'auto' };
    }

    setFabPos(finalPos);
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.rect) return;

    const wasMoved = dragRef.current.isMoved;
    try {
      if (fabRef.current) fabRef.current.releasePointerCapture(e.pointerId);
    } catch (err) { }

    dragRef.current.rect = null;

    if (wasMoved) {
      snapToEdge();
      setTimeout(() => setIsDragging(false), 50);
    } else {
      setIsOpen(prev => !prev);
    }
  };

  const getChatWindowStyle = () => {
    let pos = { ...styles.chatWindow };
    let isLeft = false;
    if (fabPos.left !== 'auto') {
      if (fabPos.left < window.innerWidth / 2) isLeft = true;
    }

    if (isLeft) {
      pos.left = 24;
      pos.right = 'auto';
      pos.transformOrigin = 'bottom left';
    } else {
      pos.left = 'auto';
      pos.right = 24;
      pos.transformOrigin = 'bottom right';
    }
    return pos;
  };

  if (!user || (user.role !== 'admin' && user.role !== 'supervisor' && user.role !== 'hallSupervisor')) return null;

  return (
    <>
      <style>
        {`
          @keyframes floatPulse {
            0% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 10px rgba(2, 128, 144, 0.4)); }
            50% { transform: translateY(-4px) scale(1.03); filter: drop-shadow(0 0 18px rgba(31, 182, 166, 0.8)); }
            100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 10px rgba(2, 128, 144, 0.4)); }
          }
          @keyframes fadeInStatus {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .afrakoush-magic-fab {
            position: fixed;
            z-index: 9999;
            width: 65px;
            height: 65px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #16364D, #0f2736);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 20px rgba(2, 128, 144, 0.6), inset 0 0 15px rgba(31, 182, 166, 0.3);
            border: 1.5px solid rgba(31, 182, 166, 0.5);
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
          }
          .afrakoush-magic-inner {
            animation: floatPulse 3s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .afrakoush-magic-fab:hover:not(.dragging) {
            transform: scale(1.08);
            box-shadow: 0 8px 25px rgba(31, 182, 166, 0.8), inset 0 0 20px rgba(31, 182, 166, 0.6);
            border-color: rgba(31, 182, 166, 0.9);
          }
          .afrakoush-magic-fab.dragging {
            transform: scale(1.1);
            opacity: 0.9;
            box-shadow: 0 15px 40px rgba(2, 128, 144, 0.4);
            cursor: grabbing !important;
            transition: none !important;
          }
          .afrakoush-info-modal {
            z-index: 10005 !important;
          }
          .ai-modal-backdrop {
            z-index: 10000 !important;
          }
          @keyframes iconPulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(31, 182, 166, 0.4)); }
            50% { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(31, 182, 166, 0.9)); color: #fff; }
            100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(31, 182, 166, 0.4)); }
          }
          .pulsing-info-btn {
            animation: iconPulse 2s infinite ease-in-out;
            color: #1fb6a6 !important;
          }
          .afrakoush-chat-input::placeholder {
            font-size: 13px !important;
          }
        `}
      </style>

      <div
        ref={fabRef}
        className={`afrakoush-magic-fab ${isDragging ? 'dragging' : ''}`}
        style={{
          ...fabPos,
          cursor: isDragging ? 'grabbing' : 'pointer',
          transition: isDragging ? 'none' : 'left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), bottom 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.2s',
          display: isOpen ? 'none' : 'flex'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="وكيل الذكاء الاصطتناعي"
      >
        <div className="afrakoush-magic-inner">
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <path d="M32 2 Q32 32 62 32 Q32 32 32 62 Q32 32 2 32 Q32 32 32 2 Z" fill="url(#coreGrad)" />
            <path d="M14 10 Q14 19 23 19 Q14 19 14 28 Q14 19 5 19 Q14 19 14 10 Z" fill="url(#sparkGrad)" />
            <path d="M52 46 Q52 52 58 52 Q52 52 52 58 Q52 52 46 52 Q52 52 52 46 Z" fill="url(#sparkGrad)" />
            <defs>
              <linearGradient id="coreGrad" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#1fb6a6" />
                <stop offset="1" stopColor="#0f2736" />
              </linearGradient>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#8ac4ca" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div style={getChatWindowStyle()}>
          <div style={styles.chatHeader}>
            <div style={styles.headerLeft}>
              <button style={styles.menuBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={styles.headerTitle}>مساعد الإدارة الذكي</span>
                <span style={styles.headerSub}>مرحباً بك يا {user.username}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="pulsing-info-btn" style={styles.newChatHeaderBtn} onClick={() => setShowInfo(true)} title="دليل مساعد الذكاء الاصطتناعي">❕</button>
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
                      table: ({ node, ...props }) => (
                        <div style={{ maxWidth: '100%', overflowX: 'auto', margin: '10px 0', borderRadius: '6px', border: '1px solid #e0e0e0', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }} {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => <th style={{ padding: '8px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #028090', borderLeft: '1px solid #e0e0e0', whiteSpace: 'nowrap' }} {...props} />,
                      td: ({ node, ...props }) => <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', borderLeft: '1px solid #e0e0e0', whiteSpace: 'nowrap' }} {...props} />
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
                <div style={{ ...styles.msgModel, display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                  <Spinner animation="border" size="sm" style={{ color: '#028090', borderWidth: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#555', transition: 'opacity 0.3s', animation: 'fadeInStatus 0.4s ease' }}>
                    {toolStatus || '🧠 يُحلل الطلب ويفكر...'}
                  </span>
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
              className="afrakoush-chat-input"
              ref={inputRef}
              style={styles.inputArea}
              placeholder={isRecording ? "جاري التسجيل..." : "اكتب استفسارك هنا..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRecording}
              rows={1}
            />
            <button style={{ ...styles.sendBtn, opacity: !input.trim() || loading || isRecording ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', padding: 0 }} onClick={handleSend} disabled={!input.trim() || loading || isRecording} title="إرسال">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)', marginLeft: '-2px', marginTop: '2px' }}>
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* نافذة التعليمات */}
      <Modal show={showInfo} onHide={() => setShowInfo(false)} centered size="lg" dir="rtl" className="afrakoush-info-modal" backdropClassName="ai-modal-backdrop">
        <Modal.Header style={{ borderBottom: '2px solid #028090', backgroundColor: '#0f2736', color: '#fff', direction: 'rtl', display: 'flex', justifyContent: 'space-between' }}>
          <Modal.Title style={{ fontWeight: 'bold', margin: 0 }}>🧠 المساعد الذكي "للإدارة"</Modal.Title>
          <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', outline: 'none' }}>×</button>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
          <h5 style={{ color: '#028090', fontWeight: 'bold' }}>ما هو المساعد الذكي</h5>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>المساعد الذكي ليس مجرد روبوت محادثة، بل هو <strong>مهندس ذكاء اصطناعي وأداة إدارية ذكية</strong> متصلة مباشرة بقواعد البيانات وواجهات النظام. قادر على قراءة البيانات المعقدة، تحليلها، واستخراج التقارير، بل وبناء <strong>برامج وصفحات ولوحات تحكم ديناميكية تفاعلية</strong> خصيصاً لك!</p>

          <hr />

          <h5 style={{ color: '#028090', fontWeight: 'bold' }}>الصلاحيات 🔐</h5>
          <ul style={{ fontSize: '15px', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '8px' }}><strong>المدير (Admin):</strong> يملك صلاحيات مطلقة لسؤال المساعد الذكي عن الإيرادات التفصيلية، المبيعات، ومطالبته ببناء وتعديل لوحات تحكم ديناميكية للمراقبين والمديرين (مثل: manager-hub, gharam-insights).</li>
            <li><strong>المشرف (Supervisor):</strong> يملك صلاحيات جلب بيانات العمليات اليومية، الحجوزات، وأداء الموظفين، ولكن لا يمكنه الوصول للمصاريف السرية أو إنشاء واجهات النظام العامة والإدارية المغلقة.</li>
          </ul>

          <hr />

          <h5 style={{ color: '#028090', fontWeight: 'bold' }}>أمثلة سحرية لما يمكنك طلبه ✨</h5>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
            <strong style={{ color: '#e84118' }}>للمديرين لبناء اللوحات الإدارية:</strong><br />
            <span style={{ color: '#555', fontSize: '14px' }}>"يا مساعد  ، ابنيلي صفحة manager-hub تعرض إيرادات اليوم في 3 كروت ملونة، وتحتها جدول فيه أفضل 3 موظفين لهذا الشهر."</span>
          </div>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
            <strong style={{ color: '#8e44ad' }}>للمديرين لتعديل الصفحة الرئيسية من الخارج (Landing Page):</strong><br />
            <span style={{ color: '#555', fontSize: '14px' }}>"في مساحة اللاند بيج (landing-dynamic-space)، ضيفلي بانر لعرض جديد وفيه زرار واتساب.. ومتمسحش الحاجات اللي مكتوبة هناك قبل كدا!"</span>
          </div>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
            <strong style={{ color: '#0097e6' }}>للمشرفين والمديرين للتقارير المتقدمة السريعة:</strong><br />
            <span style={{ color: '#555', fontSize: '14px' }}>
              "هاتلي تقرير مفصل عن إجمالي مصاريف وسلف اليوم وقارنها بإجمالي العربون المدفوع."<br />
              "قارن أداء الشهر ده بالشهر اللي فات من حيث عدد الحجوزات."
            </span>
          </div>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '10px' }}>
            <strong style={{ color: '#44bd32' }}>للمشرفين للإدارة وتتبع الموظفين بدقة:</strong><br />
            <span style={{ color: '#555', fontSize: '14px' }}>
              "الموظفة (سارة) عملت كام خدمة النهاردة وجمعت كام نقطة؟"<br />
              "مين نفذ خدمة وش وحواجب للعروسة (أميرة)؟"<br />
              "آخر عملية تنظيف بشرة مين عملها؟ وما هي آخر 3 عمليات بترتيب التاريخ؟"<br />
              "مين أكتر موظفة نفذت خدمة ميك أب خلال الشهر الجاري؟"
            </span>
          </div>

          <hr />
          <h5 style={{ color: '#028090', fontWeight: 'bold' }}>نصائح هامة 💡</h5>
          <ul style={{ fontSize: '14px', lineHeight: '1.6', color: '#444' }}>
            <li>كن دقيقاً في طلبك واذكر التواريخ المطلوبة إذا لزم الأمر، يمكنك التحدث معه باللهجة المصرية العادية أو الفصحى وسيفهمك.</li>
            <li>لا تتردد في طلب جداول مفصلة أو طلب تحليل عميق للبيانات، فقدراته غير محدودة ويمكنه استنتاج رؤى غير مرئية للمشرف العادي.</li>
            <li>لتسجيل رسالة صوتية اضغط على علامة المايك 🎤 وتحدث، ثم سيتلقاها المساعد ويجيبك.</li>
            <li>لتصفية ذهن المساعد الذكي لطلب جديد كلياً، اضغط على <strong>زر الإضافة ➕ لبدء محادثة جديدة</strong>.</li>
          </ul>

          <div style={{ background: '#e6f7fa', padding: '15px', borderRadius: '8px', border: '1px solid #b3e6ec', marginTop: '15px' }}>
            <strong style={{ color: '#028090' }}>📞 دعم وتطوير المساعد الذكي:</strong><br />
            <span style={{ fontSize: '14px', color: '#444' }}>
              إمكانيات الأداة يتم تطويرها بشكل يومي لتناسب احتياجات السنتر. في حال واجهتكم أي مشكلة تقنية، أو إذا كنتم بحاجة لإضافة صلاحيات أو إمكانيات وقدرات جديدة لأي قسم، يرجى التواصل مباشرة مع <strong>أستاذ حسن</strong>.
            </span>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #e0e0e0', justifyContent: 'flex-start' }}>
          <Button variant="secondary" onClick={() => setShowInfo(false)} style={{ backgroundColor: '#028090', border: 'none', fontWeight: 'bold', padding: '8px 24px' }}>
            علم، انطلق! 🚀
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
  voicePlayBtn: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e0e0e0', borderRadius: 20, background: '#f8f9fa', color: '#028090', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: '0.2s' }
};

export default AdminAIChat;
