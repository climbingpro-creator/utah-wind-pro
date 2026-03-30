import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@utahwind/database';
import { Wind, Mail, Lock, ArrowLeft, Zap, CheckCircle, AlertCircle } from 'lucide-react';

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) window.location.hash = '';
  }, [user]);

  async function handleEmailAuth(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setStatus({ type: 'success', message: 'Account created! Check your email to confirm, then sign in.' });
        setMode('signin');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Authentication failed. Please try again.' });
    }
    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Enter your email address first.' });
      return;
    }
    if (!supabase) {
      setStatus({ type: 'error', message: 'Auth not configured.' });
      return;
    }
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStatus({ type: 'success', message: 'Magic link sent! Check your inbox.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to send magic link.' });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <button
          onClick={() => { window.location.hash = ''; }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </button>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1724]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
              <Wind className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Welcome to UtahWindFinder</h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="px-6 pb-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>

            {/* Status message */}
            {status.type && (
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-[12px] leading-relaxed border ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}>
                {status.type === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          </div>

          {/* Magic Link */}
          <div className="px-6 pb-4">
            <button
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 text-sm font-semibold transition-colors disabled:opacity-40"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Send Magic Link
            </button>
          </div>

          {/* Toggle sign in / sign up */}
          <div className="px-6 pb-6 text-center">
            <p className="text-[12px] text-slate-500">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setStatus({ type: null, message: '' });
                }}
                className="ml-1.5 text-sky-400 hover:text-sky-300 font-semibold transition-colors"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
