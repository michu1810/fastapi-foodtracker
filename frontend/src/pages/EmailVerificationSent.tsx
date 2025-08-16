import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import { useTranslation } from 'react-i18next';

type NavState = { email?: string };

const EmailVerificationSent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as NavState | null)?.email;

  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canResend) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [canResend]);

  const resendVerification = async () => {
    if (!email || !canResend) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setMessage(t('auth.verifyPage.resendOk'));
      setCanResend(false);
      setCooldown(60);
    } catch {
      setMessage(t('auth.verifyPage.resendFail'));
    } finally {
      setLoading(false);
    }
  };

  const genericBody =
    i18n.language.startsWith('pl')
      ? 'Wysłaliśmy link weryfikacyjny.'
      : 'We sent a verification link.';

  return (
    <AuthLayout>
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 text-center text-gray-900 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          📬 {t('auth.emailSentPage.title')}
        </h2>

        <p className="mb-4">
          {email
            ? t('auth.emailSentPage.body', { email })
            : genericBody}
        </p>

        <p className="text-sm text-gray-600 mb-6">
          {i18n.language.startsWith('pl')
            ? 'Jeśli nie widzisz wiadomości, sprawdź SPAM lub poczekaj chwilę.'
            : "If you don't see the email, check SPAM or wait a moment."}
        </p>

        {message && <div className="text-teal-700 text-sm mb-3">{message}</div>}

        <button
          onClick={resendVerification}
          disabled={!canResend || loading || !email}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors mb-3 shadow-sm ${
            canResend && email
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-gray-300 text-white cursor-not-allowed'
          }`}
        >
          {loading
            ? (i18n.language.startsWith('pl') ? 'Wysyłanie…' : 'Sending…')
            : canResend && email
            ? t('auth.verifyPage.resend')
            : (i18n.language.startsWith('pl')
                ? `Spróbuj ponownie za ${cooldown}s`
                : `Try again in ${cooldown}s`)}
        </button>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-2 px-4 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-white transition border border-gray-200"
        >
          {t('auth.back')}
        </button>
      </div>
    </AuthLayout>
  );
};

export default EmailVerificationSent;
