import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  HelpCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface AlertItem {
  id: string;
  session_id: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

function Alerts() {
  const { session } = useContext(AuthContext);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const loadAlerts = async () => {
    if (!session) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${backendUrl}/api/sessions/alerts/active`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch alerts');
      setAlerts(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [session]);

  const handleResolve = async (alertId: string) => {
    if (!session) return;
    
    try {
      const res = await fetch(`${backendUrl}/api/sessions/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not resolve alert');
      
      // Refresh alert feed
      loadAlerts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveAll = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/alerts/resolve-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not resolve all alerts');
      
      loadAlerts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-violet-950 text-violet-400 border border-violet-900/50';
      case 'HIGH':
        return 'bg-red-950 text-red-400 border border-red-900/50';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-400 border border-amber-900/50';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700/50';
    }
  };

  const unresolvedCount = alerts.filter(a => a.status === 'UNRESOLVED').length;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wider text-white">SOC INCIDENT LOGS</h1>
          <p className="text-xs text-zinc-500 font-mono">List of anomalous speech impersonation threats logged by security gateways.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {unresolvedCount > 0 && (session?.role === 'ADMIN' || session?.role === 'ANALYST') && (
            <button
              onClick={handleResolveAll}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 transition rounded text-xs font-mono font-bold flex items-center space-x-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Resolve All Incidents ({unresolvedCount})</span>
            </button>
          )}

          <button
            onClick={loadAlerts}
            className="p-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 transition rounded text-zinc-400"
            title="Refresh Feed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <span className="text-sm font-mono">Loading incident telemetry feed...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="border border-zinc-850 bg-zinc-900/50 p-12 text-center rounded">
          <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">No Active Incidents</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">All voice communication channels are within normal baseline specifications.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500">
                  <th className="p-4 uppercase tracking-wider font-bold">Severity</th>
                  <th className="p-4 uppercase tracking-wider font-bold">Details</th>
                  <th className="p-4 uppercase tracking-wider font-bold">Triggered Time</th>
                  <th className="p-4 uppercase tracking-wider font-bold">Status</th>
                  <th className="p-4 uppercase tracking-wider font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300 max-w-sm">
                      {alert.message}
                    </td>
                    <td className="p-4 text-zinc-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {alert.status === 'RESOLVED' ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>RESOLVED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-red-400 font-bold animate-pulse">
                          <Clock className="h-3.5 w-3.5" />
                          <span>UNRESOLVED</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {alert.status === 'UNRESOLVED' && (session?.role === 'ADMIN' || session?.role === 'ANALYST') ? (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="px-3 py-1 bg-zinc-800 hover:bg-emerald-950/20 hover:text-emerald-400 hover:border-emerald-900/50 border border-zinc-700 transition rounded"
                        >
                          Resolve Alert
                        </button>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default Alerts;
