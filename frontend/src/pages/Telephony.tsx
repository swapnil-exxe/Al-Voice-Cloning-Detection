import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  PhoneIncoming, 
  Settings2, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Terminal,
  Activity
} from 'lucide-react';

interface TelephonyStatus {
  status: string;
  provider_adapters: string[];
  twilio_configured: boolean;
  active_streams: number;
}

function Telephony() {
  const { session } = useContext(AuthContext);
  const [status, setStatus] = useState<TelephonyStatus | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    if (session) {
      fetch(`${backendUrl}/api/telephony/status`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      })
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.log('Error loading telephony status', err));
    }
  }, [session]);

  const twimlSample = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="polly.Aditi">Connecting secure verified channel.</Say>
    <Connect>
        <Stream url="wss://voiceguard.sec/ws/live-analysis?token=JWT_TOKEN" />
    </Connect>
</Response>`;

  const payloadSample = `{
  "event": "media",
  "streamSid": "MZxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sequenceNumber": "3",
  "media": {
    "track": "inbound",
    "chunk": "3",
    "timestamp": "452",
    "payload": "base64_encoded_mu_law_8khz_mono_buffer..."
  }
}`;

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-wider text-white">TELEPHONY CARRIER ADAPTER</h1>
        <p className="text-xs text-zinc-500 font-mono">Documentation and API integration endpoints for VoIP / Carrier streaming trunks.</p>
      </div>

      {/* Integration stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Carrier Gateway</span>
          <span className="text-xl font-bold font-mono text-white flex items-center space-x-2">
            <Check className="h-5 w-5 text-emerald-500" />
            <span>OPERATIONAL</span>
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Active Call Trunks</span>
          <span className="text-xl font-bold font-mono text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-red-500 animate-pulse" />
            <span>{status?.active_streams || 0} CHANNELS</span>
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Twilio Adapter API</span>
          <span className={`text-xl font-bold font-mono ${status?.twilio_configured ? 'text-emerald-500' : 'text-zinc-400'}`}>
            {status?.twilio_configured ? 'CONFIGURED' : 'STANDBY MODE'}
          </span>
        </div>

      </div>

      {/* Main Flow Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
        <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-400 mb-4 flex items-center space-x-2">
          <PhoneIncoming className="h-4 w-4" />
          <span>Carrier-Agnostic Audio Ingestion Pipeline</span>
        </h3>

        {/* CSS flow grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center items-center py-6 font-mono text-xs text-zinc-400">
          <div className="bg-zinc-950 p-4 rounded border border-zinc-850">
            <p className="font-bold text-white mb-1">PSTN / VoIP Call</p>
            <p className="text-[10px] text-zinc-500">Inbound call trunk</p>
          </div>
          <div className="text-red-500 font-bold">➔</div>
          <div className="bg-zinc-950 p-4 rounded border border-zinc-850">
            <p className="font-bold text-white mb-1">Carrier gateway</p>
            <p className="text-[10px] text-zinc-500">TwiML / SIP Redirect</p>
          </div>
          <div className="text-red-500 font-bold">➔</div>
          <div className="bg-zinc-950 p-4 rounded border border-zinc-850">
            <p className="font-bold text-white mb-1">VOICEGUARD API</p>
            <p className="text-[10px] text-zinc-500">WebSocket /ws/live-analysis</p>
          </div>
        </div>
      </div>

      {/* Docs Tabs / Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Twilio Configuration Code */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-red-500" />
            <span>TwiML Instruction Payload</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono">
            To stream a live carrier call, configure your phone number webhook to reply with this XML container:
          </p>
          <pre className="bg-zinc-950 p-4 rounded border border-zinc-850 font-mono text-xs text-red-400 overflow-x-auto">
            {twimlSample}
          </pre>
        </div>

        {/* Packet structure documentation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-red-500" />
            <span>WebSocket Audio Packet JSON</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono">
            Twilio directs media samples wrapped inside standard WS JSON frames:
          </p>
          <pre className="bg-zinc-950 p-4 rounded border border-zinc-850 font-mono text-xs text-zinc-400 overflow-x-auto">
            {payloadSample}
          </pre>
        </div>

      </div>

    </div>
  );
}

export default Telephony;
