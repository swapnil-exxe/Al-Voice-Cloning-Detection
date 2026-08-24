import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Radio, PlaySquare, UploadCloud, Cpu, AlertTriangle } from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-zinc-100 selection:bg-red-500 selection:text-white font-sans">
      
      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-7 w-7 text-red-500" />
          <span className="text-xl font-bold tracking-wider font-mono text-white">VOICEGUARD</span>
        </div>
        <button 
          onClick={() => navigate('/login')} 
          className="px-4 py-1.5 text-sm bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors rounded"
        >
          Sign In
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Banner Alert */}
        <div className="mb-6 flex items-center space-x-2 bg-red-950/40 border border-red-900/50 rounded-full px-4 py-1 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
          <span>CYBERSECURITY ALERT: VOICE SPOOFING INCIDENTS UP 300% YEAR-OVER-YEAR</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-black font-mono tracking-tight text-white mb-6">
          Real-Time AI Voice Integrity & <span className="text-red-500">Impersonation Protection</span>
        </h1>
        
        <p className="text-lg text-zinc-400 max-w-2xl mb-12">
          Detect AI-generated, synthetic, cloned, or manipulated speech in near real time. VOICEGUARD analyzes spectral features, prosody, and micro-acoustic anomalies to shield organizations from CXO and family impersonation fraud.
        </p>

        {/* Action Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-16">
          <div 
            onClick={() => navigate('/login')}
            className="bg-zinc-900 border border-zinc-850 hover:border-red-900/60 p-6 rounded text-left cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Radio className="h-6 w-6 text-red-500 mb-4" />
            <h3 className="font-bold text-white mb-2 font-mono">Start Live Analysis</h3>
            <p className="text-xs text-zinc-400">Stream raw microphone audio directly to our real-time ML detector.</p>
          </div>

          <div 
            onClick={() => navigate('/login')}
            className="bg-zinc-900 border border-zinc-850 hover:border-red-900/60 p-6 rounded text-left cursor-pointer transition-all hover:scale-[1.02]"
          >
            <PlaySquare className="h-6 w-6 text-red-500 mb-4" />
            <h3 className="font-bold text-white mb-2 font-mono">Simulate Call</h3>
            <p className="text-xs text-zinc-400">Stream pre-recorded cloned audio chunk-by-chunk over standard protocols.</p>
          </div>

          <div 
            onClick={() => navigate('/login')}
            className="bg-zinc-900 border border-zinc-850 hover:border-red-900/60 p-6 rounded text-left cursor-pointer transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="h-6 w-6 text-red-500 mb-4" />
            <h3 className="font-bold text-white mb-2 font-mono">Upload Audio File</h3>
            <p className="text-xs text-zinc-400">Upload audio samples (.wav, .mp3, .flac) for a deep spectral audit report.</p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left w-full border-t border-zinc-900 pt-12">
          <div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center space-x-2 font-mono">
              <Cpu className="h-4 w-4 text-red-500" />
              <span>Deep Acoustic Analysis</span>
            </h4>
            <p className="text-xs text-zinc-400">Evaluates MFCCs, zero crossing rates, spectral roll-offs, and prosodic variances using PyTorch & Scikit-Learn models.</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center space-x-2 font-mono">
              <Cpu className="h-4 w-4 text-red-500" />
              <span>Explainable Threat Signals</span>
            </h4>
            <p className="text-xs text-zinc-400">Understand the 'Why' behind every result. VOICEGUARD identifies features contributing to flags, displaying them as granular evidence logs.</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center space-x-2 font-mono">
              <Cpu className="h-4 w-4 text-red-500" />
              <span>Multilingual Detection Engine</span>
            </h4>
            <p className="text-xs text-zinc-400">Built-in language identification covering 11 Indian languages (Hindi, Bengali, Marathi, Telugu, Tamil, Malayalam, Kannada, etc.).</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center space-x-2 font-mono">
              <Cpu className="h-4 w-4 text-red-500" />
              <span>Privacy-First Architecture</span>
            </h4>
            <p className="text-xs text-zinc-400">Zero persistent audio storage policies by default. Configurable retention and complete user data control for zero PII exposure.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-mono">
        <p>© 2026 VOICEGUARD. Smart India Hackathon Prototype (SIH26104). Dep. of Cyber Security Cell, AICTE.</p>
      </footer>

    </div>
  );
}

export default LandingPage;
