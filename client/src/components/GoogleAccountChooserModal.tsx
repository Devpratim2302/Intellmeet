import React, { useState, useEffect } from 'react';
import { X, UserPlus, ArrowLeft, Loader2, Trash2, KeyRound, ExternalLink, PlayCircle } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

export interface GoogleAccount {
  name: string;
  email: string;
  avatar?: string;
}

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: GoogleAccount) => Promise<void>;
  isSubmitting?: boolean;
}

const STORAGE_KEY = 'intellmeet_saved_google_accounts';
const CLIENT_ID_STORAGE_KEY = 'intellmeet_google_client_id';

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'dev',
    email: 'wokebo4929@hopefunder.com',
    avatar: '',
  },
  {
    name: 'Dev Pratim',
    email: 'dmohanty@gitam.in',
    avatar: '',
  },
  {
    name: 'Demo Admin',
    email: 'demo.admin@intellmeet.io',
    avatar: '',
  },
];

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  isSubmitting = false,
}) => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_ACCOUNTS;
  });

  const [activeAccountEmail, setActiveAccountEmail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'choose' | 'add' | 'setup'>('choose');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [clientIdInput, setClientIdInput] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem(CLIENT_ID_STORAGE_KEY) ||
      ''
    );
  });
  const [isLiveGoogleOpening, setIsLiveGoogleOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync saved accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore storage errors
    }
  }, [accounts]);

  // Load Google Identity Services script
  useEffect(() => {
    if ((window as any).google?.accounts?.oauth2) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('choose');
      setCustomEmail('');
      setCustomName('');
      setError(null);
      setActiveAccountEmail(null);
      setIsLiveGoogleOpening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    localStorage.getItem(CLIENT_ID_STORAGE_KEY) ||
    '';

  // Real Google OAuth Popup (Dennis Ivy Setup)
  const handleLaunchLiveGooglePopup = (targetClientId?: string) => {
    const idToUse = targetClientId || activeClientId;
    if (!idToUse) {
      setViewMode('setup');
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      setError('Google Identity Services SDK is still loading. Please try again in 2 seconds.');
      return;
    }

    try {
      setIsLiveGoogleOpening(true);
      setError(null);

      const client = google.accounts.oauth2.initTokenClient({
        client_id: idToUse,
        scope: 'openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          setIsLiveGoogleOpening(false);
          if (tokenResponse.error) {
            setError(`Google login cancelled: ${tokenResponse.error}`);
            return;
          }

          if (tokenResponse.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });
              const profile = await res.json();
              if (profile.email) {
                const account: GoogleAccount = {
                  name: profile.name || profile.email.split('@')[0],
                  email: profile.email.toLowerCase().trim(),
                  avatar: profile.picture || '',
                };
                await onSelectAccount(account);
              }
            } catch (err: any) {
              setError(err?.message || 'Failed to retrieve profile from Google.');
            }
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setIsLiveGoogleOpening(false);
      setError(err?.message || 'Could not launch Google popup. Please check your Client ID.');
    }
  };

  const handleSaveClientIdAndLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = clientIdInput.trim();
    if (!trimmedId) {
      setError('Please paste a valid Google Client ID from Google Cloud Console.');
      return;
    }

    localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmedId);
    setError(null);
    handleLaunchLiveGooglePopup(trimmedId);
  };

  const handleAccountClick = async (account: GoogleAccount) => {
    if (isSubmitting || activeAccountEmail) return;
    setActiveAccountEmail(account.email);
    setError(null);

    try {
      await onSelectAccount(account);
      setAccounts((prev) => {
        const remaining = prev.filter(
          (a) => a.email.toLowerCase() !== account.email.toLowerCase()
        );
        return [account, ...remaining];
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Could not sign in with this Google account. Please try again.';
      setError(msg);
      setActiveAccountEmail(null);
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = customEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }

    const trimmedName =
      customName.trim() ||
      trimmedEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newAccount: GoogleAccount = {
      name: trimmedName,
      email: trimmedEmail,
    };

    setActiveAccountEmail(newAccount.email);
    setError(null);

    try {
      await onSelectAccount(newAccount);
      setAccounts((prev) => {
        const remaining = prev.filter(
          (a) => a.email.toLowerCase() !== trimmedEmail
        );
        return [newAccount, ...remaining];
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Could not sign in with this Google account. Please try again.';
      setError(msg);
      setActiveAccountEmail(null);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    setAccounts((prev) =>
      prev.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase())
    );
  };

  const getInitialColor = (nameOrEmail: string) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-red-500 text-white',
      'bg-amber-500 text-white',
      'bg-emerald-600 text-white',
      'bg-purple-600 text-white',
      'bg-indigo-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < nameOrEmail.length; i++) {
      hash = nameOrEmail.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[430px] bg-white dark:bg-[#202124] text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden relative transition-all">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between p-5 pb-3">
          {viewMode !== 'choose' ? (
            <button
              onClick={() => {
                setViewMode('choose');
                setError(null);
              }}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Back to accounts list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-5" />
          )}

          <div className="flex items-center justify-center">
            <GoogleIcon className="w-7 h-7" />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header Copy */}
        <div className="text-center px-6 pb-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {viewMode === 'choose'
              ? 'Choose an account'
              : viewMode === 'setup'
                ? 'Google OAuth Credentials'
                : 'Sign in with Google'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            to continue to <span className="font-semibold text-brand-600 dark:text-brand-400">IntellMeet</span>
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Mode 1: Choose Account List */}
        {viewMode === 'choose' && (
          <div className="px-3 pb-3 space-y-3">
            {/* Live Google Accounts Button if Client ID configured or setup option */}
            <div className="px-2">
              <button
                type="button"
                onClick={() => handleLaunchLiveGooglePopup()}
                disabled={isLiveGoogleOpening}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
              >
                {isLiveGoogleOpening ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Google Accounts...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4" />
                    <span>
                      {activeClientId
                        ? 'Choose from Google.com Popup'
                        : 'Connect Google Cloud Credentials'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Account List */}
            <div className="divide-y divide-slate-100 dark:divide-white/5 border-t border-b border-slate-100 dark:border-white/5 max-h-64 overflow-y-auto">
              {accounts.map((acc) => {
                const isSelected = activeAccountEmail === acc.email;
                const initial = (acc.name || acc.email || 'U').charAt(0).toUpperCase();
                const colorClass = getInitialColor(acc.email);

                return (
                  <div
                    key={acc.email}
                    onClick={() => handleAccountClick(acc)}
                    className={`group w-full p-3.5 flex items-center justify-between transition-colors rounded-xl cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${colorClass}`}
                      >
                        {acc.avatar ? (
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                      </div>

                      {/* Name & Email */}
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    {/* Status Spinner or Remove */}
                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Logging in...</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.email)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                          title="Remove from account list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Use Another Account Button */}
              <button
                type="button"
                onClick={() => {
                  setViewMode('add');
                  setError(null);
                }}
                className="w-full p-3.5 flex items-center space-x-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors rounded-xl text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Use another account
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sign in with a different Google account
                  </div>
                </div>
              </button>
            </div>

            {/* Dennis Ivy Video Tutorial Reference Link */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setViewMode('setup')}
                className="inline-flex items-center space-x-1.5 text-[11px] text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                <span>Configure Google Cloud OAuth (Dennis Ivy Setup)</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Add / Use Another Account */}
        {viewMode === 'add' && (
          <form onSubmit={handleAddAccountSubmit} className="p-6 pt-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Google Email Address
              </label>
              <input
                type="email"
                autoFocus
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode('choose');
                  setError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activeAccountEmail !== null}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center space-x-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {activeAccountEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Next & Sign In</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Mode 3: Dennis Ivy Google Cloud Setup */}
        {viewMode === 'setup' && (
          <form onSubmit={handleSaveClientIdAndLaunch} className="p-6 pt-2 space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-red-500" />
                  Dennis Ivy Tutorial Setup
                </span>
                <a
                  href="https://youtu.be/TjMhPr59qn4?si=QS5WAlZUvPyo_yO2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1 text-[11px]"
                >
                  Watch Video <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Create project on <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a></li>
                <li>Configure OAuth Consent Screen (External)</li>
                <li>Create OAuth Client ID (Web Application):
                  <div className="pl-3.5 pt-0.5 space-y-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                    <div>Origin: <code className="bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">http://localhost:5173</code></div>
                    <div>Redirect URI: <code className="bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">http://localhost:5173/auth/google/callback</code></div>
                  </div>
                </li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Google Client ID
              </label>
              <input
                type="text"
                required
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setViewMode('choose')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Back to Chooser
              </button>
              <button
                type="submit"
                disabled={isLiveGoogleOpening}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center space-x-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLiveGoogleOpening ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Save & Launch Google</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Google Disclaimer Footer */}
        <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          <p>
            To continue, Google will share your name, email address, and profile picture with{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">IntellMeet</span>.
          </p>
          <div className="mt-2 flex items-center justify-center space-x-3 text-slate-400 dark:text-slate-500">
            <span className="hover:underline cursor-pointer">Help</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
