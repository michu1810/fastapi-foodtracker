import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { verifyAccount } from '../services/api';
import AuthBlobs from '../components/AuthBlobs';

type Status = 'success' | 'used' | 'expired' | 'invalid' | 'missing';

const VerifyAccount = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      setMessage('❌ Brak tokenu weryfikacyjnego.');
      setStatus('missing');
      return;
    }
    verifyAccount(token)
      .then((res) => {
        setStatus(res.status as Status);
        switch (res.status) {
          case 'success':
            setMessage('✅ Konto zweryfikowane!');
            break;
          case 'used':
            setMessage('ℹ️ Konto już było zweryfikowane.');
            break;
          case 'expired':
            setMessage('❌ Token wygasł.');
            break;
          default:
            setMessage('❌ Token nieprawidłowy.');
        }
      })
      .catch(() => {
        setMessage('❌ Błąd serwera.');
        setStatus('invalid');
      });
  }, [location]);

  const color =
    status === 'success'
      ? 'text-emerald-700'
      : status === 'used'
      ? 'text-teal-700'
      : 'text-red-700';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-emerald-50">
      <AuthBlobs />
      <div className="relative bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center border border-gray-100 animate-fade-in">
        <h2 className={`text-3xl font-bold mb-4 ${color}`}>Weryfikacja konta</h2>
        <p className="mb-6 text-gray-700">{message}</p>
        {(status === 'success' || status === 'used') && (
          <Link
            to="/login"
            className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg transition shadow-sm"
          >
            Przejdź do logowania
          </Link>
        )}
      </div>
    </div>
  );
};

export default VerifyAccount;
