import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../App';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, 
  Square, 
  Upload, 
  AlertOctagon, 
  CheckCircle2, 
  Activity,
  Globe,
  UserCheck,
  Settings2,
  PhoneCall,
  KeyRound,
  UserCog,
  X,
  ShieldCheck
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

function SimulatedCall() {
  const { session } = useContext(AuthContext);
  
  // Controls state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // Settings selection
  const [speakerProfiles, setSpeakerProfiles] = useState<SpeakerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  
  // Enriched Metadata variables
  const [callOrigin, setCallOrigin] = useState('unknown_voip'); // Default to high-risk voip
  const [isKnownContact, setIsKnownContact] = useState(false); // Unknown caller
  const [historicalFraud, setHistoricalFraud] = useState(true); // Flagged identity
  const [transactionValue, setTransactionValue] = useState(150000); // 1.5 Lakh INR

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
    explainability_report: 'System standing by. Upload a pre-recorded file and run call simulation.',
    context_detected: null
  });

  // Time-series timeline for chart
  const [timeline, setTimeline] = useState<{ time: string; risk: number }[]>([]);

  // Refs for audio processing and connection
  const wsRef = useRef<WebSocket | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextChunkTimeoutRef = useRef<any>(null);

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
      .catch(err => console.log('Error loading profiles', err));
    }
  }, [session]);

  // Duration Timer
  useEffect(() => {
    if (isSimulating) {
      timerIntervalRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isSimulating]);

  // Auto-open/close Action Center based on risk score threshold
  useEffect(() => {
    if (isSimulating && liveData.risk_score >= 61) {
      setShowActionCenter(true);
    } else if (liveData.risk_score < 61) {
      setShowActionCenter(false);
    }
  }, [liveData.risk_score, isSimulating]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const runSimulation = async () => {
    if (!selectedFile) {
      alert('Please upload an audio file to simulate first.');
      return;
    }

    try {
      setTimeline([]);
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
        explainability_report: 'Parsing audio and establishing streaming socket...',
        context_detected: null
      });

      // 1. Decode audio file locally to extract raw PCM Float32 samples
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0); // get mono channel

      // 2. Open WebSocket stream with enriched metadata query parameters
      const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const cleanHost = backendUrl.replace(/^https?:\/\//, '');
      
      const wsUrl = `${wsProto}://${cleanHost}/ws/live-analysis?token=${session?.token}&simulated=true` +
        `${selectedProfileId ? `&speaker_profile_id=${selectedProfileId}` : ''}` +
        `&call_origin=${callOrigin}` +
        `&is_known_contact=${isKnownContact}` +
        `&historical_fraud=${historicalFraud}` +
        `&transaction_value=${transactionValue}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsSimulating(true);
        streamPcmChunks(rawData);
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
        stopSimulation();
      };

      ws.onerror = (err) => {
        console.error(err);
        setLiveData(prev => ({ ...prev, explainability_report: 'Socket connection failed.' }));
        stopSimulation();
      };

    } catch (err) {
      alert('Error parsing audio file.');
      console.error(err);
    }
  };

  const streamPcmChunks = (pcmData: Float32Array) => {
    const chunkSize = 4096; // ~256ms chunk
    let offset = 0;

    const sendNextChunk = () => {
      if (!isSimulating || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      if (offset >= pcmData.length) {
        // Audio stream completed, terminate socket
        wsRef.current.close();
        setIsSimulating(false);
        return;
      }

      const chunk = pcmData.slice(offset, offset + chunkSize);
      wsRef.current.send(chunk.buffer);
      offset += chunkSize;

      // schedule next chunk in 256ms to replicate real-world 1x speed
      nextChunkTimeoutRef.current = setTimeout(sendNextChunk, 256);
    };

    sendNextChunk();
  };

  const stopSimulation = () => {
    clearTimeout(nextChunkTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsSimulating(false);
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
      
      {/* Action Center Modal Overlay */}
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
          <h1 className="text-xl font-bold font-mono tracking-wider text-white">TELEPHONY CALL SIMULATION</h1>
          <p className="text-xs text-zinc-500 font-mono">Stream pre-recorded file packets at 1x real-time speed over ingestion sockets.</p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
            <span className={`h-2 w-2 rounded-full ${isSimulating ? 'bg-red-500 animate-flash' : 'bg-zinc-600'}`} />
            <span className="text-xs font-semibold font-mono tracking-wide text-zinc-300">
              {isSimulating ? 'STATUS: INGESTING STREAM' : 'STATUS: STANDBY'}
            </span>
          </div>

          <div className="text-sm font-semibold font-mono text-zinc-400">
            ELAPSED TIME: {sessionDuration}s
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upload file & metadata parameters */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Uploader Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-2">Simulate File Packet</h2>
            
            {/* File drop area */}
            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded p-6 flex flex-col items-center justify-center cursor-pointer transition relative">
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isSimulating}
              />
              <Upload className="h-6 w-6 text-zinc-500 mb-2" />
              <span className="text-xs font-mono text-zinc-300 text-center truncate max-w-xs">
                {selectedFile ? selectedFile.name : 'Choose Audio File (.wav, .mp3, .ogg)'}
              </span>
            </div>

            {/* Accompanying settings */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center space-x-1.5">
                <Settings2 className="h-3 w-3 text-red-500" />
                <span>Simulation Parameters</span>
              </h3>

              {/* Call origin dropdown */}
              <div>
                <label className="block text-[9px] text-zinc-500 font-mono mb-1">CALL ORIGIN</label>
                <select
                  disabled={isSimulating}
                  value={callOrigin}
                  onChange={(e) => setCallOrigin(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 outline-none font-mono"
                >
                  <option value="local_carrier">Local Telephone Trunk (GSM)</option>
                  <option value="domestic_voip">Domestic VoIP Gateway</option>
                  <option value="unknown_voip">Unknown VoIP Tunnel (HIGH RISK)</option>
                  <option value="international_voip">International VoIP Route</option>
                </select>
              </div>

              {/* Known contact toggle */}
              <div className="flex justify-between items-center py-1">
                <label className="text-[9px] text-zinc-500 font-mono">CALL CREDENTIALS</label>
                <button
                  disabled={isSimulating}
                  onClick={() => setIsKnownContact(!isKnownContact)}
                  className={`px-2.5 py-0.5 rounded text-[9px] font-mono border transition ${isKnownContact ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-red-950/20 text-red-400 border-red-900/50'}`}
                >
                  {isKnownContact ? 'KNOWN IDENT' : 'UNKNOWN CALLER'}
                </button>
              </div>

              {/* Historical fraud flag toggle */}
              <div className="flex justify-between items-center py-1">
                <label className="text-[9px] text-zinc-500 font-mono">FRAUD TRUNK FLAG</label>
                <button
                  disabled={isSimulating}
                  onClick={() => setHistoricalFraud(!historicalFraud)}
                  className={`px-2.5 py-0.5 rounded text-[9px] font-mono border transition ${historicalFraud ? 'bg-red-950/20 text-red-400 border-red-900/50 animate-pulse' : 'bg-zinc-950 text-zinc-500 border-zinc-850'}`}
                >
                  {historicalFraud ? 'FLAGGED IDENTITY' : 'CLEAN IDENTITY'}
                </button>
              </div>

              {/* Transaction value input */}
              <div>
                <label className="block text-[9px] text-zinc-500 font-mono mb-1">TRANSACTION EXPOSURE SIZE (INR)</label>
                <input
                  type="number"
                  disabled={isSimulating}
                  value={transactionValue}
                  onChange={(e) => setTransactionValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 outline-none font-mono"
                />
              </div>

              {/* Speaker Reference Embed Selection */}
              <div>
                <label className="block text-[9px] text-zinc-500 font-mono mb-1">SPEAKER VERIFICATION PROFILE</label>
                <select
                  disabled={isSimulating}
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 outline-none font-mono"
                >
                  <option value="">Acoustic Verification Only</option>
                  {speakerProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Run / Stop buttons */}
            <div className="pt-4 border-t border-zinc-800">
              {!isSimulating ? (
                <button
                  onClick={runSimulation}
                  disabled={!selectedFile}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-650 text-white rounded font-medium text-sm transition"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Simulation</span>
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded font-medium text-sm transition"
                >
                  <Square className="h-4 w-4" />
                  <span>Stop Simulation</span>
                </button>
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

        {/* Center/Right columns: Charts, forensics, and evidence logs */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Timeline chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4 flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Simulated Ingestion Risk Timeline</span>
            </h2>

            <div className="h-48 w-full bg-zinc-900 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorSimRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSimRisk)" />
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
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                        <AlertOctagon className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />
                        <span>{ev.toUpperCase().replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-900/40 px-3 py-1.5 rounded text-xs font-mono text-emerald-400">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
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
                    ? 'AI VOICE ATTACK WARNING: Verify credentials using the Action Center modal prompts.'
                    : 'Acoustic integrity verified.'
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

export default SimulatedCall;
