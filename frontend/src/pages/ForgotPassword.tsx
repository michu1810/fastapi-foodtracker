import React, { useState } from 'react';
import { forgotPasswordRequest } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../components/auth/AuthLayout';

const ForgotPassword: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPasswordRequest(email);
      setStatus('sent');
      setTimeout(() => navigate('/login'), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg(t('auth.toasts.resetSentFail') || 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <AuthLayout>
      <div className="relative bg-white/90 backdrop-blur p-8 rounded-2xl border border-gray-100 max-w-md w-full text-gray-900 shadow-xl animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">
          🔐 {t('auth.forgotPage.title')}
        </h2>

        {status === 'sent' ? (
          <p className="text-emerald-700 text-center">
            ✅ {t('auth.toasts.resetSentOk')}
            <br />
            {i18n.language.startsWith('pl') ? 'Za chwilę nastąpi przekierowanie…' : 'Redirecting in a moment…'}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder={t('auth.email') || 'Email'}
              className="w-full bg-white text-gray-900 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {status === 'error' && (
              <p className="text-red-700 text-sm">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm"
            >
              {t('auth.forgotPage.send')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-teal-700 hover:underline text-sm"
          >
            {i18n.language.startsWith('pl') ? 'Powrót do logowania' : 'Back to login'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
