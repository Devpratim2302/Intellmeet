import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { IntellMeetLogo } from '../components/IntellMeetLogo';
import { GoogleIcon } from '../components/GoogleIcon';
import { GoogleAccountChooserModal, GoogleAccount } from '../components/GoogleAccountChooserModal';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const { login, loginDemo, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = location.state?.from?.pathname || '/dashboard';

  const fillDemoCredentials = () => {
    setEmail('demo.admin@intellmeet.io');
    setPassword('DemoPassword2026!');
    setIsDemoMode(true);
  };

  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      fillDemoCredentials();
    }
  }, [searchParams]);

  const handleGoogleClick = () => {
    setError(null);
    setShowGoogleModal(true);
  };

  const handleSelectGoogleAccount = async (account: GoogleAccount) => {
    setIsGoogleSubmitting(true);
    setError(null);

    try {
      await loginWithGoogle({
        email: account.email,
        name: account.name,
        avatar: account.avatar,
      });
      setShowGoogleModal(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Google sign in failed. Please verify your details.';
      setError(msg);
      throw err;
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

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
          <IntellMeetLogo className="w-14 h-14 rounded-2xl shadow-xl shadow-blue-500/25 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In to IntellMeet
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Enter your credentials or use the demo login
          </p>
        </div>

        {/* Demo Toggle Button */}
        <div className="mb-4 flex items-center justify-center">
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

        {/* Sign in with Google */}
        <button
          id="google-login-btn"
          type="button"
          onClick={handleGoogleClick}
          disabled={isGoogleSubmitting || isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm flex items-center justify-center space-x-3 transition-all hover:border-white/20 shadow-sm disabled:opacity-50 group hover:-translate-y-0.5 cursor-pointer mb-6"
        >
          {isGoogleSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          ) : (
            <GoogleIcon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
          )}
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-dark-900 px-3 text-slate-400 font-semibold tracking-wider">
              Or sign in with email
            </span>
          </div>
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
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIsDemoMode(false);
                }}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-brand-400" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>
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

      {/* Google Account Chooser Modal (choose account and just login) */}
      <GoogleAccountChooserModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleSelectGoogleAccount}
        isSubmitting={isGoogleSubmitting}
      />
    </div>
  );
};
