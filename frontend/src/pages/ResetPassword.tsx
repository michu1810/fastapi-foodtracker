import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import { useTranslation } from 'react-i18next';

const ResetPassword: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const token = new URLSearchParams(location.search).get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(token!, password);
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(
        axiosErr.response?.data?.detail ||
          (t('auth.toasts.passwordSetFail') as string) ||
          'Failed to reset password.'
      );
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-md border border-red-200 max-w-md w-full text-center">
          ❌ {i18n.language.startsWith('pl') ? 'Brak lub nieprawidłowy token resetu.' : 'Missing or invalid reset token.'}
          <div className="mt-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-white border border-gray-200 text-gray-800"
            >
              {t('auth.back')}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 max-w-md w-full space-y-4 border border-gray-100 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
          🔐 {t('auth.resetPage.title')}
        </h2>

        {status === 'success' ? (
          <p className="text-emerald-700 text-center">
            ✅ {(t('auth.toasts.passwordSetOk') as string) || 'Password updated.'}{' '}
            {i18n.language.startsWith('pl') ? 'Za chwilę nastąpi przekierowanie…' : 'Redirecting…'}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password') || 'New password'}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              required
              minLength={6}
            />
            {status === 'error' && (
              <p className="text-red-700 text-sm">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 transition-colors text-white font-semibold py-2 rounded-lg shadow-sm"
            >
              {t('auth.resetPage.set')}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
