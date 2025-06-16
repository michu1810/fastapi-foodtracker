import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';

const ResetPassword = () => {
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
      setErrorMsg(axiosErr.response?.data?.detail || 'Nie udało się zresetować hasła.');
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-login-bg bg-cover bg-center flex items-center justify-center px-4">
        <div className="bg-white/20 backdrop-blur-md text-red-600 p-6 rounded-lg shadow-md">
          ❌ Brak lub nieprawidłowy token resetu.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-login-bg bg-cover bg-center flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-4 border border-white/20 animate-fade-in-up">
        <h2 className="text-3xl font-bold text-center text-white">🔐 Ustaw nowe hasło</h2>
        {status === 'success' ? (
          <p className="text-green-300 text-center">
            ✅ Hasło zostało zresetowane! Za chwilę nastąpi przekierowanie...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nowe hasło"
              className="w-full px-4 py-2 bg-white/30 placeholder-white text-white border border-white/30 rounded focus:ring-2 focus:ring-blue-400"
              required
              minLength={6}
            />
            {status === 'error' && (
              <p className="text-red-200 text-sm">{errorMsg}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white font-semibold py-2 rounded-lg"
            >
              Resetuj hasło
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
