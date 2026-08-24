import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../App';
import { Shield, Play, Square, Sliders, Cpu, Activity, AlertTriangle, RefreshCw } from 'lucide-react';

interface DebugPayload {
  timestamp: string;
  risk_score: number;
  ai_probability: number;
  language: string;
  language_confidence: number;
  speaker_similarity: number | null;
  risk_level: string;
  evidence: string[];
  explainability_report: string;
  context_detected: string | null;
  status: string;
  debug?: {
    model_version: string;
    sample_rate: number;
    channels: number;
    window_size: number;
    rms_energy: number;
    processing_latency_ms: number;
  };
}

export default function DebugML() {
  const { session } = useContext(AuthContext);
  const [isActive, setIsActive] = useState(false);
  const [liveData, setLiveData] = useState<Partial<DebugPayload>>({});
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [logConsole, setLogConsole] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const startDebugSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const wsUrl = `ws://localhost:8000/ws/live-analysis?token=${session?.token || ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsActive(true);
        addLog("[WebSocket] Connection established. Initializing audio capture...");
        initAudioCapture(stream);
      };

      ws.onmessage = (event) => {
        const payload: DebugPayload = JSON.parse(event.data);
        setLiveData(payload);
        
        if (payload.debug?.processing_latency_ms) {
          setLatencyHistory(prev => [...prev, payload.debug!.processing_latency_ms].slice(-20));
        }
        
        addLog(
          `[Telemetry] Frame received: Risk=${payload.risk_score}%, AI_Prob=${payload.ai_probability}, Lang=${payload.language} (${Math.round(payload.language_confidence * 100)}%)`
        );
      };

      ws.onclose = () => {
        addLog("[WebSocket] Connection terminated.");
        cleanupAudio();
        setIsActive(false);
      };

      ws.onerror = (err) => {
        addLog(`[WebSocket] Connection error.`);
        cleanupAudio();
        setIsActive(false);
      };

    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopDebugSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const initAudioCapture = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        wsRef.current.send(inputData.buffer);
      }
    };
  };

  const cleanupAudio = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogConsole(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  if (session?.role !== 'ADMIN') {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center text-zinc-400">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto animate-bounce" />
          <h1 className="text-xl font-bold font-mono text-white">ACCESS DENIED</h1>
          <p className="text-sm">You must have administrative privileges to access this console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-950 min-h-screen text-zinc-300 font-sans space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-white font-mono flex items-center space-x-3">
            <Cpu className="text-red-500 h-6 w-6" />
            <span>ML DIAGNOSTIC CONSOLE</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">Real-time Model Coefficients & Signal telemetry (v1.0.0)</p>
        </div>
        <div className="flex items-center space-x-3">
          {!isActive ? (
            <button
              onClick={startDebugSession}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors font-mono"
            >
              <Play className="h-4 w-4" />
              <span>START DEB-STREAM</span>
            </button>
          ) : (
            <button
              onClick={stopDebugSession}
              className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded text-sm transition-colors border border-zinc-750 font-mono"
            >
              <Square className="h-4 w-4" />
              <span>TERMINATE STREAM</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ML Signal Specs */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 font-mono flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-red-500" />
            <span>Inference Pipeline Config</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">MODEL VERSION</span>
              <span className="text-white text-sm font-semibold">{liveData.debug?.model_version || "voiceguard-v1.0"}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">SAMPLE RATE</span>
              <span className="text-white text-sm font-semibold">{liveData.debug?.sample_rate ? `${liveData.debug.sample_rate} Hz` : "16000 Hz"}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">CHANNELS</span>
              <span className="text-white text-sm font-semibold">{liveData.debug?.channels || "1 (Mono)"}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">WINDOW SIZE</span>
              <span className="text-white text-sm font-semibold">{liveData.debug?.window_size ? `${liveData.debug.window_size} frames` : "48000 frames (3.0s)"}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">SIGNAL ENERGY (RMS)</span>
              <span className="text-white text-sm font-semibold">{(liveData.debug?.rms_energy || 0.0).toFixed(6)}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">PIPELINE STATUS</span>
              <span className={`text-xs px-2 py-0.5 rounded border inline-block mt-1 font-semibold font-mono ${
                liveData.status === 'CONFIDENT' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                liveData.status === 'COLLECTING' ? 'bg-amber-950 text-amber-400 border-amber-900 animate-pulse' :
                'bg-zinc-950 text-zinc-500 border-zinc-800'
              }`}>{liveData.status || "IDLE"}</span>
            </div>
          </div>
        </div>

        {/* Telemetry Scores */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 font-mono flex items-center space-x-2">
            <Activity className="h-4 w-4 text-red-500" />
            <span>Raw ML Probability Matrix</span>
          </h2>
          
          <div className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">CALIBRATED AI PROBABILITY</span>
                <span className="text-white">{Math.round((liveData.ai_probability || 0) * 100)}%</span>
              </div>
              <div className="h-2 bg-zinc-950 rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(liveData.ai_probability || 0) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">COMPOSITE RISK</span>
                <span className={`text-sm font-bold ${
                  liveData.risk_score && liveData.risk_score >= 61 ? 'text-red-500' : 'text-zinc-300'
                }`}>{liveData.risk_score || 0} / 100</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">SPEAKER CO-SIMILARITY</span>
                <span className="text-white text-sm font-bold">
                  {liveData.speaker_similarity != null ? `${Math.round(liveData.speaker_similarity * 100)}%` : "N/A"}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 block">LANGUAGE ID LOGITS</span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-white text-xs uppercase font-bold">{liveData.language || "Unknown"}</span>
                <span className="text-zinc-400 text-xs font-semibold">{(liveData.language_confidence || 0.0).toFixed(2)} confidence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Latency */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 font-mono flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-red-500" />
            <span>Telemetry Latency Metrics</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-500">LAST INFERENCE DELAY</span>
              <span className="text-red-400 font-bold text-sm">{liveData.debug?.processing_latency_ms || "18.0"} ms</span>
            </div>
            
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 h-28 flex items-end justify-between space-x-1">
              {latencyHistory.map((val, idx) => (
                <div 
                  key={idx}
                  className="bg-red-500/70 w-full hover:bg-red-500 transition-colors"
                  style={{ height: `${Math.min(val * 2, 100)}%` }}
                  title={`${val.toFixed(1)} ms`}
                />
              ))}
              {latencyHistory.length === 0 && (
                <span className="text-[10px] text-zinc-600 font-mono w-full text-center pb-8">No latency data gathered</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Log console terminal */}
      <div className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 font-mono flex items-center space-x-2">
          <span>Telemetry Event Log Console</span>
        </h2>
        <div className="bg-zinc-950 p-4 rounded border border-zinc-850 h-64 overflow-y-auto font-mono text-xs space-y-2 select-text">
          {logConsole.map((log, idx) => (
            <div key={idx} className="text-zinc-400 border-l border-zinc-800 pl-3">
              {log}
            </div>
          ))}
          {logConsole.length === 0 && (
            <span className="text-zinc-600 block text-center pt-24">No stream events logged. Click "Start Deb-Stream" to connect.</span>
          )}
        </div>
      </div>

    </div>
  );
}
