import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Github, Loader2, LogIn, ShieldAlert, Users } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { usePantry } from '../context/PantryContext';
import { pantryService } from '../services/pantryService';
import type { PantryRead } from '../services/pantryService';
import { saveToStorage } from '../utils/localStorage';

type JoinStatus = 'checking-auth' | 'needs-login' | 'accepting' | 'success' | 'error';

export default function JoinPantryPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading, socialLogin } = useAuth();
  const { refreshPantries } = usePantry();
  const [status, setStatus] = useState<JoinStatus>('checking-auth');
  const [errorMessage, setErrorMessage] = useState('');
  const [joinedPantry, setJoinedPantry] = useState<PantryRead | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const acceptStartedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('auth.joinPantry.invalid'));
      return;
    }

    const invitePath = `/join-pantry/${token}`;
    saveToStorage('redirectAfterLogin', invitePath);

    if (isLoading) {
      setStatus('checking-auth');
      return;
    }

    if (!user) {
      setStatus('needs-login');
      return;
    }

    if (acceptStartedRef.current) return;
    acceptStartedRef.current = true;
    setStatus('accepting');

    const acceptInvite = async () => {
      try {
        const pantry = await pantryService.acceptInvitation(token);
        localStorage.setItem('selectedPantryId', String(pantry.id));
        await refreshPantries();
        setJoinedPantry(pantry);
        setStatus('success');
      } catch (error) {
        console.error('Accept pantry invitation failed:', error);
        setStatus('error');
        acceptStartedRef.current = false;
        if (axios.isAxiosError(error) && error.response) {
          setErrorMessage(error.response.data?.detail || t('auth.joinPantry.fail'));
        } else {
          setErrorMessage(t('auth.joinPantry.connectionFail'));
        }
      }
    };

    void acceptInvite();
  }, [token, user, isLoading, refreshPantries, t, retryNonce]);

  const handleSocialLogin = (provider: 'google' | 'github') => {
    if (token) saveToStorage('redirectAfterLogin', `/join-pantry/${token}`);
    socialLogin(provider);
  };

  return (
    <AuthLayout>
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10">
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-slate-950 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-white"
          aria-live="polite"
        >
          {(status === 'checking-auth' || status === 'accepting') && (
            <InviteState
              icon={<Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />}
              eyebrow={status === 'checking-auth' ? t('auth.joinPantry.checkingEyebrow') : t('auth.joinPantry.acceptingEyebrow')}
              title={status === 'checking-auth' ? t('auth.joinPantry.checkingTitle') : t('auth.joinPantry.acceptingTitle')}
              body={status === 'checking-auth' ? t('auth.joinPantry.checkingBody') : t('auth.joinPantry.acceptingBody')}
            />
          )}

          {status === 'needs-login' && (
            <div>
              <InviteState
                icon={<Users className="h-7 w-7" aria-hidden="true" />}
                eyebrow={t('auth.joinPantry.loginEyebrow')}
                title={t('auth.joinPantry.loginTitle')}
                body={t('auth.joinPantry.loginBody')}
              />
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-900"
                >
                  <FaGoogle className="h-5 w-5" aria-hidden="true" />
                  {t('auth.oauth.google')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 active:scale-95 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                  {t('auth.oauth.github')}
                </button>
                <Link
                  to="/login"
                  state={{ from: token ? `/join-pantry/${token}` : '/' }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {t('auth.joinPantry.emailLogin')}
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div>
              <InviteState
                icon={<CheckCircle2 className="h-7 w-7" aria-hidden="true" />}
                eyebrow={t('auth.joinPantry.successEyebrow')}
                title={t('auth.joinPantry.successTitle', { name: joinedPantry?.name ?? '' })}
                body={t('auth.joinPantry.successBody')}
                tone="success"
              />
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-900"
              >
                {t('auth.joinPantry.goDashboard')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div>
              <InviteState
                icon={<ShieldAlert className="h-7 w-7" aria-hidden="true" />}
                eyebrow={t('auth.joinPantry.errorEyebrow')}
                title={t('auth.joinPantry.errorTitle')}
                body={errorMessage || t('auth.joinPantry.fail')}
                tone="error"
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                >
                  {t('auth.joinPantry.backHome')}
                </button>
                {token && (
                  <button
                    type="button"
                    onClick={() => {
                      acceptStartedRef.current = false;
                      setErrorMessage('');
                      setRetryNonce((value) => value + 1);
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    {t('auth.joinPantry.tryAgain')}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </AuthLayout>
  );
}

function InviteState({
  icon,
  eyebrow,
  title,
  body,
  tone = 'default',
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  tone?: 'default' | 'success' | 'error';
}) {
  const toneClass = {
    default: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    error: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  }[tone];

  return (
    <div className="text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {body}
      </p>
    </div>
  );
}
