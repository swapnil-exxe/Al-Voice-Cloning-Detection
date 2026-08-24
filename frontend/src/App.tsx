import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import LiveAnalysis from './pages/LiveAnalysis';
import AudioAnalysis from './pages/AudioAnalysis';
import SimulatedCall from './pages/SimulatedCall';
import Telephony from './pages/Telephony';
import Alerts from './pages/Alerts';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import DebugML from './pages/DebugML';
import { PrivacyPolicy, TermsOfService, SecurityBrief } from './pages/InfoPages';

export interface UserSession {
  token: string;
  email: string;
  role: string;
}

export const AuthContext = React.createContext<{
  session: UserSession | null;
  login: (session: UserSession) => void;
  logout: () => void;
}>({
  session: null,
  login: () => {},
  logout: () => {},
});

function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('vg_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('vg_session', JSON.stringify(newSession));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem('vg_session');
  };

  // Protected route wrapper
  const Protected = ({ children }: { children: React.ReactNode }) => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      <Router>
        <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden">
          {/* Offline alert banner */}
          {isOffline && (
            <div className="absolute top-0 left-0 w-full bg-red-600/90 text-center py-1 text-xs font-semibold z-50 animate-pulse">
              ⚠️ NETWORK DISCONNECTED: VOICEGUARD IS RUNNING OFFLINE
            </div>
          )}

          {session && <Sidebar />}

          <main className="flex-1 overflow-y-auto relative bg-zinc-950">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
              <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Auth isSignUp={false} />} />
              <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <Auth isSignUp={true} />} />
              
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/security" element={<SecurityBrief />} />

              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={<Protected><LiveAnalysis /></Protected>} />
              <Route path="/dashboard/live" element={<Protected><LiveAnalysis /></Protected>} />
              <Route path="/dashboard/upload" element={<Protected><AudioAnalysis /></Protected>} />
              <Route path="/dashboard/simulate" element={<Protected><SimulatedCall /></Protected>} />
              <Route path="/dashboard/telephony" element={<Protected><Telephony /></Protected>} />
              <Route path="/dashboard/alerts" element={<Protected><Alerts /></Protected>} />
              <Route path="/dashboard/history" element={<Protected><History /></Protected>} />
              <Route path="/dashboard/analytics" element={<Protected><Analytics /></Protected>} />
              <Route path="/dashboard/settings" element={<Protected><Settings /></Protected>} />
              <Route path="/debug/ml" element={<Protected><DebugML /></Protected>} />

              {/* 404 Fallback */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-zinc-950">
                  <span className="text-6xl mb-4 font-mono text-red-500">404</span>
                  <h1 className="text-2xl font-bold mb-2">Resource Not Found</h1>
                  <p className="text-zinc-400 mb-6 max-w-sm">The path you specified does not exist or has been relocated by security admins.</p>
                  <a href="/" className="px-4 py-2 bg-zinc-800 rounded border border-zinc-700 hover:bg-zinc-700 transition">Return to Safe Zone</a>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
