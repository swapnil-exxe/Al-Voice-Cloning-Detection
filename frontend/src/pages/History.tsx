import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  History as HistoryIcon, 
  Trash2, 
  Eye, 
  Loader2, 
  HelpCircle,
  FileText,
  Clock
} from 'lucide-react';

interface SessionItem {
  id: string;
  type: string;
  file_name: string;
  duration: number;
  final_risk_score: number;
  final_ai_probability: number;
  detected_language: string;
  language_confidence: number;
  speaker_similarity: number | null;
  model_version: string;
  created_at: string;
}

function History() {
  const { session } = useContext(AuthContext);
  const [history, setHistory] = useState<SessionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Details Modal state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const loadHistory = async () => {
    if (!session) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${backendUrl}/api/sessions?limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not load history logs');
      setHistory(data.sessions);
      setTotal(data.total);
    } catch (err: any) {
      setErrorMsg(err.message || 'Database connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [session]);

  const handleDelete = async (sessionId: string) => {
    if (!session) return;
    if (!confirm('Are you sure you want to delete this session? This action is permanent and deletes all audio metadata features.')) return;

    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not delete session');
      
      // Close details if opened
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
      loadHistory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadSessionDetail = async (sessionId: string) => {
    if (!session) return;
    setSelectedSessionId(sessionId);
    setIsDetailLoading(true);
    setSessionDetail(null);

    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to retrieve session details');
      setSessionDetail(data);
    } catch (err: any) {
      alert(err.message);
      setSelectedSessionId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 81) return 'text-violet-500';
    if (score >= 61) return 'text-red-500';
    if (score >= 31) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto relative h-full flex flex-col">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-wider text-white">AUDIT HISTORY INDEX</h1>
        <p className="text-xs text-zinc-500 font-mono">Operator session archives and privacy deletion protocols.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <span className="text-sm font-mono">Querying index tables...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="border border-zinc-850 bg-zinc-900/50 p-12 text-center rounded">
          <HistoryIcon className="h-8 w-8 text-zinc-500 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">Index is Empty</h3>
          <p className="text-xs text-zinc-500">No session archives registered under this account credentials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
          
          {/* Left Table Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded lg:col-span-2 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500">
                    <th className="p-3">Risk</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">File / Target</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {history.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-zinc-850/40 transition cursor-pointer ${selectedSessionId === item.id ? 'bg-zinc-800/40' : ''}`}
                      onClick={() => loadSessionDetail(item.id)}
                    >
                      <td className={`p-3 font-bold ${getRiskColor(item.final_risk_score)}`}>
                        {item.final_risk_score}%
                      </td>
                      <td className="p-3 text-zinc-400 font-bold">{item.type}</td>
                      <td className="p-3 text-zinc-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-zinc-300 max-w-[120px] truncate" title={item.file_name}>
                        {item.file_name}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:text-red-500 text-zinc-500 transition rounded"
                          title="Delete Session (Privacy)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Detail Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 lg:col-span-1">
            <h2 className="text-xs uppercase tracking-wider font-mono text-zinc-500 mb-4">Inspection Console</h2>
            
            {selectedSessionId ? (
              isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-[10px] font-mono">Parsing JSON files...</span>
                </div>
              ) : sessionDetail ? (
                <div className="space-y-4 font-mono text-xs text-zinc-400">
                  
                  {/* Status Banner */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-850 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500">Session ID</p>
                      <p className="text-[11px] text-zinc-300 font-bold max-w-[120px] truncate">{sessionDetail.session.id}</p>
                    </div>
                    <span className={`text-[11px] font-bold ${getRiskColor(sessionDetail.session.final_risk_score)}`}>
                      {sessionDetail.session.final_risk_score}% RISK
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500">Forensics Report</p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded border border-zinc-850 mt-1 max-h-40 overflow-y-auto">
                      {sessionDetail.result.explainability_report}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500">Indicator Anomalies</p>
                    <div className="mt-1 space-y-1">
                      {sessionDetail.result.evidence.length > 0 ? (
                        sessionDetail.result.evidence.map((ev: string, idx: number) => (
                          <div key={idx} className="bg-red-950/20 text-red-400 border border-red-900/40 rounded px-2 py-0.5 text-[10px]">
                            ⚠️ {ev.toUpperCase().replace(/_/g, ' ')}
                          </div>
                        ))
                      ) : (
                        <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 rounded px-2 py-0.5 text-[10px]">
                          ✓ NO ACOUSTIC THREATS IDENTIFIED
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] border-t border-zinc-850 pt-3">
                    <span className="text-zinc-500">Detected Language:</span>
                    <span className="text-zinc-300 uppercase">{sessionDetail.session.detected_language}</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">Call Duration:</span>
                    <span className="text-zinc-300">{sessionDetail.session.duration.toFixed(1)} seconds</span>
                  </div>

                  <button
                    onClick={() => handleDelete(sessionDetail.session.id)}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 transition rounded text-[11px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Flush Session Data</span>
                  </button>

                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500">
                  <p>Details could not be parsed.</p>
                </div>
              )
            ) : (
              <div className="text-center py-12 text-zinc-500 flex flex-col items-center">
                <Eye className="h-6 w-6 mb-2 text-zinc-650" />
                <p className="text-[10px] max-w-[150px]">Select a session from the table to inspect details.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default History;
