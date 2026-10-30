import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { GoogleIcon } from '../components/GoogleIcon';
import { api } from '../services/api';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Check if token was directly returned in query params
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');

      if (token) {
        localStorage.setItem('intellmeet_token', token);
        if (refreshToken) {
          localStorage.setItem('intellmeet_refresh_token', refreshToken);
        }
        try {
          const res = await api.get('/auth/me');
          if (res.data?.data?.user) {
            localStorage.setItem('intellmeet_user', JSON.stringify(res.data.data.user));
          }
        } catch {
          // ignore
        }
        navigate('/dashboard', { replace: true });
        return;
      }

      // 2. Check if authorization code was returned from Google OAuth
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Google authorization was cancelled: ${errorParam}`);
        return;
      }

      if (code) {
        try {
          const redirectUri = `${window.location.origin}/auth/google/callback`;
          const res = await api.post('/auth/google', { code, redirectUri });
          const { accessToken, refreshToken: newRefresh, user } = res.data.data;

          localStorage.setItem('intellmeet_token', accessToken);
          if (newRefresh) {
            localStorage.setItem('intellmeet_refresh_token', newRefresh);
          }
          if (user) {
            localStorage.setItem('intellmeet_user', JSON.stringify(user));
          }
          navigate('/dashboard', { replace: true });
          return;
        } catch (err: any) {
          setError(
            err.response?.data?.message ||
              'Failed to exchange authorization code with Google.'
          );
          return;
        }
      }

      setError('No authorization credentials found in the callback URL.');
    };

    handleCallback();
  }, [searchParams, navigate, loginWithGoogle]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-md">
          <GoogleIcon className="w-6 h-6" />
        </div>

        {error ? (
          <>
            <div className="flex items-center justify-center space-x-2 text-rose-400 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Authentication Error</span>
            </div>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-white tracking-tight">
              Completing Google Sign In...
            </h2>
            <p className="text-xs text-slate-400">
              Verifying your credentials and preparing your dashboard.
            </p>
            <div className="pt-2 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
