import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import AuthBlobs from '../components/AuthBlobs';

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
      <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-emerald-50">
        <AuthBlobs />
        <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-md border border-red-200">
          ❌ Brak lub nieprawidłowy token resetu.
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-emerald-50">
      <AuthBlobs />
      <div className="relative bg-white shadow-xl rounded-2xl p-8 max-w-md w-full space-y-4 border border-gray-100 animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-900">🔐 Ustaw nowe hasło</h2>
        {status === 'success' ? (
          <p className="text-emerald-700 text-center">
            ✅ Hasło zostało zresetowane! Za chwilę nastąpi przekierowanie...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nowe hasło"
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
              Resetuj hasło
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
