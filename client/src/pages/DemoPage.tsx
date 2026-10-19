import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  Video,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const DemoPage: React.FC = () => {
  const { loginDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const demoEmail = 'mentor.evaluator@intellmeet.io';
  const demoPassword = 'DemoPassword2026!';

  useEffect(() => {
    let isMounted = true;

    const performDemoLogin = async () => {
      try {
        setStep(1);
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (!isMounted) return;
        setStep(2);
        await loginDemo();

        if (!isMounted) return;
        setStep(3);
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) return;
        setStep(4);
        setTimeout(() => {
          if (isMounted) {
            navigate('/dashboard', { replace: true });
          }
        }, 600);
      } catch (err: any) {
        if (!isMounted) return;
        setError(
          err.response?.data?.message ||
            'Failed to auto-authenticate demo account. Please click retry or use manual credentials below.'
        );
      }
    };

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      performDemoLogin();
    }

    return () => {
      isMounted = false;
    };
  }, [loginDemo, isAuthenticated, navigate]);

  const handleManualLaunch = async () => {
    setError(null);
    try {
      await loginDemo();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authenticate demo account.');
    }
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${demoEmail}\nPassword: ${demoPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-lg glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative">
        {/* Header Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-brand-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-glow-brand">
            <Sparkles className="w-8 h-8 animate-pulse text-emerald-300" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Project Mentor & Evaluator Demo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Launching Evaluation Session
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Auto-configuring full administrative accessibility, active WebRTC room, and AI evaluation tasks...
          </p>
        </div>

        {error ? (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex flex-col gap-3">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleManualLaunch}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors self-start"
            >
              Retry Demo Login
            </button>
          </div>
        ) : (
          /* Step Checklist */
          <div className="space-y-3 mb-8 bg-dark-900/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authenticating evaluator credentials</span>
              </span>
              {step > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Granting administrative permissions</span>
              </span>
              {step > 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : step === 2 ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600 mr-1" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Provisioning WebRTC room & Kanban tasks</span>
              </span>
              {step > 3 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : step === 3 ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600 mr-1" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <ArrowRight className="w-4 h-4 text-brand-400" />
                <span>Redirecting to Workspace Dashboard</span>
              </span>
              {step >= 4 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600 mr-1" />
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleManualLaunch}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 mb-6"
        >
          <span>Enter Dashboard Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Credentials Info Tile */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span className="block font-medium text-slate-300">
              Evaluator Email: <code className="text-emerald-300">{demoEmail}</code>
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Role: <strong className="text-white">Admin (Full Access)</strong>
            </span>
          </div>
          <button
            onClick={copyCredentials}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Copy evaluator credentials"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Want to register your own account instead?{' '}
          <Link to="/register" className="text-brand-400 hover:underline">
            Register
          </Link>{' '}
          •{' '}
          <Link to="/login" className="text-slate-400 hover:underline">
            Manual Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
