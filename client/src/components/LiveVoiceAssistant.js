/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import './LiveVoiceAssistant.css';

const getSessionId = () => {
  let sid = localStorage.getItem('guestSessionId');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guestSessionId', sid);
  }
  return sid;
};

// ── Audio Conversion Utilities ──
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
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
  </svg>
);

export default function LiveVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('انقر للتحدث مع غزل');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const orbRef = useRef(null);
  const timerRef = useRef(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const playbackContextRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  
  // Audio playback queue
  const nextPlayTimeRef = useRef(0);

  // Call duration timer
  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  const startInteraction = async () => {
    setIsOpen(true);
    setStatus('جاري الاتصال بغزل...');
    setIsRecording(false);
    setIsSpeaking(false);
    
    try {
      const sid = getSessionId();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-audio?sessionId=${sid}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('غزل جاهزة تسمعك... 🎤');
        setIsRecording(true);
        startTimer();
        await startMic(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'quota_exceeded') {
            setStatus('انتهت دقائقك الصوتية اليوم 😢');
            stopInteraction();
            return;
          }

          if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const base64Audio = data.serverContent.modelTurn.parts[0].inlineData.data;
            playAudioChunk(base64Audio);
            
            // Keep speaking state ON while chunks keep coming
            setIsSpeaking(true);
            setStatus('غزل بتتكلم... 💬');
            
            // Clear any pending timeout & set new one
            if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(() => {
              setIsSpeaking(false);
              setStatus('غزل جاهزة تسمعك... 🎤');
            }, 1200);
          }

          if (data.serverContent?.turnComplete) {
            // Give a small delay for last audio chunk to finish
            if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(() => {
              setIsSpeaking(false);
              setStatus('غزل جاهزة تسمعك... 🎤');
            }, 800);
          }
        } catch (err) {
          console.error("Parse WS error", err);
        }
      };

      ws.onclose = () => {
        setStatus('انقطع الاتصال');
        stopInteraction();
      };

    } catch (err) {
      setStatus('مفيش مايك!');
      console.error(err);
    }
  };

  const startMic = async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32Array = e.inputBuffer.getChannelData(0);
        
        // Orb visualizer — Respond to mic input level
        let sum = 0;
        for (let i = 0; i < float32Array.length; i++) sum += Math.abs(float32Array[i]);
        const avg = sum / float32Array.length;
        if (orbRef.current && !isSpeaking) {
          const scale = 1 + Math.min(avg * 3, 0.25);
          orbRef.current.style.transform = `scale(${scale})`;
        }

        const base64Data = float32To16BitPCMBase64(float32Array);
        
        const payload = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }]
          }
        };
        ws.send(JSON.stringify(payload));
      };

    } catch (err) {
      console.error(err);
      setStatus('رفضت صلاحية المايك!');
    }
  };

  const playAudioChunk = (base64) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const float32Array = base64ToFloat32Array(base64);
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const stopInteraction = () => {
    stopTimer();
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsOpen(false);
    setIsRecording(false);
    setIsSpeaking(false);
  };

  // Determine orb class
  const getOrbClass = () => {
    if (isSpeaking) return 'ai-orb speaking';
    if (isRecording) return 'ai-orb recording';
    return 'ai-orb';
  };

  return (
    <>
      {!isOpen && (
        <div className="live-voice-floater pulse" onClick={startInteraction} title="تحدث مع غزل صوتياً">
          <FontAwesomeIcon icon={faMicrophone} />
        </div>
      )}

      {isOpen && (
        <div className="live-voice-modal-overlay" dir="rtl">
          {/* Timer Badge */}
          <div className="voice-timer">
            <div className="timer-dot"></div>
            <span className="timer-text">{formatTime(callDuration)}</span>
          </div>

          {/* AI Orb with Logo */}
          <div className="ai-orb-container">
            <div className="ai-orb-ring"></div>
            <div className="ai-orb-ring"></div>
            <div className="ai-orb-ring"></div>
            <div 
              ref={orbRef} 
              className={getOrbClass()}
            >
              <img src="/logo.png" alt="غرام" className="orb-logo" />
            </div>
          </div>
          
          {/* Status */}
          <h2 className="voice-status-text">{status}</h2>
          
          {/* Hang Up Button */}
          <button className="hangup-btn" onClick={stopInteraction} title="إنهاء المكالمة">
            <HangUpIcon />
          </button>

          <div className="voice-powered-by">Powered by Gemini Live</div>
        </div>
      )}
    </>
  );
}
