import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface AuthProps {
  isSignUp: boolean;
}

function Auth({ isSignUp }: AuthProps) {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER'); // default role
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    try {
      if (isSignUp) {
        // Registration
        const res = await fetch(`${backendUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || 'Signup failed');
        }
        
        login({
          token: data.access_token,
          email: data.email,
          role: data.role,
        });
        navigate('/dashboard');
      } else {
        // Login - OAuth2 expects form-urlencoded parameters
        const formDetails = new URLSearchParams();
        formDetails.append('username', email);
        formDetails.append('password', password);

        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formDetails,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Login failed');
        }

        login({
          token: data.access_token,
          email: data.email,
          role: data.role,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Check backend connections.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 font-sans p-6">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded shadow-lg">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2 text-red-500 mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-mono tracking-wider text-white">VOICEGUARD</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Operator Authentication</p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-950/40 border border-red-900/50 text-red-400 p-3 rounded text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-mono text-zinc-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded text-sm text-zinc-100 outline-none"
              placeholder="operator@company.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-mono text-zinc-400 mb-1">Passphrase</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded text-sm text-zinc-100 outline-none"
              placeholder="••••••••"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs uppercase tracking-wider font-mono text-zinc-400 mb-1">Clearance Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded text-sm text-zinc-100 outline-none font-mono"
              >
                <option value="USER">USER (Operator)</option>
                <option value="ANALYST">ANALYST (Auditor)</option>
                <option value="ADMIN">ADMIN (Manager)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white rounded font-medium text-sm transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create System Account' : 'Authenticate Operator'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500 font-mono">
          {isSignUp ? (
            <p>
              Already registered?{' '}
              <Link to="/login" className="text-red-500 hover:underline">
                Sign In
              </Link>
            </p>
          ) : (
            <p>
              New station?{' '}
              <Link to="/signup" className="text-red-500 hover:underline">
                Create Account
              </Link>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default Auth;
