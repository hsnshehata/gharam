import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { API_BASE } from '../utils/apiBase';
import './LiveVoiceAssistant.css';

const BOT_IMAGE = "https://i.ibb.co/7JJScM0Q/zain-ai.png";

const getSessionId = () => {
    let sid = localStorage.getItem('gharam_chat_session');
    if (!sid) {
        sid = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('gharam_chat_session', sid);
    }
    return sid;
};

// ── Audio Conversion Utilities ──
function float32To16BitPCMBase64(f32) {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
        const s = Math.max(-1, Math.min(1, f32[i]));
        i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(i16.buffer);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return window.btoa(bin);
}

function base64ToFloat32Array(b64) {
    const bin = window.atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0;
    return f32;
}

// ── SVG Icons ──
const HangUpIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26"><path fill="white" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);

const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);

export default function AIChatPopup({ onClose }) {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'أهلاً بكِ في غرام سلطان بيوتي سنتر! ✨ أنا غزل مساعدتكِ الذكية، كيف يمكنني مساعدتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const sessionId = useRef(getSessionId());

    // ── Voice Mode ──
    const [voiceMode, setVoiceMode] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // Use refs for voice to avoid re-render flickering
    const orbRef = useRef(null);
    const timerRef = useRef(null);
    const voiceWsRef = useRef(null);
    const voiceAudioCtxRef = useRef(null);
    const voiceStreamRef = useRef(null);
    const voiceProcessorRef = useRef(null);
    const voicePlaybackCtxRef = useRef(null);
    const speakingTimeoutRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    // Use ref for speaking to avoid closure stale-state in onaudioprocess
    const isSpeakingRef = useRef(false);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages, loading]);

    // Load history
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/ai/chat/history/${sessionId.current}`);
                if (res.data.success && res.data.data?.length > 0) {
                    const hist = res.data.data.map(m => ({ role: m.role, text: m.text }));
                    setMessages(prev => [prev[0], ...hist]);
                }
            } catch {} finally { setHistoryLoading(false); }
        };
        loadHistory();
    }, []);

    // Cleanup
    useEffect(() => () => stopVoiceMode(), []);// eslint-disable-line react-hooks/exhaustive-deps

    // ── Format text with links & bold ──
    const formatText = (text) => {
        if (!text) return "";
        const urlRx = /(https?:\/\/[^\s]+)/g;
        return text.split('\n').map((line, i) => (
            <span key={i}>
                {line.split(urlRx).map((part, j) => {
                    if (part.match(urlRx)) {
                        return (
                            <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="chat-link-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:5}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                فتح الرابط
                            </a>
                        );
                    }
                    return part.split(/(\*\*.*?\*\*)/g).map((sub, k) => {
                        if (sub.startsWith('**') && sub.endsWith('**')) return <strong key={`${j}-${k}`} style={{color:'#168a7d'}}>{sub.slice(2,-2)}</strong>;
                        return sub;
                    });
                })}
                <br />
            </span>
        ));
    };

    // ── Send text message ──
    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', text: input };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setInput('');
        setLoading(true);

        try {
            const clean = newMsgs.filter((_, i) => i > 0).map(m => ({ role: m.role, text: m.text }));
            const res = await axios.post(`${API_BASE}/api/ai/chat`, { messages: clean, sessionId: sessionId.current });
            if (res.data.success) {
                setMessages(prev => [...prev, { role: 'model', text: res.data.reply }]);
            } else throw new Error();
        } catch (err) {
            const msg = err.response?.data?.message || 'عذراً، حدث خطأ في الاتصال. حاولي مرة تانية.';
            setMessages(prev => [...prev, { role: 'model', text: msg }]);
        } finally { setLoading(false); }
    };

    // ══════════════════════════════════
    //  VOICE MODE
    // ══════════════════════════════════

    const formatTime = (s) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const startVoiceMode = async () => {
        setVoiceMode(true);
        setVoiceStatus('جاري الاتصال بغزل...');
        setIsVoiceRecording(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setCallDuration(0);

        try {
            const sid = getSessionId();
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${proto}//${window.location.host}/api/live-audio?sessionId=${sid}`);
            voiceWsRef.current = ws;

            ws.onopen = async () => {
                setVoiceStatus('غزل بتسمعك... 🎤');
                setIsVoiceRecording(true);
                timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
                await startVoiceMic(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'quota_exceeded') {
                        setVoiceStatus('انتهت دقائقك الصوتية اليوم 😢');
                        setTimeout(() => stopVoiceMode(), 2500);
                        return;
                    }
                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                        playVoiceChunk(data.serverContent.modelTurn.parts[0].inlineData.data);
                        setIsSpeaking(true);
                        isSpeakingRef.current = true;
                        setVoiceStatus('غزل بتتكلم... 💬');
                        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            isSpeakingRef.current = false;
                            setVoiceStatus('غزل بتسمعك... 🎤');
                        }, 1200);
                    }
                    if (data.serverContent?.turnComplete) {
                        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            isSpeakingRef.current = false;
                            setVoiceStatus('غزل بتسمعك... 🎤');
                        }, 800);
                    }
                } catch {}
            };

            ws.onclose = () => {
                setVoiceStatus('انقطع الاتصال');
                setTimeout(() => stopVoiceMode(), 1500);
            };
        } catch (err) {
            setVoiceStatus('تعذر الاتصال!');
            console.error(err);
        }
    };

    const startVoiceMic = async (ws) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
            voiceStreamRef.current = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            voiceAudioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            voiceProcessorRef.current = processor;
            source.connect(processor);
            processor.connect(ctx.destination);

            processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const f32 = e.inputBuffer.getChannelData(0);

                // Use CSS variable for mic glow intensity — no transform to avoid fighting CSS animations
                if (orbRef.current && !isSpeakingRef.current) {
                    let sum = 0;
                    for (let i = 0; i < f32.length; i++) sum += Math.abs(f32[i]);
                    const avg = sum / f32.length;
                    const glow = Math.min(avg * 5, 1);
                    orbRef.current.style.setProperty('--mic-glow', glow.toFixed(2));
                }

                ws.send(JSON.stringify({
                    realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: float32To16BitPCMBase64(f32) }] }
                }));
            };
        } catch {
            setVoiceStatus('رفضتِ صلاحية المايك!');
        }
    };

    const playVoiceChunk = (b64) => {
        if (!voicePlaybackCtxRef.current) {
            voicePlaybackCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = voicePlaybackCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const f32 = base64ToFloat32Array(b64);
        const buf = ctx.createBuffer(1, f32.length, 24000);
        buf.getChannelData(0).set(f32);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const now = ctx.currentTime;
        if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now;
        src.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buf.duration;
    };

    const stopVoiceMode = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (speakingTimeoutRef.current) { clearTimeout(speakingTimeoutRef.current); speakingTimeoutRef.current = null; }
        if (voiceWsRef.current) { voiceWsRef.current.close(); voiceWsRef.current = null; }
        if (voiceProcessorRef.current) { voiceProcessorRef.current.disconnect(); voiceProcessorRef.current = null; }
        if (voiceStreamRef.current) { voiceStreamRef.current.getTracks().forEach(t => t.stop()); voiceStreamRef.current = null; }
        if (voiceAudioCtxRef.current) { voiceAudioCtxRef.current.close(); voiceAudioCtxRef.current = null; }
        setVoiceMode(false);
        setIsVoiceRecording(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        nextPlayTimeRef.current = 0;
    };

    const getOrbClass = () => {
        if (isSpeaking) return 'ai-orb speaking';
        if (isVoiceRecording) return 'ai-orb recording';
        return 'ai-orb';
    };

    return (
        <div className="ghazal-overlay">
            <div className="ghazal-container" dir="rtl">

                {/* ═══ Header ═══ */}
                <div className="ghazal-header">
                    <div className="ghazal-header-right">
                        <div className="ghazal-avatar-wrap">
                            <img src={BOT_IMAGE} alt="غزل" className="ghazal-avatar-img" />
                            <span className="ghazal-online-dot"></span>
                        </div>
                        <div>
                            <div className="ghazal-header-name">غزل المساعدة الذكية ✨</div>
                            <div className="ghazal-header-sub">
                                {voiceMode ? `🔴 مكالمة صوتية • ${formatTime(callDuration)}` : 'متصلة الآن • غرام سلطان'}
                            </div>
                        </div>
                    </div>
                    <div className="ghazal-header-actions">
                        <button className="ghazal-header-btn" onClick={() => setShowInfo(true)} title="دليل غزل">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </button>
                        <button className="ghazal-header-btn ghazal-close-btn" onClick={() => { stopVoiceMode(); onClose(); }} title="إغلاق">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                {/* ═══ VOICE MODE ═══ */}
                {voiceMode ? (
                    <div className="voice-mode-container">
                        <div className="ai-orb-container">
                            <div className="ai-orb-ring"></div>
                            <div className="ai-orb-ring"></div>
                            <div className="ai-orb-ring"></div>
                            <div ref={orbRef} className={getOrbClass()}>
                                <img src="/logo.png" alt="غرام" className="orb-logo" />
                            </div>
                        </div>
                        <div className="voice-status-text">{voiceStatus}</div>
                        <button className="hangup-btn" onClick={stopVoiceMode} title="إنهاء المكالمة">
                            <HangUpIcon />
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ═══ CHAT MESSAGES ═══ */}
                        <div className="ghazal-chat-box">
                            {historyLoading ? (
                                <div className="ghazal-loading-dots">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            ) : (
                                messages.map((m, idx) => (
                                    <div key={idx} className={`ghazal-msg-row ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                                        {m.role === 'model' && (
                                            <div className="ghazal-bot-icon-wrap">
                                                <img src={BOT_IMAGE} alt="غزل" className="ghazal-bot-icon" />
                                            </div>
                                        )}
                                        <div className={`ghazal-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                                            {formatText(m.text)}
                                        </div>
                                    </div>
                                ))
                            )}

                            {loading && (
                                <div className="ghazal-msg-row msg-bot">
                                    <div className="ghazal-bot-icon-wrap">
                                        <img src={BOT_IMAGE} alt="غزل" className="ghazal-bot-icon" />
                                    </div>
                                    <div className="ghazal-bubble bubble-bot">
                                        <div className="ghazal-typing">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ═══ INPUT AREA ═══ */}
                        <form onSubmit={handleSend} className="ghazal-input-area">
                            <div className="ghazal-input-row">
                                <button type="button" className="ghazal-call-btn" onClick={startVoiceMode} title="اتصلي بغزل صوتياً">
                                    <PhoneIcon />
                                </button>
                                <input
                                    className="ghazal-input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="اكتبي رسالتك هنا..."
                                />
                                <button type="submit" className="ghazal-send-btn" disabled={!input.trim() || loading} style={{opacity: input.trim() ? 1 : 0.4}}>
                                    <SendIcon />
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* ═══ Info Modal ═══ */}
            <Modal show={showInfo} onHide={() => setShowInfo(false)} centered dir="rtl" className="ghazal-info-modal" backdropClassName="ai-modal-backdrop">
                <Modal.Header className="ghazal-modal-header">
                    <Modal.Title className="ghazal-modal-title">🌸 دليلك للحديث مع غزل</Modal.Title>
                    <button onClick={() => setShowInfo(false)} className="ghazal-modal-close-x">×</button>
                </Modal.Header>
                <Modal.Body className="ghazal-modal-body">
                    <p className="ghazal-modal-intro">
                        مرحباً بكِ في <strong style={{color:'#168a7d'}}>غرام سلطان بيوتي سنتر!</strong> 💖<br />
                        <span style={{fontWeight:'normal',color:'#666'}}>
                            <strong>غزل</strong> هي مساعدة خدمة العملاء الذكية، مصممة للرد على استفساراتك فوراً على مدار الساعة.
                        </span>
                    </p>

                    <div className="ghazal-modal-section">
                        <h6 className="ghazal-modal-section-title">✨ إيه اللي غزل تقدر تعمله؟</h6>
                        <ul className="ghazal-modal-list">
                            <li><strong>الأسعار والخدمات:</strong> باكدجات الميك أب، فرد وعلاج الشعر، تنظيف البشرة، والتصوير.</li>
                            <li><strong>سياسات المركز:</strong> مواعيد العمل (9ص - 9م)، المرافقين، ومواعيد تجهيزات الزفاف.</li>
                            <li><strong>حالة الحجوزات:</strong> بمجرد إعطائها رقم الوصل أو رقم الهاتف.</li>
                        </ul>
                    </div>

                    <div className="ghazal-modal-section">
                        <h6 className="ghazal-modal-section-title">📞 المكالمة الصوتية المباشرة</h6>
                        <ul className="ghazal-modal-list">
                            <li>اضغطي على <strong style={{color:'#1fb6a6'}}>أيقونة الهاتف 📞</strong> بجانب خانة الكتابة لبدء مكالمة صوتية مباشرة مع غزل.</li>
                            <li>المكالمة الصوتية متاحة لمدة <strong style={{color:'#e74c3c'}}>5 دقائق يومياً</strong> لكل جهاز.</li>
                            <li>بعد انتهاء الدقائق الصوتية، يمكنك الاستمرار في المحادثة النصية بدون حدود! 💬</li>
                        </ul>
                    </div>

                    <div className="ghazal-modal-section">
                        <h6 className="ghazal-modal-section-title">💡 نصائح لتجربة أسرع</h6>
                        <ul className="ghazal-modal-list">
                            <li>اسألي مباشرة: <span className="ghazal-example">"بكام باكدج الميك أب السبيشيال؟"</span></li>
                            <li>أو: <span className="ghazal-example">"عاوزة أعرف حالة حجزي رقم 1234"</span></li>
                            <li>لتأكيد الحجوزات أو تغيير المواعيد: تواصلي عبر الواتساب أو الأرضي.</li>
                        </ul>
                    </div>
                </Modal.Body>
                <Modal.Footer className="ghazal-modal-footer">
                    <Button onClick={() => setShowInfo(false)} className="ghazal-modal-cta">
                        ✨ تحدثي مع غزل الآن
                    </Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                /* ═══ Ghazal Chat Popup Styles ═══ */
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

                @keyframes ghazalFloatIn { 
                    from { opacity:0; transform:translateY(25px) scale(0.92); } 
                    to { opacity:1; transform:translateY(0) scale(1); } 
                }

                .ghazal-overlay {
                    position: fixed;
                    bottom: 95px;
                    left: 25px;
                    z-index: 2000;
                    animation: ghazalFloatIn 0.35s cubic-bezier(0.175,0.885,0.32,1.2) forwards;
                }

                .ghazal-container {
                    width: 380px;
                    height: 560px;
                    max-width: calc(100vw - 40px);
                    max-height: calc(100vh - 120px);
                    background: #fdfbf9;
                    border-radius: 24px;
                    box-shadow: 
                        0 25px 60px rgba(0,0,0,0.18),
                        0 0 0 1px rgba(31,182,166,0.08);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Tajawal', sans-serif;
                }

                /* ── Header ── */
                .ghazal-header {
                    background: linear-gradient(135deg, #1fb6a6 0%, #15897c 100%);
                    color: #fff;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .ghazal-header-right {
                    display: flex; align-items: center; gap: 12px;
                }
                .ghazal-avatar-wrap {
                    position: relative;
                    width: 42px; height: 42px;
                    border-radius: 14px;
                    background: #fff;
                    padding: 2px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.12);
                    flex-shrink: 0;
                }
                .ghazal-avatar-img {
                    width: 100%; height: 100%;
                    object-fit: contain; border-radius: 12px;
                }
                .ghazal-online-dot {
                    position: absolute; bottom: -2px; right: -2px;
                    width: 11px; height: 11px;
                    border-radius: 50%; background: #2ecc71;
                    border: 2px solid #1fb6a6;
                }
                .ghazal-header-name {
                    font-weight: 800; font-size: 0.98rem;
                    letter-spacing: 0.2px;
                }
                .ghazal-header-sub {
                    font-size: 0.72rem; color: rgba(255,255,255,0.8);
                    margin-top: 1px;
                }
                .ghazal-header-actions {
                    display: flex; gap: 6px;
                }
                .ghazal-header-btn {
                    width: 32px; height: 32px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.15);
                    border: none; color: #fff;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    backdrop-filter: blur(4px);
                }
                .ghazal-header-btn:hover { background: rgba(255,255,255,0.28); }
                .ghazal-close-btn:hover { background: rgba(231,76,60,0.5); }

                /* ── Chat Box ── */
                .ghazal-chat-box {
                    flex: 1;
                    padding: 20px 16px;
                    overflow-y: auto;
                    background: #fdfbf9;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .ghazal-loading-dots {
                    display: flex; align-items: center; justify-content: center;
                    gap: 4px; padding: 40px 0;
                }

                /* ── Messages ── */
                .ghazal-msg-row {
                    display: flex; align-items: flex-end; gap: 8px; width: 100%;
                }
                .ghazal-msg-row.msg-user {
                    justify-content: flex-start; flex-direction: row;
                }
                .ghazal-msg-row.msg-bot {
                    justify-content: flex-end; flex-direction: row-reverse;
                }
                .ghazal-bot-icon-wrap {
                    width: 28px; height: 28px;
                    border-radius: 9px;
                    background: #fff; border: 1px solid #eee;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; overflow: hidden;
                }
                .ghazal-bot-icon { width: 80%; height: 80%; object-fit: contain; }

                .ghazal-bubble {
                    padding: 12px 16px;
                    border-radius: 18px;
                    line-height: 1.65;
                    font-size: 0.9rem;
                    max-width: 82%;
                    white-space: pre-wrap;
                    transition: all 0.2s ease;
                }
                .bubble-user {
                    background: linear-gradient(135deg, #1fb6a6, #17a394);
                    color: #fff;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 3px 12px rgba(31,182,166,0.2);
                }
                .bubble-bot {
                    background: #fff;
                    color: #2d3436;
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 3px 12px rgba(0,0,0,0.04);
                    border: 1px solid #f0f0f0;
                }

                .ghazal-typing { display: flex; align-items: center; height: 20px; }

                .typing-dot { 
                    display: inline-block; 
                    width: 6px; height: 6px; 
                    margin: 0 2px; 
                    background: #1fb6a6; 
                    border-radius: 50%; 
                    animation: typBounce 1.4s infinite ease-in-out both; 
                }
                .typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .typing-dot:nth-child(2) { animation-delay: -0.16s; }
                @keyframes typBounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4;} 40%{transform:scale(1.1);opacity:1;} }

                /* ── Input Area ── */
                .ghazal-input-area {
                    padding: 14px 16px 20px;
                    background: #fff;
                    border-top: 1px solid #f0eeec;
                    flex-shrink: 0;
                }
                .ghazal-input-row {
                    display: flex; align-items: center;
                    background: #f4f5f7;
                    border-radius: 22px;
                    padding: 4px 6px;
                    border: 1.5px solid #e8e9eb;
                    transition: border-color 0.3s;
                    gap: 2px;
                }
                .ghazal-input-row:focus-within {
                    border-color: #1fb6a6;
                    box-shadow: 0 0 0 3px rgba(31,182,166,0.08);
                }

                .ghazal-call-btn {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1fb6a6, #15897c);
                    color: #fff; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 3px 10px rgba(31,182,166,0.3);
                }
                .ghazal-call-btn:hover {
                    transform: scale(1.08);
                    box-shadow: 0 4px 16px rgba(31,182,166,0.45);
                }

                .ghazal-input {
                    flex: 1;
                    border: none; outline: none;
                    background: transparent;
                    font-size: 0.92rem;
                    padding: 10px 8px;
                    color: #2f3542;
                    font-family: 'Tajawal', sans-serif;
                }
                .ghazal-input::placeholder { color: #b0b5bd; }

                .ghazal-send-btn {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1fb6a6, #15897c);
                    color: #fff; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.2s, opacity 0.3s;
                }
                .ghazal-send-btn:hover:not(:disabled) { transform: scale(1.08); }
                .ghazal-send-btn:disabled { cursor: default; }

                /* ── Chat link buttons ── */
                .chat-link-btn {
                    display: inline-flex; align-items: center;
                    background: linear-gradient(135deg, #1fb6a6, #168a7d);
                    color: #fff !important;
                    padding: 7px 14px; border-radius: 10px;
                    text-decoration: none; font-weight: 700;
                    font-size: 0.82rem; margin: 6px 3px;
                    box-shadow: 0 3px 8px rgba(31,182,166,0.25);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .chat-link-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 12px rgba(31,182,166,0.35); }

                /* ── Scrollbar ── */
                .ghazal-chat-box::-webkit-scrollbar { width: 4px; }
                .ghazal-chat-box::-webkit-scrollbar-track { background: transparent; }
                .ghazal-chat-box::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }

                /* ── Info Modal ── */
                .ghazal-info-modal { z-index: 10005 !important; }
                .ai-modal-backdrop { z-index: 10000 !important; }

                .ghazal-modal-header {
                    background: linear-gradient(135deg, #1fb6a6, #15897c) !important;
                    color: #fff !important;
                    border-bottom: none !important;
                    padding: 18px 24px !important;
                    position: relative;
                }
                .ghazal-modal-title {
                    font-weight: 800 !important;
                    font-size: 1.15rem !important;
                    font-family: 'Tajawal', sans-serif !important;
                }
                .ghazal-modal-close-x {
                    background: none; border: none;
                    color: #fff; font-size: 26px;
                    cursor: pointer;
                    position: absolute; left: 18px; top: 14px;
                    line-height: 1; opacity: 0.8;
                    transition: opacity 0.2s;
                }
                .ghazal-modal-close-x:hover { opacity: 1; }

                .ghazal-modal-body {
                    max-height: 65vh; overflow-y: auto;
                    background: #fdfbf9 !important;
                    color: #2d3436;
                    padding: 24px !important;
                    font-family: 'Tajawal', sans-serif;
                }
                .ghazal-modal-intro {
                    font-size: 15px; line-height: 1.7;
                    margin-bottom: 0;
                }
                .ghazal-modal-section {
                    margin-top: 18px;
                    padding: 16px;
                    background: #fff;
                    border-radius: 14px;
                    border: 1px solid #f0eeec;
                }
                .ghazal-modal-section-title {
                    color: #1fb6a6;
                    font-weight: 800;
                    font-size: 0.95rem;
                    margin-bottom: 10px;
                }
                .ghazal-modal-list {
                    font-size: 14px;
                    line-height: 1.75;
                    padding-right: 18px;
                    color: #555;
                    margin-bottom: 0;
                }
                .ghazal-modal-list li { margin-bottom: 4px; }
                .ghazal-modal-list strong { color: #2d3436; }
                .ghazal-example {
                    color: #e84118;
                    font-weight: 600;
                }

                .ghazal-modal-footer {
                    background: #fdfbf9 !important;
                    border-top: 1px solid #f0eeec !important;
                    justify-content: center !important;
                    padding: 16px !important;
                }
                .ghazal-modal-cta {
                    background: linear-gradient(135deg, #1fb6a6, #15897c) !important;
                    border: none !important;
                    font-weight: 800 !important;
                    padding: 10px 28px !important;
                    border-radius: 22px !important;
                    font-size: 0.95rem !important;
                    font-family: 'Tajawal', sans-serif !important;
                    box-shadow: 0 4px 14px rgba(31,182,166,0.3) !important;
                    transition: transform 0.2s, box-shadow 0.2s !important;
                }
                .ghazal-modal-cta:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 6px 18px rgba(31,182,166,0.4) !important;
                }

                /* ── Responsive ── */
                @media (max-width: 480px) {
                    .ghazal-overlay { left: 8px; right: 8px; bottom: 75px; }
                    .ghazal-container {
                        width: 100%;
                        height: 70vh;
                        height: 70dvh;
                        max-height: calc(100vh - 160px);
                        max-height: calc(100dvh - 160px);
                        border-radius: 20px;
                    }
                    .ghazal-header { padding: 14px 16px; }
                    .ghazal-chat-box { padding: 16px 12px; }
                    .ghazal-input-area { padding: 12px 12px 16px; }
                    .ghazal-bubble { max-width: 88%; font-size: 0.88rem; }
                }
            `}</style>
        </div>
    );
}
