import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../App';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Pause, 
  Info, 
  AlertOctagon, 
  CheckCircle2, 
  Activity,
  UserCheck,
  Globe,
  Settings2,
  PhoneCall,
  KeyRound,
  UserCog,
  X
} from 'lucide-react';

interface LiveScoreResponse {
  risk_score: number;
  ai_probability: number;
  language: string;
  language_confidence: number;
  speaker_similarity: number | null;
  risk_level: string;
  evidence: string[];
  explainability_report: string;
  context_detected: string | null;
}

interface SpeakerProfile {
  id: string;
  name: string;
}

function LiveAnalysis() {
  const { session } = useContext(AuthContext);
  
  // Controls state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // Settings selection
  const [speakerProfiles, setSpeakerProfiles] = useState<SpeakerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  
  // Enriched Metadata variables
  const [callOrigin, setCallOrigin] = useState('local_carrier');
  const [isKnownContact, setIsKnownContact] = useState(true);
  const [historicalFraud, setHistoricalFraud] = useState(false);
  const [transactionValue, setTransactionValue] = useState(0);

  // Action Center Modal
  const [showActionCenter, setShowActionCenter] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [callbackStatus, setCallbackStatus] = useState<'idle' | 'calling' | 'done'>('idle');
  const [escalateStatus, setEscalateStatus] = useState<'idle' | 'escalated'>('idle');
  
  // Real-time ML metrics
  const [liveData, setLiveData] = useState<LiveScoreResponse>({
    risk_score: 0,
    ai_probability: 0.0,
    language: 'en',
    language_confidence: 1.0,
    speaker_similarity: null,
    risk_level: 'LOW',
    evidence: [],
    explainability_report: 'System standing by. Click Start to begin voice analysis.',
    context_detected: null
  });

  // Time-series timeline for chart
  const [timeline, setTimeline] = useState<{ time: string; risk: number }[]>([]);
  const timelineCounterRef = useRef(0);

  // Audio Context and Websocket Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const canvasAnimRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const languageNames: Record<string, string> = {
    hi: 'Hindi', en: 'English', mr: 'Marathi', bn: 'Bengali',
    ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
    gu: 'Gujarati', pa: 'Punjabi', ur: 'Urdu'
  };

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Load Speaker Profiles
  useEffect(() => {
    if (session) {
      fetch(`${backendUrl}/api/speaker/profiles`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      })
      .then(res => res.json())
      .then(data => setSpeakerProfiles(data))
      .catch(err => console.log('Error loading speaker profiles', err));
    }
  }, [session]);

  // Duration Timer
  useEffect(() => {
    if (isActive && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isActive, isPaused]);

  // Auto-open/close Action Center based on risk score threshold
  useEffect(() => {
    if (isActive && liveData.risk_score >= 61) {
      setShowActionCenter(true);
    } else if (liveData.risk_score < 61) {
      setShowActionCenter(false);
    }
  }, [liveData.risk_score, isActive]);

  const startAnalysis = async () => {
    try {
      setTimeline([]);
      timelineCounterRef.current = 0;
      setSessionDuration(0);
      setShowActionCenter(false);
      setMfaStatus('idle');
      setCallbackStatus('idle');
      setEscalateStatus('idle');

      setLiveData({
        risk_score: 0,
        ai_probability: 0.0,
        language: 'en',
        language_confidence: 1.0,
        speaker_similarity: null,
        risk_level: 'LOW',
        evidence: [],
        explainability_report: 'Establishing secure websocket stream...',
        context_detected: null
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;

      const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const cleanHost = backendUrl.replace(/^https?:\/\//, '');
      
      // Build dynamic WebSocket URL with enriched metadata
      const wsUrl = `${wsProto}://${cleanHost}/ws/live-analysis?token=${session?.token}` + 
        `${selectedProfileId ? `&speaker_profile_id=${selectedProfileId}` : ''}` +
        `&call_origin=${callOrigin}` +
        `&is_known_contact=${isKnownContact}` +
        `&historical_fraud=${historicalFraud}` +
        `&transaction_value=${transactionValue}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsActive(true);
        setIsPaused(false);
        setIsMuted(false);
        initAudioCapture(stream);
      };

      ws.onmessage = (event) => {
        const payload: LiveScoreResponse = JSON.parse(event.data);
        setLiveData(payload);
        
        setTimeline(prev => {
          const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const updated = [...prev, { time: nextTime, risk: payload.risk_score }];
          return updated.slice(-15);
        });
      };

      ws.onclose = () => {
        cleanupAudio();
      };

      ws.onerror = (err) => {
        console.error(err);
        setLiveData(prev => ({ ...prev, explainability_report: 'WebSocket connection error.' }));
        cleanupAudio();
      };

    } catch (err: any) {
      alert('Microphone permission denied.');
      console.error(err);
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

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    drawWaveform(analyser);

    processor.onaudioprocess = (e) => {
      if (isPaused || isMuted) return;
      const pcmFloat32 = e.inputBuffer.getChannelData(0);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcmFloat32.buffer);
      }
    };
  };

  const drawWaveform = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive) return;
      canvasAnimRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = liveData.risk_score >= 61 ? '#ef4444' : '#10b981';
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  const stopAnalysis = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanupAudio();
    setIsActive(false);
  };

  const cleanupAudio = () => {
    clearInterval(timerIntervalRef.current);
    if (canvasAnimRef.current) {
      cancelAnimationFrame(canvasAnimRef.current);
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };

  const triggerMfa = () => {
    setMfaStatus('sending');
    setTimeout(() => setMfaStatus('sent'), 1500);
  };

  const triggerCallback = () => {
    setCallbackStatus('calling');
    setTimeout(() => setCallbackStatus('done'), 2000);
  };

  const triggerEscalate = () => {
    setEscalateStatus('escalated');
  };

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getSeverityStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return { border: 'border-violet-600', text: 'text-violet-400', bg: 'bg-violet-950/20', badge: 'bg-violet-950 text-violet-400 border-violet-900/50' };
      case 'HIGH':
        return { border: 'border-red-600', text: 'text-red-400', bg: 'bg-red-950/20', badge: 'bg-red-950 text-red-400 border-red-900/50' };
      case 'MEDIUM':
        return { border: 'border-amber-600', text: 'text-amber-400', bg: 'bg-amber-950/20', badge: 'bg-amber-950 text-amber-400 border-amber-900/50' };
      default:
        return { border: 'border-emerald-600', text: 'text-emerald-400', bg: 'bg-emerald-950/20', badge: 'bg-emerald-950 text-emerald-400 border-emerald-900/50' };
    }
  };

  const severity = getSeverityStyle(liveData.risk_level);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto relative">
      
      {/* Critical Action Center Modal Popup */}
      {showActionCenter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-red-600/50 w-full max-w-lg p-6 rounded-lg shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowActionCenter(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 text-red-500 border-b border-zinc-800 pb-3">
              <AlertOctagon className="h-6 w-6 animate-pulse" />
              <h2 className="text-md font-bold font-mono tracking-wider">CRITICAL IMPERSONATION ALERT</h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              The VOICEGUARD ML model has flagged this stream as a potential AI Voice Clone (100% Spoof Probability). 
              <strong> Recommend stopping the transaction and executing secondary verification checks:</strong>
            </p>

            {/* Action buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Callback */}
              <button
                onClick={triggerCallback}
                className={`flex flex-col items-center justify-center p-4 rounded border font-mono text-xs transition ${callbackStatus === 'done' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-700'}`}
              >
                <PhoneCall className="h-5 w-5 mb-2 text-red-500" />
                <span>{callbackStatus === 'idle' ? 'Force Callback' : (callbackStatus === 'calling' ? 'Calling...' : 'Callback Sent')}</span>
              </button>

              {/* MFA OTP */}
              <button
                onClick={triggerMfa}
                className={`flex flex-col items-center justify-center p-4 rounded border font-mono text-xs transition ${mfaStatus === 'sent' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-700'}`}
              >
                <KeyRound className="h-5 w-5 mb-2 text-red-500" />
                <span>{mfaStatus === 'idle' ? 'Send MFA OTP' : (mfaStatus === 'sending' ? 'Sending...' : 'MFA OTP Sent')}</span>
              </button>

              {/* Escalate */}
              <button
                onClick={triggerEscalate}
                className={`flex flex-col items-center justify-center p-4 rounded border font-mono text-xs transition ${escalateStatus === 'escalated' ? 'bg-violet-950/20 border-violet-900/50 text-violet-400' : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-700'}`}
              >
                <UserCog className="h-5 w-5 mb-2 text-red-500" />
                <span>{escalateStatus === 'idle' ? 'Escalate Supervisor' : 'Escalated'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowActionCenter(false)}
                className="px-4 py-1.5 bg-zinc-850 border border-zinc-700 text-zinc-300 text-xs font-mono rounded hover:bg-zinc-800"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wider text-white">LIVE SPEECH SECURITY AUDIT</h1>
          <p className="text-xs text-zinc-500 font-mono">Enriched contextual metadata feeds for anti-spoofing verification.</p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-red-500 animate-flash' : 'bg-zinc-600'}`} />
            <span className="text-xs font-semibold font-mono tracking-wide text-zinc-300">
              {isActive ? 'STATUS: ACTIVE MONITORING' : 'STATUS: STANDBY'}
            </span>
          </div>

          <div className="text-sm font-semibold font-mono text-zinc-400">
            TIME ELAPSED: {formatDuration(sessionDuration)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Risk & Metadata Parameter controls */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Settings & Ingestion parameters Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-500 flex items-center space-x-2">
              <Settings2 className="h-4 w-4 text-red-500" />
              <span>Context & Metadata Ingestion</span>
            </h2>
            
            {/* Call origin dropdown */}
            <div>
              <label className="block text-[10px] text-zinc-500 font-mono mb-1">CALL ORIGIN</label>
              <select
                disabled={isActive}
                value={callOrigin}
                onChange={(e) => setCallOrigin(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 outline-none font-mono"
              >
                <option value="local_carrier">Local Telephone Trunk (GSM)</option>
                <option value="domestic_voip">Domestic VoIP Gateway</option>
                <option value="international_voip">International VoIP Trunk (HIGH RISK)</option>
              </select>
            </div>

            {/* Known contact toggle */}
            <div className="flex justify-between items-center py-1">
              <label className="text-[10px] text-zinc-500 font-mono">KNOWN SECURE CONTACT</label>
              <button
                disabled={isActive}
                onClick={() => setIsKnownContact(!isKnownContact)}
                className={`px-3 py-1 rounded text-[10px] font-mono border transition ${isKnownContact ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-red-950/20 text-red-400 border-red-900/50'}`}
              >
                {isKnownContact ? 'TRUSTED CONTACT' : 'UNKNOWN CALLER'}
              </button>
            </div>

            {/* Historical fraud flag toggle */}
            <div className="flex justify-between items-center py-1">
              <label className="text-[10px] text-zinc-500 font-mono">HISTORICAL FRAUD DETECTED</label>
              <button
                disabled={isActive}
                onClick={() => setHistoricalFraud(!historicalFraud)}
                className={`px-3 py-1 rounded text-[10px] font-mono border transition ${historicalFraud ? 'bg-red-950/20 text-red-400 border-red-900/50 animate-pulse' : 'bg-zinc-950 text-zinc-500 border-zinc-850'}`}
              >
                {historicalFraud ? 'FLAGGED FOR SPOOF' : 'CLEAN FILE'}
              </button>
            </div>

            {/* Transaction value input */}
            <div>
              <label className="block text-[10px] text-zinc-500 font-mono mb-1">TRANSACTION VALUE (INR)</label>
              <input
                type="number"
                disabled={isActive}
                value={transactionValue}
                onChange={(e) => setTransactionValue(parseFloat(e.target.value) || 0)}
                placeholder="₹ Amount size"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded text-xs text-zinc-300 outline-none font-mono"
              />
            </div>

            {/* Speaker Reference Selection */}
            <div className="pt-2">
              <label className="block text-[10px] text-zinc-500 font-mono mb-1">REFERENCE SPEAKER EMBEDDING</label>
              <select
                disabled={isActive}
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 outline-none font-mono"
              >
                <option value="">Acoustic Verification Only</option>
                {speakerProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col space-y-3">
              {!isActive ? (
                <button
                  onClick={startAnalysis}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Live Ingestion</span>
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className={`flex items-center justify-center space-x-2 py-2 rounded text-xs border border-zinc-700 font-medium transition ${isPaused ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                    >
                      <Pause className="h-4 w-4" />
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex items-center justify-center space-x-2 py-2 rounded text-xs border border-zinc-700 font-medium transition ${isMuted ? 'bg-red-950/20 text-red-400 border-red-900/50' : 'bg-zinc-800 text-zinc-300'}`}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                  </div>

                  <button
                    onClick={stopAnalysis}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded font-medium text-sm transition"
                  >
                    <Square className="h-4 w-4" />
                    <span>Terminate Session</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Risk Gauge */}
          <div className={`bg-zinc-900 border ${severity.border} rounded p-6 transition-all duration-300`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-400">Risk Assessment</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${severity.badge}`}>
                {liveData.risk_level}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-6 relative">
              <svg className="w-36 h-36">
                <circle className="text-zinc-850" strokeWidth="8" stroke="currentColor" fill="transparent" r="64" cx="72" cy="72" />
                <circle
                  className={liveData.risk_score >= 61 ? "text-red-500" : (liveData.risk_score >= 31 ? "text-amber-500" : "text-emerald-500")}
                  strokeWidth="8"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * liveData.risk_score) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="64"
                  cx="72"
                  cy="72"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono tracking-tight text-white">{liveData.risk_score}%</span>
                <span className="text-[10px] uppercase font-mono text-zinc-500">RISK INDEX</span>
              </div>
            </div>
          </div>

        </div>

        {/* Center/Right Columns: Waveform, Charts, Evidence */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Waveform and Live Timeline chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4 flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Acoustic Waveform & Risk Timeline</span>
            </h2>

            <div className="h-28 w-full bg-zinc-950 rounded border border-zinc-850 overflow-hidden mb-6">
              <canvas ref={canvasRef} width="600" height="112" className="w-full h-full" />
            </div>

            <div className="h-44 w-full bg-zinc-900 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} style={{ fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Context, Language, and Evidence details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Signal Details */}
            <div className="space-y-6">
              {/* Language ID */}
              <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-3 flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Language Identification</span>
                </h3>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold font-mono text-white">
                    {languageNames[liveData.language] || liveData.language}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    CONFIDENCE: {Math.round(liveData.language_confidence * 100)}%
                  </span>
                </div>
                
                <div className="w-full bg-zinc-950 h-2 rounded overflow-hidden">
                  <div 
                    className="bg-red-500 h-full transition-all duration-300" 
                    style={{ width: `${liveData.language_confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Speaker Similarity */}
              <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-3 flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Speaker Similarity Profile</span>
                </h3>

                {liveData.speaker_similarity !== null ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold font-mono text-white">
                        {Math.round(liveData.speaker_similarity * 100)}%
                      </span>
                      <span className={`text-xs font-mono ${liveData.speaker_similarity >= 0.80 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {liveData.speaker_similarity >= 0.80 ? 'AUTHENTICATION PASSED' : 'SECURITY WARNING'}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-950 h-2 rounded overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${liveData.speaker_similarity >= 0.80 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                        style={{ width: `${liveData.speaker_similarity * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 py-2 text-zinc-500 text-xs font-mono">
                    <Info className="h-4 w-4" />
                    <span>Cross-comparison disabled. Select reference key.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence & Action recommendations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4">Forensic Evidence Indicators</h3>
                
                <div className="space-y-2">
                  {liveData.evidence.length > 0 ? (
                    liveData.evidence.map((ev, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-red-950/20 border border-red-900/40 px-3 py-1.5 rounded text-xs font-mono text-red-400">
                        <AlertOctagon className="h-4 w-4 text-red-500 shrink-0" />
                        <span>{ev.toUpperCase().replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-900/40 px-3 py-1.5 rounded text-xs font-mono text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>NO ACOUSTIC ANOMALIES DETECTED</span>
                    </div>
                  )}

                  {liveData.context_detected && (
                    <div className="flex items-center space-x-2 bg-violet-950/20 border border-violet-900/40 px-3 py-1.5 rounded text-xs font-mono text-violet-400">
                      <AlertOctagon className="h-4 w-4 text-violet-500 shrink-0 animate-pulse" />
                      <span>FRAUD KEYWORD SPOTTED: {liveData.context_detected.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-4 mt-6">
                <h4 className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Recommended Response Action</h4>
                <p className="text-xs text-zinc-300">
                  {liveData.risk_score >= 61 
                    ? 'CRITICAL IDENTITY ATTACK WARNING: Force secondary validation verification challenges via the Action Center.'
                    : 'Acoustic integrity is verified. Follow standard communication procedures.'
                  }
                </p>
              </div>

            </div>

          </div>

          {/* Explainability Report */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-2">Model Explanation Details (XAI)</h3>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-850 font-mono text-xs text-zinc-400 leading-relaxed max-h-24 overflow-y-auto">
              {liveData.explainability_report}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default LiveAnalysis;
