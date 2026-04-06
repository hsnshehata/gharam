import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
import { API_BASE } from '../utils/apiBase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function AdminAIChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initial Fetch of Conversations
  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  // Load a specific conversation if currentId changes
  useEffect(() => {
    if (!user) return;
    
    if (currentId) {
      loadConversation(currentId);
    } else {
      // New Chat
      setMessages([{
        role: 'model',
        text: `مرحباً بك أستاذ ${user?.username} في المساعد الذكي للإدارة 🤖\nكيف يمكنني مساعدتك اليوم؟ (تقارير مالية، عمليات موظفين، حجوزات...)`
      }]);
    }
  }, [currentId, user]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin-ai/conversations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConversations(prev => prev.filter(c => c._id !== id));
      if (currentId === id) {
        setCurrentId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const txt = input.trim();
    if (!txt) return;

    const newMsgs = [...messages, { role: 'user', text: txt }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const payload = { messages: newMsgs, text: txt };
      if (currentId) payload.conversationId = currentId;

      const res = await axios.post(`${API_BASE}/api/admin-ai/chat`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.data.success) {
        setMessages([...newMsgs, { role: 'model', text: res.data.reply }]);
        
        // If it was a new chat, update ID and fetch to get the generated title
        if (!currentId && res.data.conversationId) {
          setCurrentId(res.data.conversationId);
          setTimeout(fetchConversations, 2000); // give it 2 secs to gen title in backend
        }
      } else {
        setMessages([...newMsgs, { role: 'model', text: 'عذراً، حدث خطأ أثناء الاستعلام. يرجى المحاولة مرة أخرى.' }]);
      }
    } catch (err) {
      const errText = err.response?.data?.error || err.response?.data?.message || err.message;
      setMessages([...newMsgs, { role: 'model', text: `عذراً، حدث خطأ: ${errText}` }]);
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

  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) return null;

  return (
    <>
      <button style={styles.fabBtn} onClick={() => setIsOpen(!isOpen)} title="مساعد الإدارة">
        <span style={{ fontSize: 24 }}>🧠</span>
        <span style={styles.fabText}>مساعد الإدارة</span>
      </button>

      {isOpen && (
        <div style={styles.chatWindow}>
          
          {/* Header */}
          <div style={styles.chatHeader}>
            <div style={styles.headerLeft}>
              <button style={styles.menuBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={styles.headerTitle}>مساعد الإدارة الذكي</span>
                <span style={styles.headerSub}>مرحباً بك يا {user.username}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={styles.newChatHeaderBtn} onClick={() => { setCurrentId(null); setIsSidebarOpen(false); }} title="محادثة جديدة">➕</button>
              <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
            </div>
          </div>

          {/* Sidebar Overlay */}
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

          {/* Chat Body */}
          <div style={styles.chatBody}>
            {messages.map((msg, idx) => (
              <div key={idx} style={msg.role === 'user' ? styles.msgUserWrap : styles.msgModelWrap}>
                <div style={msg.role === 'user' ? styles.msgUser : styles.msgModel}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.msgModelWrap}>
                <div style={styles.msgModel}>
                  <Spinner animation="border" size="sm" style={{ color: '#028090', borderWidth: '2px' }} />
                  <span style={{ fontSize: 12, marginRight: 8, color: '#666' }}>جاري التحليل المعقد للبيانات...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Footer */}
          <div style={styles.chatFooter}>
            <textarea
              ref={inputRef}
              style={styles.inputArea}
              placeholder="اكتب استفسارك للإدارة هنا..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button style={{ ...styles.sendBtn, opacity: !input.trim() || loading ? 0.6 : 1 }} onClick={handleSend} disabled={!input.trim() || loading}>
              إرسال
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  fabBtn: { position: 'fixed', bottom: 24, right: 24, backgroundColor: '#0f2736', border: '2px solid #028090', borderRadius: 30, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 9999, transition: 'all 0.3s ease' },
  fabText: { fontWeight: 700, fontSize: 16 },
  chatWindow: { position: 'fixed', bottom: 90, right: 24, width: 380, height: 600, maxHeight: '80vh', backgroundColor: '#ffffff', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0', direction: 'rtl' },
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
  chatFooter: { padding: 12, backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 10, alignItems: 'flex-end' },
  inputArea: { flex: 1, border: '1px solid #ccc', borderRadius: 14, padding: '10px 14px', resize: 'none', backgroundColor: '#f1f2f6', color: '#2d3436', outline: 'none', fontFamily: 'inherit', maxHeight: 100 },
  sendBtn: { backgroundColor: '#028090', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', height: 44 }
};

export default AdminAIChat;
