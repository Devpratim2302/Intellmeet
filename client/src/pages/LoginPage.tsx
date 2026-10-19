import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = location.state?.from?.pathname || '/dashboard';

  const fillDemoCredentials = () => {
    setEmail('mentor.evaluator@intellmeet.io');
    setPassword('DemoPassword2026!');
    setIsDemoMode(true);
  };

  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      fillDemoCredentials();
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isDemoMode) {
        await loginDemo();
      } else {
        await login({ email, password });
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Failed to sign in. Please verify your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 sm:p-6 relative">
      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] bg-brand-500/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 text-brand-400">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In to IntellMeet
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Enter your credentials or use the demo login
          </p>
        </div>

        {/* Demo Toggle Button */}
        <div className="mb-6 flex items-center justify-center">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all transform hover:-translate-y-0.5 ${
              isDemoMode
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            {isDemoMode ? '✓ Demo Details Filled' : 'Click for Demo Details'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsDemoMode(false);
                }}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIsDemoMode(false);
                }}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDemoMode
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-brand'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isDemoMode ? 'Opening Dashboard...' : 'Authenticating...'}</span>
              </>
            ) : isDemoMode ? (
              <>
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-brand-400 hover:text-brand-300 font-semibold hover:underline"
          >
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};
