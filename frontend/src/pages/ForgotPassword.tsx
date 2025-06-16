import React, { useState } from 'react';
import { forgotPasswordRequest } from '../services/api';
import { useNavigate } from 'react-router-dom';

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
      setTimeout(() => navigate('/login'), 4000); // automatyczne przekierowanie
    } catch (err) {
      console.error(err);
      setErrorMsg('❌ Coś poszło nie tak. Spróbuj ponownie.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-login-bg bg-cover bg-center px-4">
      <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-lg border border-white/20 max-w-md w-full text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-center">🔐 Reset hasła</h2>
        {status === 'sent' ? (
          <p className="text-green-300 text-center">
            ✅ Jeśli konto istnieje, wysłaliśmy e-mail z linkiem do resetu hasła.
            <br />
            Za chwilę nastąpi przekierowanie...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-white/30 placeholder-white text-white border border-white/30 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {status === 'error' && (
              <p className="text-red-200 text-sm">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              Wyślij link resetu
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-200 hover:underline text-sm"
          >
            Powrót do logowania
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
