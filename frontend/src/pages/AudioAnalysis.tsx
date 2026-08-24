import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  Upload, 
  FileAudio, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Download
} from 'lucide-react';

interface UploadResult {
  session_id: string;
  risk_score: number;
  ai_probability: number;
  detected_language: string;
  language_confidence: number;
  risk_level: string;
  evidence: string[];
  explainability_report: string;
  features: Record<string, number>;
}

function AudioAnalysis() {
  const { session } = useContext(AuthContext);
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !session) return;

    setIsLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${backendUrl}/api/sessions/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`
        },
        body: formData
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Upload analysis failed');
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during file parsing.');
    } finally {
      setIsLoading(false);
    }
  };

  // Printable report generator
  const triggerReportPrint = () => {
    if (!result || !file) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>VOICEGUARD Security Audit Certificate</title>
          <style>
            body { font-family: monospace; padding: 40px; background-color: #ffffff; color: #18181b; }
            .header { border-bottom: 2px solid #18181b; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .meta-table td { padding: 8px; border: 1px solid #e4e4e7; }
            .score-box { background-color: #f4f4f5; border: 1px solid #e4e4e7; padding: 20px; text-align: center; margin-bottom: 30px; }
            .score { font-size: 48px; font-weight: bold; }
            .evidence-title { font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
            .evidence-list { list-style-type: square; padding-left: 20px; margin-bottom: 30px; }
            .disclaimer { font-size: 10px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 20px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🛡️ VOICEGUARD INCIDENT AUDIT REPORT</div>
            <div>Generated: ${new Date().toLocaleString()} | Version: voiceguard-v1.0</div>
          </div>
          
          <div class="score-box">
            <div>COMPOSITE VOICE RISK LEVEL: <strong>${result.risk_level}</strong></div>
            <div class="score">${result.risk_score}%</div>
            <div>AI Spoof Probability: ${Math.round(result.ai_probability * 100)}%</div>
          </div>

          <table class="meta-table">
            <tr>
              <td><strong>Session Hash ID</strong></td>
              <td>${result.session_id}</td>
            </tr>
            <tr>
              <td><strong>Target Filename</strong></td>
              <td>${file.name}</td>
            </tr>
            <tr>
              <td><strong>Detected Language</strong></td>
              <td>${result.detected_language.toUpperCase()} (${Math.round(result.language_confidence * 100)}% confidence)</td>
            </tr>
          </table>

          <div class="evidence-title">Telemetry Anomalies Logged</div>
          <ul class="evidence-list">
            ${result.evidence.length > 0 
              ? result.evidence.map(ev => `<li>${ev.toUpperCase().replace(/_/g, ' ')}</li>`).join('')
              : '<li>NO ACOUSTIC ANOMALIES DETECTED (INTEGRITY CONFIRMED)</li>'
            }
          </ul>

          <div class="evidence-title font-bold">XAI Technical Finding Summary</div>
          <p>${result.explainability_report}</p>

          <div class="disclaimer">
            IMPORTANT DISCLOSURE: This result is an AI-assisted risk assessment and should not be treated as absolute proof of identity or fraud. All security actions taken should follow standard corporate validation policies.
          </div>
          
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-violet-500 border-violet-950/60 bg-violet-950/20';
      case 'HIGH': return 'text-red-500 border-red-950/60 bg-red-950/20';
      case 'MEDIUM': return 'text-amber-500 border-amber-950/60 bg-amber-950/20';
      default: return 'text-emerald-500 border-emerald-950/60 bg-emerald-950/20';
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-wider text-white">AUDIO BATCH ANALYSIS</h1>
        <p className="text-xs text-zinc-500 font-mono">Upload pre-recorded audio files for deep acoustic forensics audits.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {!result ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded p-8">
          <form onSubmit={handleUpload} className="space-y-6">
            
            {/* Uploader Box */}
            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded p-12 text-center relative transition">
              <input
                type="file"
                accept="audio/*,video/mp4"
                required
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isLoading}
              />
              <Upload className="h-10 w-10 text-zinc-400 mx-auto mb-4" />
              <p className="text-sm text-zinc-200 font-medium">Drag and drop file here, or click to upload</p>
              <p className="text-xs text-zinc-500 mt-2 font-mono uppercase">Supported formats: .wav, .mp3, .flac, .m4a, .mp4 (Max 15MB)</p>
            </div>

            {file && (
              <div className="flex items-center space-x-3 bg-zinc-950 p-4 rounded border border-zinc-850">
                <FileAudio className="h-6 w-6 text-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-300 truncate font-mono">{file.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-850 text-white rounded font-medium text-sm transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing Acoustic Waveform...</span>
                </>
              ) : (
                <span>Submit to Forensic Pipeline</span>
              )}
            </button>

          </form>
        </div>
      ) : (
        /* Audit Report Result Display */
        <div className="space-y-6 animate-fade-in">
          
          <button 
            onClick={() => setResult(null)} 
            className="flex items-center space-x-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Upload New File</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Box: Risk Circle & Summary */}
            <div className={`bg-zinc-900 border border-zinc-800 rounded p-6 md:col-span-1 flex flex-col justify-between`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs uppercase tracking-wider font-mono text-zinc-500">Threat Class</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getSeverityColor(result.risk_level)}`}>
                    {result.risk_level}
                  </span>
                </div>
                
                <div className="text-center py-6 flex flex-col items-center">
                  <span className="text-6xl font-black font-mono text-white tracking-tight mb-1">{result.risk_score}%</span>
                  <span className="text-[10px] uppercase font-mono text-zinc-500">RISK INDEX</span>
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-4 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">AI PROBABILITY:</span>
                  <span className="text-zinc-300">{Math.round(result.ai_probability * 100)}%</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">TARGET LANG:</span>
                  <span className="text-zinc-300 uppercase">{result.detected_language}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">MODEL ID:</span>
                  <span className="text-zinc-300">voiceguard-v1.0</span>
                </div>
              </div>
            </div>

            {/* Right Box: Evidence Details & Action */}
            <div className="bg-zinc-900 border border-zinc-800 rounded p-6 md:col-span-2 flex flex-col justify-between">
              
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500">Incident Details & Evidence</h3>
                
                <div className="flex flex-wrap gap-2">
                  {result.evidence.length > 0 ? (
                    result.evidence.map((ev, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-red-950/20 border border-red-900/40 px-3 py-1 rounded text-xs font-mono text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        <span>{ev.toUpperCase().replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-900/40 px-3 py-1 rounded text-xs font-mono text-emerald-400">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>NO TELEMETRY ANOMALIES FOUND</span>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 p-4 rounded border border-zinc-850">
                  <h4 className="text-[10px] uppercase font-mono text-zinc-500 mb-1">XAI Forensics Logs</h4>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed">{result.explainability_report}</p>
                </div>
              </div>

              {/* Printable PDF button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={triggerReportPrint}
                  className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition rounded"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Audit Certificate</span>
                </button>
              </div>

            </div>

          </div>

          {/* Bottom Table: List of extracted features */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4">Extracted Acoustic Feature Vector</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 max-h-56 overflow-y-auto pr-4">
              {Object.entries(result.features).map(([name, val]) => (
                <div key={name} className="flex justify-between border-b border-zinc-850 py-1 text-xs font-mono">
                  <span className="text-zinc-500 uppercase">{name.replace(/_/g, ' ')}</span>
                  <span className="text-zinc-300">{val.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default AudioAnalysis;
