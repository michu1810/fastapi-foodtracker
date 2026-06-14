import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, Loader2, ShieldCheck } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const SocialCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback } = useAuth();
  const { t } = useTranslation();
  const hasCalledCallback = useRef(false);

  const provider = useMemo(() => {
    if (location.pathname.includes('github')) return 'github';
    if (location.pathname.includes('google')) return 'google';
    return 'oauth';
  }, [location.pathname]);

  useEffect(() => {
    if (hasCalledCallback.current) return;

    const handleCallback = async () => {
      hasCalledCallback.current = true;

      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
        return;
      }

      if (!token) {
        navigate(`/login?error=${encodeURIComponent(t('auth.oauth.missingToken'))}`, { replace: true });
        return;
      }

      try {
        const destination = await setTokenFromCallback(token);
        sessionStorage.setItem('foodtracker:auth-banner', provider);
        navigate(destination, { replace: true });
      } catch (callbackError) {
        console.error('OAuth callback failed:', callbackError);
        navigate(`/login?error=${encodeURIComponent(t('auth.oauth.finalizeError'))}`, { replace: true });
      }
    };

    void handleCallback();
  }, [searchParams, navigate, setTokenFromCallback, provider, t]);

  const ProviderIcon = provider === 'github' ? Github : provider === 'google' ? FaGoogle : ShieldCheck;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
          <ProviderIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
          {t('auth.oauth.finalizingTitle')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t('auth.oauth.finalizingBody')}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('auth.oauth.loading')}
        </div>
      </motion.div>
    </div>
  );
};

export default SocialCallback;
