import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { verifyAccount } from '../services/api';

type Status = 'success' | 'used' | 'expired' | 'invalid' | 'missing';

const VerifyAccount = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      setMessage('❌ Brak tokenu weryfikacyjnym.');
      setStatus('missing');
      return;
    }
    verifyAccount(token)
      .then((res) => {
        setStatus(res.status);
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

  const color = status === 'success'
    ? 'text-green-300'
    : status === 'used'
    ? 'text-blue-300'
    : 'text-red-300';

  return (
    <div className="min-h-screen bg-login-bg bg-cover bg-center flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 max-w-md w-full text-center text-white border border-white/20 animate-fade-in">
        <h2 className={`text-3xl font-bold mb-4 ${color}`}>Weryfikacja konta</h2>
        <p className="mb-6">{message}</p>
        {(status === 'success' || status === 'used') && (
          <Link
            to="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition"
          >
            Przejdź do logowania
          </Link>
        )}
      </div>
    </div>
  );
};

export default VerifyAccount;
