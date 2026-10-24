import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Send, Volume2, Wrench, Sparkles, Database } from 'lucide-react';
import { sendAgentTurn } from '../services/api';

export default function VoiceAgentModal({ isOpen, onClose, defaultUnit = 'UNIT-27' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [toolsCalled, setToolsCalled] = useState([]);
  const [retrievedCases, setRetrievedCases] = useState(0);
  const [audioBase64, setAudioBase64] = useState(null);
  const [latency, setLatency] = useState(null);
  const [sessionId] = useState(() => `sess_ui_${Date.now()}`);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(new Audio());

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Start browser audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioTurn(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access unavailable, defaulting to text input:', err.message);
      setIsRecording(false);
      setTranscript('Microphone access denied or unavailable. Type your command below.');
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process audio turn
  const processAudioTurn = async (audioBlob) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        await handleAgentTurn({
          audio: base64Audio,
          audioMime: 'audio/webm',
        });
      };
    } catch (err) {
      setAgentResponse(`Error processing audio: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Process text submit turn
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');
    setTranscript(userText);
    await handleAgentTurn({ text: userText });
  };

  // Common turn call to backend agent endpoint
  const handleAgentTurn = async (extraPayload) => {
    setIsLoading(true);
    setToolsCalled([]);
    setAudioBase64(null);

    try {
      const data = await sendAgentTurn({
        sessionId,
        equipmentId: defaultUnit,
        shift: 'morning',
        ...extraPayload,
      });

      if (data.success) {
        setTranscript(data.transcript || extraPayload.text || 'Voice command processed');
        setAgentResponse(data.reply);
        setToolsCalled(data.toolsCalled || []);
        setRetrievedCases(data.retrievedCases || 0);
        setLatency(data.latency);

        // Play returned Rime TTS audio if present
        if (data.audioBase64) {
          setAudioBase64(data.audioBase64);
          const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
          audioPlayerRef.current.src = audioSrc;
          audioPlayerRef.current.play().catch((e) => console.warn('Autoplay blocked:', e));
        }
      } else {
        setAgentResponse(`Agent Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setAgentResponse(`Communication failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = () => {
    if (audioBase64 && audioPlayerRef.current) {
      audioPlayerRef.current.play();
    }
  };

  return (
    <div className="voice-agent-overlay" onClick={onClose}>
      <div className="voice-agent-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="voice-agent-header">
          <div className="voice-agent-title">
            <Sparkles size={24} color="#FFF" />
            <div>
              <h3>FieldNote AI Voice Agent</h3>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                Context: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{defaultUnit}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#FFF', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="voice-agent-body">
          {/* Soundwave animation container */}
          <div className={`soundwave-visualizer ${isRecording ? 'recording' : ''}`}>
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>

          {/* Big Mic recording button */}
          <div className="mic-control-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`mic-giant-btn ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? <Square size={28} /> : <Mic size={32} />}
            </button>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-muted)' }}>
              {isRecording ? 'Listening... Tap square to submit voice' : 'Tap mic to speak field note or query'}
            </div>
          </div>

          {/* User Transcript display */}
          {transcript && (
            <div style={{ background: '#F8FAF9', padding: '14px 18px', borderRadius: '16px', borderLeft: '4px solid var(--header-gold)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--clr-text-muted)', marginBottom: '4px' }}>
                You Spoke / Input:
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-text-main)' }}>
                "{transcript}"
              </div>
            </div>
          )}

          {/* Loading spinner state */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--header-gold-dark)', fontWeight: 600 }}>
              <Sparkles size={24} className="animate-spin" style={{ marginBottom: '8px' }} />
              <div>Gemini Reasoning Agent active...</div>
            </div>
          )}

          {/* Agent Response & Tools display */}
          {agentResponse && !isLoading && (
            <div style={{ background: '#FFF8EE', padding: '18px', borderRadius: '20px', border: '1px solid rgba(244, 165, 34, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--header-gold-dark)' }}>
                  FieldNote Agent Spoken Reply
                </div>
                {audioBase64 && (
                  <button onClick={playTTS} style={{ color: 'var(--header-gold-dark)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Volume2 size={16} /> Replay TTS
                  </button>
                )}
              </div>

              <div style={{ fontSize: '1rem', lineHeight: 1.5, color: 'var(--clr-text-main)', fontWeight: 500, marginBottom: '14px' }}>
                {agentResponse}
              </div>

              {/* Tools Called badges */}
              {toolsCalled.length > 0 && (
                <div className="tool-call-chips">
                  {toolsCalled.map((tool, idx) => (
                    <div key={idx} className="tool-chip">
                      <Wrench size={12} /> {tool}
                    </div>
                  ))}
                  {retrievedCases > 0 && (
                    <div className="tool-chip" style={{ background: '#E6F4EA', color: '#137333', borderColor: '#A8DADC' }}>
                      <Database size={12} /> {retrievedCases} Qdrant cases retrieved
                    </div>
                  )}
                </div>
              )}

              {/* Latency info */}
              {latency && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
                  Latency: {latency.total_ms}ms (Agent: {latency.agent_ms}ms | STT: {latency.stt_ms}ms | TTS: {latency.tts_ms}ms)
                </div>
              )}
            </div>
          )}

          {/* Text Input Fallback / Alternate Form */}
          <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Or type voice command or question here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ margin: 0 }}
            />
            <button type="submit" className="btn-primary-gold" style={{ width: 'auto', padding: '0 24px' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
