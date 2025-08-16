import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { verifyAccount } from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import { useTranslation } from 'react-i18next';

type Status = 'success' | 'used' | 'expired' | 'invalid' | 'missing';

const VerifyAccount: React.FC = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      setStatus('missing');
      setMessage(t('auth.verifyResult.status.missing'));
      return;
    }
    verifyAccount(token)
      .then((res) => {
        const s = (res.status as Status) ?? 'invalid';
        setStatus(s);
        switch (s) {
          case 'success':
            setMessage(t('auth.verifyResult.status.success'));
            break;
          case 'used':
            setMessage(t('auth.verifyResult.status.used'));
            break;
          case 'expired':
            setMessage(t('auth.verifyResult.status.expired'));
            break;
          default:
            setMessage(t('auth.verifyResult.status.invalid'));
        }
      })
      .catch(() => {
        setStatus('invalid');
        setMessage(t('auth.verifyResult.status.invalid'));
      });
  }, [location, t]);

  const color =
    status === 'success'
      ? 'text-emerald-700'
      : status === 'used'
      ? 'text-teal-700'
      : 'text-red-700';

  return (
    <AuthLayout>
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 max-w-md w-full text-center border border-gray-100 animate-fade-in">
        <h2 className={`text-2xl sm:text-3xl font-bold mb-4 ${color}`}>
          {t('auth.verifyResult.title')}
        </h2>

        <p className="mb-6 text-gray-700">{message}</p>

        {(status === 'success' || status === 'used') && (
          <Link
            to="/login"
            className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg transition shadow-sm"
          >
            {t('auth.verifyResult.goLogin')}
          </Link>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyAccount;
