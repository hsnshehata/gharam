import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { API_BASE } from '../utils/apiBase';
import './LiveVoiceAssistant.css';

const BOT_IMAGE = "https://i.ibb.co/7JJScM0Q/zain-ai.png";

// Generate or retrieve a persistent session ID for this device
const getSessionId = () => {
    let sid = localStorage.getItem('gharam_chat_session');
    if (!sid) {
        sid = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('gharam_chat_session', sid);
    }
    return sid;
};

// ── Audio Conversion Utilities for Live Voice ──
function float32To16BitPCMBase64(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToFloat32Array(base64) {
    const binaryStr = window.atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
}

// ── Phone Hang-Up SVG Icon ──
const HangUpIcon = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path fill="white" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
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
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const messagesEndRef = useRef(null);
    const sessionId = useRef(getSessionId());

    // ── Voice Mode State ──
    const [voiceMode, setVoiceMode] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const orbRef = useRef(null);
    const timerRef = useRef(null);
    const voiceWsRef = useRef(null);
    const voiceAudioCtxRef = useRef(null);
    const voiceStreamRef = useRef(null);
    const voiceProcessorRef = useRef(null);
    const voicePlaybackCtxRef = useRef(null);
    const speakingTimeoutRef = useRef(null);
    const nextPlayTimeRef = useRef(0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Load previous conversation history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/ai/chat/history/${sessionId.current}`);
                if (res.data.success && res.data.data && res.data.data.length > 0) {
                    const historyMessages = res.data.data.map(m => ({ role: m.role, text: m.text }));
                    setMessages([
                        { role: 'model', text: 'أهلاً بكِ في غرام سلطان بيوتي سنتر! ✨ أنا غزل مساعدتكِ الذكية، كيف يمكنني مساعدتك اليوم؟' },
                        ...historyMessages
                    ]);
                }
            } catch (err) {
                console.log('No previous chat history found');
            } finally {
                setHistoryLoading(false);
            }
        };
        loadHistory();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVoiceMode();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                handleSend(null, audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied", err);
            alert("يرجى السماح بالوصول إلى المايكروفون للتسجيل.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const formatText = (text) => {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split('\n').map((line, i) => (
            <span key={i}>
                {line.split(urlRegex).map((part, j) => {
                    if (part.match(urlRegex)) {
                        return (
                            <a 
                                key={j} 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="chat-link-btn"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '6px'}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                رابط الصفحة المطلوب
                            </a>
                        );
                    }
                    return part.split(/(\*\*.*?\*\*)/g).map((subPart, k) => {
                        if (subPart.startsWith('**') && subPart.endsWith('**')) {
                            return <strong key={`${j}-${k}`} style={{ color: '#168a7d' }}>{subPart.slice(2, -2)}</strong>;
                        }
                        return subPart;
                    });
                })}
                <br />
            </span>
        ));
    };

    const handleSend = async (e, voiceBlob = null) => {
        e?.preventDefault();
        if (!voiceBlob && !input.trim()) return;
        if (loading) return;

        const userMessage = {
            role: 'user',
            text: voiceBlob ? "🎤 رسالة صوتية..." : input
        };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            let res;
            const cleanMessages = newMessages
                .filter((_, i) => i > 0)
                .map(m => ({ role: m.role, text: m.text }));

            if (voiceBlob) {
                const formData = new FormData();
                formData.append('audio', voiceBlob, 'voice.webm');
                formData.append('messages', JSON.stringify(cleanMessages));
                formData.append('sessionId', sessionId.current);
                res = await axios.post(`${API_BASE}/api/ai/chat`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await axios.post(`${API_BASE}/api/ai/chat`, { 
                    messages: cleanMessages, 
                    sessionId: sessionId.current 
                });
            }

            if (res.data.success) {
                const replyMessage = {
                    role: 'model',
                    text: res.data.reply,
                    audioParts: res.data.audioParts
                };
                setMessages(prev => [...prev, replyMessage]);
            } else {
                throw new Error('فشل الرد');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.';
            setMessages(prev => [...prev, { role: 'model', text: errMsg }]);
        } finally {
            setLoading(false);
        }
    };

    // ══════════════════════════════════════
    //  VOICE MODE LOGIC
    // ══════════════════════════════════════

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const startVoiceMode = async () => {
        setVoiceMode(true);
        setVoiceStatus('جاري الاتصال بغزل...');
        setIsVoiceRecording(false);
        setIsSpeaking(false);
        setCallDuration(0);

        try {
            const sid = getSessionId();
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/live-audio?sessionId=${sid}`;

            const ws = new WebSocket(wsUrl);
            voiceWsRef.current = ws;

            ws.onopen = async () => {
                setVoiceStatus('غزل جاهزة تسمعك... 🎤');
                setIsVoiceRecording(true);
                // Start timer
                timerRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
                await startVoiceMic(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'quota_exceeded') {
                        setVoiceStatus('انتهت دقائقك الصوتية اليوم 😢');
                        setTimeout(() => stopVoiceMode(), 2000);
                        return;
                    }

                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                        const base64Audio = data.serverContent.modelTurn.parts[0].inlineData.data;
                        playVoiceChunk(base64Audio);

                        setIsSpeaking(true);
                        setVoiceStatus('غزل بتتكلم... 💬');

                        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            setVoiceStatus('غزل جاهزة تسمعك... 🎤');
                        }, 1200);
                    }

                    if (data.serverContent?.turnComplete) {
                        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                        speakingTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            setVoiceStatus('غزل جاهزة تسمعك... 🎤');
                        }, 800);
                    }
                } catch (err) {
                    console.error("Parse WS error", err);
                }
            };

            ws.onclose = () => {
                if (voiceMode) {
                    setVoiceStatus('انقطع الاتصال');
                    setTimeout(() => stopVoiceMode(), 1500);
                }
            };
        } catch (err) {
            setVoiceStatus('مفيش مايك!');
            console.error(err);
        }
    };

    const startVoiceMic = async (ws) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
            voiceStreamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            voiceAudioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            voiceProcessorRef.current = processor;

            source.connect(processor);
            processor.connect(audioCtx.destination);

            processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const float32Array = e.inputBuffer.getChannelData(0);

                // Orb visualizer
                let sum = 0;
                for (let i = 0; i < float32Array.length; i++) sum += Math.abs(float32Array[i]);
                const avg = sum / float32Array.length;
                if (orbRef.current && !isSpeaking) {
                    const scale = 1 + Math.min(avg * 3, 0.25);
                    orbRef.current.style.transform = `scale(${scale})`;
                }

                const base64Data = float32To16BitPCMBase64(float32Array);
                ws.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64Data }]
                    }
                }));
            };
        } catch (err) {
            console.error(err);
            setVoiceStatus('رفضت صلاحية المايك!');
        }
    };

    const playVoiceChunk = (base64) => {
        if (!voicePlaybackCtxRef.current) {
            voicePlaybackCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = voicePlaybackCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const float32Array = base64ToFloat32Array(base64);
        const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        if (nextPlayTimeRef.current < currentTime) nextPlayTimeRef.current = currentTime;
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
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
        nextPlayTimeRef.current = 0;
    };

    const getOrbClass = () => {
        if (isSpeaking) return 'ai-orb speaking';
        if (isVoiceRecording) return 'ai-orb recording';
        return 'ai-orb';
    };

    // Helper component to play sequence of audio chunks
    const VoiceResponse = ({ parts }) => {
        const [playing, setPlaying] = useState(false);
        const [currentIndex, setCurrentIndex] = useState(0);
        const audioRef = useRef(new Audio());

        const playNext = useCallback((index) => {
            if (index < parts.length) {
                audioRef.current.src = parts[index];
                audioRef.current.play().catch(e => console.error("Audio play error:", e));
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
            <button
                type="button"
                onClick={() => playing ? (audioRef.current.pause(), setPlaying(false)) : playNext(0)}
                style={styles.voicePlayBtn}
            >
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
                <span>{playing ? "إيقاف" : "استماع للرد"}</span>
            </button>
        );
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container} dir="rtl">
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <div style={styles.avatarWrapper}>
                            <img src={BOT_IMAGE} alt="AI Avatar" style={styles.avatarImg} />
                            <div style={styles.onlineBadge}></div>
                        </div>
                        <div>
                            <div style={styles.headerMainText}>غزل المساعدة الذكية ✨</div>
                            <div style={styles.headerSubText}>
                                {voiceMode ? `مكالمة صوتية • ${formatTime(callDuration)}` : 'تواصل فوري • ذكاء اصطناعي'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Voice Call Button */}
                        {!voiceMode && (
                            <button 
                                style={{...styles.infoBtn, background: 'rgba(255,255,255,0.25)'}} 
                                onClick={startVoiceMode} 
                                aria-label="مكالمة صوتية"
                                title="تحدث مع غزل صوتياً"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                            </button>
                        )}
                        <button style={styles.infoBtn} onClick={() => setShowInfo(true)} aria-label="Info">❓</button>
                        <button style={styles.closeBtn} onClick={() => { stopVoiceMode(); onClose(); }} aria-label="Close">✕</button>
                    </div>
                </div>

                {/* ═══ VOICE MODE VIEW ═══ */}
                {voiceMode ? (
                    <div className="voice-mode-container">
                        {/* Orb */}
                        <div className="ai-orb-container">
                            <div className="ai-orb-ring"></div>
                            <div className="ai-orb-ring"></div>
                            <div className="ai-orb-ring"></div>
                            <div ref={orbRef} className={getOrbClass()}>
                                <img src="/logo.png" alt="غرام" className="orb-logo" />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="voice-status-text">{voiceStatus}</div>

                        {/* Hang Up */}
                        <button className="hangup-btn" onClick={stopVoiceMode} title="إنهاء المكالمة">
                            <HangUpIcon />
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ═══ TEXT CHAT VIEW ═══ */}
                        <div style={styles.chatBox}>
                            {historyLoading ? (
                                <div style={styles.historyLoader}>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            ) : (
                                messages.map((m, idx) => (
                                    <div key={idx} style={{
                                        ...styles.messageRow,
                                        justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end',
                                        flexDirection: m.role === 'user' ? 'row' : 'row-reverse'
                                    }}>
                                        {m.role === 'model' && (
                                            <div style={styles.botIconWrapper}>
                                                <img src={BOT_IMAGE} alt="bot" style={styles.botIcon} />
                                            </div>
                                        )}
                                        <div style={{
                                            ...styles.bubble,
                                            backgroundColor: m.role === 'user' ? '#1fb6a6' : '#ffffff',
                                            color: m.role === 'user' ? '#fff' : '#2d3436',
                                            borderBottomRightRadius: m.role === 'user' ? 4 : '20px',
                                            borderBottomLeftRadius: m.role === 'model' ? 4 : '20px',
                                            boxShadow: m.role === 'user' ? '0 4px 15px rgba(31, 182, 166, 0.2)' : '0 4px 15px rgba(0,0,0,0.05)',
                                        }}>
                                            {formatText(m.text)}

                                            {m.role === 'model' && m.audioParts && m.audioParts.length > 0 && (
                                                <div style={{ marginTop: '12px', borderTop: '1px solid #efefef', paddingTop: '10px' }}>
                                                    <VoiceResponse parts={m.audioParts} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            {loading && (
                                <div style={{ ...styles.messageRow, justifyContent: 'flex-end', flexDirection: 'row-reverse' }}>
                                    <div style={styles.botIconWrapper}>
                                        <img src={BOT_IMAGE} alt="bot" style={styles.botIcon} />
                                    </div>
                                    <div style={{ ...styles.bubble, backgroundColor: '#ffffff', borderBottomLeftRadius: 4 }}>
                                        <div style={styles.typingIndicator}>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} style={styles.inputArea}>
                            <div style={{ ...styles.inputWrapper, borderColor: isRecording ? '#ff4757' : '#e1e2e6' }}>
                                <button
                                    type="button"
                                    style={{
                                        ...styles.micBtn,
                                        color: isRecording ? '#ff4757' : '#747d8c',
                                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                                    }}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    title={isRecording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}
                                >
                                    {isRecording ? (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                            <rect x="6" y="6" width="12" height="12" rx="2" />
                                        </svg>
                                    ) : (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                            <line x1="12" y1="19" x2="12" y2="23"></line>
                                            <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                    )}
                                </button>
                                <input
                                    style={styles.input}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isRecording ? "جاري التسجيل..." : "اكتبي رسالتك هنا..."}
                                    disabled={isRecording}
                                />
                                <button
                                    type="submit"
                                    style={{ ...styles.sendBtn, opacity: (input.trim()) ? 1 : 0.5 }}
                                    disabled={(!input.trim()) || loading || isRecording}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* نافذة دليل غزل */}
            <Modal show={showInfo} onHide={() => setShowInfo(false)} centered dir="rtl" className="ghazal-info-modal" backdropClassName="ai-modal-backdrop">
                <Modal.Header style={{ backgroundColor: '#1fb6a6', color: '#fff', borderBottom: 'none' }}>
                    <Modal.Title style={{ fontWeight: 'bold', margin: 0, fontSize: '1.2rem' }}>🌸 دليلك للحديث مع غزل</Modal.Title>
                    <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', outline: 'none', position: 'absolute', left: '15px' }}>×</button>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#fdfbf9', color: '#2d3436' }}>
                    <p style={{ fontSize: '15px', lineHeight: '1.6', fontWeight: 'bold', color: '#168a7d' }}>
                        مرحباً بكِ في غرام سلطان بيوتي سنتر! 💖<br />
                        <span style={{ fontWeight: 'normal', color: '#555' }}><strong>غزل</strong> هي مساعدة خدمة العملاء الذكية الخاصة بالسنتر، تم تصميمها للرد على كافة استفساراتك فوراً وعلى طوال أيام الأسبوع.</span>
                    </p>
                    
                    <hr style={{ borderColor: '#e1e2e6' }} />

                    <h6 style={{ color: '#1fb6a6', fontWeight: 'bold' }}>✨ ما يمكن لـ "غزل" فعله من أجلك:</h6>
                    <ul style={{ fontSize: '14.5px', lineHeight: '1.7', paddingRight: '20px', color: '#444' }}>
                        <li><strong>استعراض الأسعار والخدمات:</strong> الاستفسار عن باكدجات الميك أب (سبيشيال، أورجنال، خطوبة)، وأسعار فرد وعلاج الشعر (البروتين والفيلر).</li>
                        <li><strong>سياسات المركز:</strong> الاستفسار عن مواعيد العمل (9 ص لـ 9 م)، سياسة المرافقين، ومواعيد تجهيزات الزفاف قبل المناسبة.</li>
                        <li><strong>معلومات الأقسام:</strong> الاستفسار عن جلسات التقشير، تنظيف البشرة (الهارد والسوفت)، وجلسات الديتوكس، وأسعار التصوير.</li>
                        <li><strong>إدارة الحجوزات:</strong> المساعدة في معرفة حالة الحجز وتفاصيله بمجرد إعطائها (رقم الوصل أو رقم الهاتف).</li>
                    </ul>

                    <hr style={{ borderColor: '#e1e2e6' }} />

                    <h6 style={{ color: '#1fb6a6', fontWeight: 'bold' }}>💡 نصائح لتجربة أسرع:</h6>
                    <ul style={{ fontSize: '14.5px', lineHeight: '1.7', paddingRight: '20px', color: '#444' }}>
                        <li>اسألي غزل بشكل مباشر (مثال: <span style={{ color: '#e84118' }}>"بكام باكدج الميك أب السبيشيال؟"</span> أو <span style={{ color: '#e84118' }}>"إيه أسعار تنظيف البشرة؟"</span>).</li>
                        <li>يمكنك <strong>تسجيل استفسارك صوتياً</strong> بالضغط على علامة المايك 🎤، وستقوم غزل بالرد عليكِ صوتياً أيضاً!</li>
                        <li>يمكنك أيضاً <strong>الاتصال بغزل صوتياً مباشرة</strong> بالضغط على أيقونة الهاتف 📞 في الأعلى!</li>
                        <li>لتأكيد الحجوزات أو تغيير المواعيد، يتم عبر الواتساب أو الرقم الأرضي.</li>
                    </ul>

                </Modal.Body>
                <Modal.Footer style={{ backgroundColor: '#fdfbf9', borderTop: '1px solid #e1e2e6', justifyContent: 'center' }}>
                    <Button variant="primary" onClick={() => setShowInfo(false)} style={{ backgroundColor: '#1fb6a6', border: 'none', fontWeight: 'bold', padding: '8px 24px', borderRadius: '20px' }}>
                        تحدثي مع غزل الآن
                    </Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                @keyframes floatIn { 
                    from { opacity: 0; transform: translateY(30px) scale(0.9); } 
                    to { opacity: 1; transform: translateY(0) scale(1); } 
                }
                .typing-dot { 
                    display: inline-block; 
                    width: 6px; 
                    height: 6px; 
                    margin: 0 2px; 
                    background: #1fb6a6; 
                    border-radius: 50%; 
                    animation: typing 1.4s infinite ease-in-out both; 
                }
                .typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .typing-dot:nth-child(2) { animation-delay: -0.16s; }
                @keyframes typing { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.1); opacity: 1; } }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
                .chat-link-btn {
                    display: inline-flex;
                    align-items: center;
                    background: linear-gradient(135deg, #1fb6a6, #168a7d);
                    color: #fff !important;
                    padding: 8px 16px;
                    border-radius: 12px;
                    text-decoration: none;
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin: 8px 4px;
                    box-shadow: 0 4px 10px rgba(31,182,166,0.3);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .chat-link-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(31,182,166,0.4);
                }
                
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #d0d0d0; }
                
                .ghazal-info-modal {
                    z-index: 10005 !important;
                }
                .ai-modal-backdrop {
                    z-index: 10000 !important;
                }
            `}</style>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        bottom: '95px',
        left: '25px',
        zIndex: 2000,
        animation: 'floatIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards',
    },
    container: {
        width: '380px',
        height: '550px',
        maxWidth: 'calc(100vw - 50px)',
        maxHeight: 'calc(100vh - 130px)',
        backgroundColor: '#fdfbf9',
        borderRadius: '28px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Tajawal', sans-serif"
    },
    header: {
        background: 'linear-gradient(135deg, #1fb6a6 0%, #168a7d 100%)',
        color: '#fff',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative'
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
    },
    avatarWrapper: {
        position: 'relative',
        width: '44px',
        height: '44px',
        borderRadius: '15px',
        backgroundColor: '#fff',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    },
    onlineBadge: {
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: '#4cd137',
        border: '2px solid #1fb6a6'
    },
    headerMainText: {
        fontWeight: '800',
        fontSize: '1.05rem',
        letterSpacing: '0.2px'
    },
    headerSubText: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.85)',
        marginTop: '2px'
    },
    infoBtn: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        color: '#fff',
        fontSize: '1rem',
        cursor: 'pointer',
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        backdropFilter: 'blur(5px)'
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        color: '#fff',
        fontSize: '1rem',
        cursor: 'pointer',
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        backdropFilter: 'blur(5px)'
    },
    chatBox: {
        flex: 1,
        padding: '24px 20px',
        overflowY: 'auto',
        backgroundColor: '#fdfbf9',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    historyLoader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '40px 0',
    },
    messageRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px',
        width: '100%'
    },
    botIconWrapper: {
        width: '30px',
        height: '30px',
        borderRadius: '10px',
        backgroundColor: '#fff',
        border: '1px solid #efefef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden'
    },
    botIcon: {
        width: '80%',
        height: '80%',
        objectFit: 'contain'
    },
    bubble: {
        padding: '14px 18px',
        borderRadius: '20px',
        lineHeight: '1.6',
        fontSize: '0.92rem',
        maxWidth: '80%',
        whiteSpace: 'pre-wrap',
        transition: 'all 0.3s ease',
        border: '1px solid #ececec'
    },
    typingIndicator: {
        display: 'flex',
        alignItems: 'center',
        height: '20px'
    },
    inputArea: {
        padding: '16px 20px 24px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0'
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f1f2f6',
        borderRadius: '20px',
        padding: '4px 6px 4px 6px',
        border: '1px solid #e1e2e6',
        transition: 'all 0.3s ease'
    },
    micBtn: {
        background: 'none',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    input: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '0.95rem',
        backgroundColor: 'transparent',
        padding: '10px 0',
        color: '#2f3542',
        fontFamily: 'inherit'
    },
    sendBtn: {
        backgroundColor: '#1fb6a6',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        width: '42px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    },
    voicePlayBtn: {
        background: '#f1f2f6',
        color: '#168a7d',
        border: 'none',
        borderRadius: '12px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: '600',
        transition: 'all 0.2s',
        width: 'fit-content'
    }
};
