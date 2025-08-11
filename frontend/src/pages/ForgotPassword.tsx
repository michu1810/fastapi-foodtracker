import React, { useState } from 'react';
import { forgotPasswordRequest } from '../services/api';
import { useNavigate } from 'react-router-dom';
import AuthBlobs from '../components/AuthBlobs';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPasswordRequest(email);
      setStatus('sent');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('❌ Coś poszło nie tak. Spróbuj ponownie.');
      setStatus('error');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-emerald-50 px-4">
      <AuthBlobs />
      <div className="relative bg-white p-8 rounded-2xl border border-gray-100 max-w-md w-full text-gray-900 shadow-xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-4 text-center">🔐 Reset hasła</h2>
        {status === 'sent' ? (
          <p className="text-emerald-700 text-center">
            ✅ Jeśli konto istnieje, wysłaliśmy e-mail z linkiem do resetu hasła.
            <br />
            Za chwilę nastąpi przekierowanie...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
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
              Wyślij link resetu
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-teal-700 hover:underline text-sm"
          >
            Powrót do logowania
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
