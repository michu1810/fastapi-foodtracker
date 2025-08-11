import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import AuthBlobs from '../components/AuthBlobs';

const EmailVerificationSent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canResend) {
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            setCanResend(true);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canResend]);

  const resendVerification = async () => {
    if (!email || !canResend) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setMessage('📨 Email został ponownie wysłany.');
      setCanResend(false);
      setCooldown(60);
    } catch {
      setMessage('❌ Nie udało się wysłać emaila. Spróbuj później.');
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="relative min-h-screen">
      <AuthBlobs />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div className="pointer-events-auto bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 text-center text-gray-900 animate-fade-in">
          <h2 className="text-3xl font-bold mb-4">📬 Sprawdź skrzynkę mailową</h2>
          <p className="mb-4">
            Wysłaliśmy maila z linkiem aktywacyjnym{email ? ` na: ${email}` : ''}.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Jeśli nie widzisz emaila, sprawdź SPAM lub poczekaj chwilę.
          </p>

          {message && <div className="text-teal-700 text-sm mb-3">{message}</div>}

          <button
            onClick={resendVerification}
            disabled={!canResend || loading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors mb-3 shadow-sm ${
              canResend
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-gray-300 text-white cursor-not-allowed'
            }`}
          >
            {loading
              ? 'Wysyłanie...'
              : canResend
              ? 'Wyślij ponownie email weryfikacyjny'
              : `Spróbuj ponownie za ${cooldown}s`}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 px-4 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-white transition border border-gray-200"
          >
            Powrót do logowania
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationSent;
