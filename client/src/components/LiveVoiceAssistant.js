/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faTimes } from '@fortawesome/free-solid-svg-icons';
import './LiveVoiceAssistant.css';

const getSessionId = () => {
  let sid = localStorage.getItem('guestSessionId');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guestSessionId', sid);
  }
  return sid;
};

// Utilities for Audio conversion
function float32To16BitPCMBase64(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  // process in chunks to avoid max call stack
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

export default function LiveVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('انقر للبدء');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const orbRef = useRef(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const playbackContextRef = useRef(null);
  
  // Audio playback queue
  const nextPlayTimeRef = useRef(0);

  const startInteraction = async () => {
    setIsOpen(true);
    setStatus('جاري الاتصال بغزل...');
    
    try {
      const sid = getSessionId();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-audio?sessionId=${sid}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('جاهزة أسمعك يا قمر...');
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
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 500); // UI toggle
          }

          if (data.serverContent?.turnComplete) {
            setIsSpeaking(false);
          }
        } catch (err) {
          console.error("Parse WS error", err);
        }
      };

      ws.onclose = () => {
        if (isOpen) {
          setStatus('انقطع الاتصال');
          stopInteraction();
        }
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
      // Deprecated but highly standard for raw PCM 
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32Array = e.inputBuffer.getChannelData(0);
        
        // Visiualizer bounce logic
        let sum = 0;
        for (let i = 0; i < float32Array.length; i++) sum += Math.abs(float32Array[i]);
        const avg = sum / float32Array.length;
        if (orbRef.current && !isSpeaking) {
          orbRef.current.style.transform = `scale(${1 + avg * 2})`;
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
       // Gemini Live responds in 24kHz
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const float32Array = base64ToFloat32Array(base64);
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule seamlessly
    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const stopInteraction = () => {
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
  };

  return (
    <>
      {!isOpen && (
        <div className="live-voice-floater pulse" onClick={startInteraction} title="تحدث مع غزل الآن">
          <FontAwesomeIcon icon={faMicrophone} />
        </div>
      )}

      {isOpen && (
        <div className="live-voice-modal-overlay">
          <button className="close-btn" onClick={stopInteraction}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
          
          <div className="ai-orb-container">
            <div 
              ref={orbRef} 
              className={`ai-orb ${isSpeaking ? 'speaking' : ''}`}
            />
          </div>
          
          <h2 className="status-text">{status}</h2>
          
          <div className="gemini-logo">Powered by Gemini 3.1 Flash Live</div>
        </div>
      )}
    </>
  );
}
