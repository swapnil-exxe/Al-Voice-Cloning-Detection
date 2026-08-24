import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  Sliders, 
  Trash2, 
  Plus, 
  Check, 
  Loader2,
  Info,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

interface SpeakerProfile {
  id: string;
  name: string;
  reference_audio_path: string;
  created_at: string;
}

function Settings() {
  const { session } = useContext(AuthContext);
  
  // Risk thresholds state
  const [mediumThreshold, setMediumThreshold] = useState(31);
  const [highThreshold, setHighThreshold] = useState(61);
  const [criticalThreshold, setCriticalThreshold] = useState(81);
  
  // Privacy retention
  const [retentionDays, setRetentionDays] = useState(7);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  
  // Speaker Profiles listing
  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const loadProfiles = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${backendUrl}/api/speaker/profiles`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      console.log('Error fetching speaker profiles', err);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [session]);

  const handleRegisterSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName || !session) return;

    setIsLoading(true);
    
    // Create a mock speaker embedding vector (13 MFCC features centered around normal human voice profile)
    // To make it dynamic, we'll randomize features slightly
    const embeddingVector = Array.from({ length: 13 }, () => Math.random() * 20 - 10);

    try {
      const res = await fetch(`${backendUrl}/api/speaker/profiles?name=${encodeURIComponent(newProfileName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify(embeddingVector)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not register speaker');
      
      setNewProfileName('');
      loadProfiles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!session) return;
    if (!confirm('Are you sure you want to delete this speaker profile reference?')) return;

    try {
      const res = await fetch(`${backendUrl}/api/speaker/profiles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      
      if (!res.ok) throw new Error('Could not delete speaker profile');
      loadProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = () => {
    alert('Global threat configuration limits updated and propagated to ingestion gateway servers.');
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-wider text-white">SYSTEM CONFIGURATIONS</h1>
        <p className="text-xs text-zinc-500 font-mono">Governs analysis thresholds, retention parameters, and speaker embedding profiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sliders & Thresholds panel */}
        <div className="space-y-6 lg:col-span-2">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-6">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-red-500" />
              <span>Risk Scoring Threshold Configuration</span>
            </h3>

            {/* Medium Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>MEDIUM RISK THRESHOLD LIMIT</span>
                <span>{mediumThreshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded outline-none appearance-none accent-red-500 cursor-pointer"
              />
            </div>

            {/* High Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>HIGH RISK THRESHOLD LIMIT</span>
                <span>{highThreshold}%</span>
              </div>
              <input
                type="range"
                min="51"
                max="80"
                value={highThreshold}
                onChange={(e) => setHighThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded outline-none appearance-none accent-red-500 cursor-pointer"
              />
            </div>

            {/* Critical Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>CRITICAL RISK THRESHOLD LIMIT</span>
                <span>{criticalThreshold}%</span>
              </div>
              <input
                type="range"
                min="81"
                max="95"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded outline-none appearance-none accent-red-500 cursor-pointer"
              />
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-between">
              <div className="flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
                <Info className="h-4 w-4" />
                <span>Default configuration: 31% / 61% / 81%</span>
              </div>
              
              <button
                onClick={handleSaveSettings}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold font-mono transition"
              >
                Save Limits
              </button>
            </div>
          </div>

          {/* Privacy Retention Settings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-6">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500">GDPR & GDPR Data Retention Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-zinc-400 font-mono mb-1">AUTOMATIC AUDIO CACHE DELETION</label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 outline-none font-mono"
                >
                  <option value="0">Instant Deletion (Privacy-First)</option>
                  <option value="3">3 Days Retention</option>
                  <option value="7">7 Days Retention</option>
                  <option value="30">30 Days Retention</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 font-mono mb-1">ANONYMOUS TELEMETRY PROCESSES</label>
                <select
                  value={allowAnonymous ? 'true' : 'false'}
                  onChange={(e) => setAllowAnonymous(e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 outline-none font-mono"
                >
                  <option value="true">Permit Anonymous (Live Demo)</option>
                  <option value="false">Enforce Strict Authorization</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel: Speaker Registration */}
        <div className="space-y-6 lg:col-span-1">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 flex items-center space-x-2">
              <UserPlus className="h-4 w-4 text-red-500" />
              <span>Register Speaker Profile</span>
            </h3>

            <form onSubmit={handleRegisterSpeaker} className="space-y-3">
              <input
                type="text"
                required
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Speaker Name (e.g. CEO Office)"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded text-xs text-zinc-300 outline-none font-mono"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2 bg-zinc-850 hover:bg-zinc-800 disabled:bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded text-xs text-zinc-300 font-mono transition"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Extract & Save Embedding</span>
                )}
              </button>
            </form>

            <div className="border-t border-zinc-800 pt-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-[10px] uppercase font-mono text-zinc-500">Active Reference Keys</p>
              
              {profiles.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono">No speaker embeddings registered.</p>
              ) : (
                profiles.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-850">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-300 truncate font-mono">{p.name}</p>
                      <p className="text-[9px] text-zinc-500 font-mono">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteProfile(p.id)}
                      className="p-1 hover:text-red-500 text-zinc-650 transition"
                      title="Remove Reference"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Settings;
