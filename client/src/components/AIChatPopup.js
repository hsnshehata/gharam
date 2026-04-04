import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

const BOT_IMAGE = "https://i.ibb.co/7JJScM0Q/zain-ai.png";

export default function AIChatPopup({ onClose }) {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'أهلاً بكِ في غرام سلطان بيوتي سنتر! ✨ أنا غزل مساعدتكِ الذكية، كيف يمكنني مساعدتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

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
        // Simple formatter for **bold** and newlines
        return text.split('\n').map((line, i) => (
            <span key={i}>
                {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} style={{ color: '#168a7d' }}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
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
            const cleanMessages = newMessages.map(m => ({ role: m.role, text: m.text }));

            if (voiceBlob) {
                const formData = new FormData();
                formData.append('audio', voiceBlob, 'voice.webm');
                formData.append('messages', JSON.stringify(cleanMessages));
                res = await axios.post(`${API_BASE}/api/ai/chat`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await axios.post(`${API_BASE}/api/ai/chat`, { messages: cleanMessages });
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
            setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.' }]);
        } finally {
            setLoading(false);
        }
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
                {/* Header with Glassmorphism */}
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <div style={styles.avatarWrapper}>
                            <img src={BOT_IMAGE} alt="AI Avatar" style={styles.avatarImg} />
                            <div style={styles.onlineBadge}></div>
                        </div>
                        <div>
                            <div style={styles.headerMainText}>غزل المساعدة الذكية ✨</div>
                            <div style={styles.headerSubText}>تواصل فوري • ذكاء اصطناعي</div>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* Chat Area */}
                <div style={styles.chatBox}>
                    {messages.map((m, idx) => (
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
                    ))}

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
            </div>

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
                
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #d0d0d0; }
            `}</style>
        </div>
    );
}

const styles = {
    // ... items before inputWrapper
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
