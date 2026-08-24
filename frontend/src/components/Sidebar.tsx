import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  Radio, 
  UploadCloud, 
  PhoneIncoming, 
  Sliders, 
  ShieldAlert, 
  History as HistoryIcon, 
  BarChart3, 
  LogOut, 
  PlaySquare, 
  ShieldCheck, 
  FileText
} from 'lucide-react';

function Sidebar() {
  const { session, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard/live', label: 'Live Analysis', icon: Radio },
    { to: '/dashboard/simulate', label: 'Simulated Call', icon: PlaySquare },
    { to: '/dashboard/upload', label: 'Upload Analysis', icon: UploadCloud },
    { to: '/dashboard/telephony', label: 'Telephony API', icon: PhoneIncoming },
    { to: '/dashboard/alerts', label: 'SOC Alerts', icon: ShieldAlert },
    { to: '/dashboard/history', label: 'Analysis History', icon: HistoryIcon },
    { to: '/dashboard/analytics', label: 'System Analytics', icon: BarChart3 },
    { to: '/dashboard/settings', label: 'Settings', icon: Sliders },
  ];
  
  const activeNavItems = [...navItems];
  if (session && session.role === 'ADMIN') {
    activeNavItems.push({ to: '/debug/ml', label: 'ML Diagnostic Console', icon: FileText });
  }

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between h-full font-sans select-none z-10">
      <div>
        {/* Brand/Logo */}
        <div className="p-6 border-b border-zinc-800 flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <ShieldCheck className="h-6 w-6 text-red-500 animate-pulse" />
          <div>
            <h1 className="text-md font-bold tracking-wider text-white font-mono">VOICEGUARD</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">SOC Threat Console</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {activeNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-2.5 rounded text-sm transition-colors ${
                    isActive 
                      ? 'bg-zinc-800 text-red-400 border-l-2 border-red-500 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Operator Details & Logout */}
      <div className="p-4 border-t border-zinc-800 space-y-4">
        {session && (
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">OPERATOR</p>
            <p className="text-xs font-semibold text-zinc-300 truncate font-mono">{session.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded font-mono border border-red-900/50">
                {session.role}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">v1.0.0</span>
            </div>
          </div>
        )}

        {/* Legal disclosures links */}
        <div className="flex justify-between text-[10px] text-zinc-500 px-1 font-mono">
          <NavLink to="/privacy" className="hover:underline">Privacy</NavLink>
          <span>•</span>
          <NavLink to="/terms" className="hover:underline">Terms</NavLink>
          <span>•</span>
          <NavLink to="/security" className="hover:underline">Security</NavLink>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900 transition-colors rounded text-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
