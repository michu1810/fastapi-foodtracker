import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { FaGoogle, FaGithub } from 'react-icons/fa';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, socialLogin, isLoading, error: authError, clearError } = useAuth();

  const [displayedError, setDisplayedError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setDisplayedError(decodeURIComponent(urlError));
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (authError) {
      setDisplayedError(authError);
    }
  }, [authError]);

  const clearAllErrors = () => {
    clearError();
    setDisplayedError(null);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAllErrors();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-login-bg bg-cover bg-center flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl px-8 py-10 w-full max-w-md border border-white/20 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-center text-white">Logowanie</h1>

        {displayedError && (
          <div className="p-3 bg-red-500/20 border border-red-500 text-red-100 rounded-lg text-center text-sm">
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-white">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                clearAllErrors();
                setEmail(e.target.value);
              }}
              placeholder="Email"
              className="w-full px-4 py-2 rounded-lg bg-white/30 text-white placeholder-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-white">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                clearAllErrors();
                setPassword(e.target.value);
              }}
              placeholder="Hasło"
              className="w-full px-4 py-2 rounded-lg bg-white/30 text-white placeholder-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-200 hover:underline">
              Zapomniałeś hasła?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-semibold transition ${
              isLoading ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="text-center text-white/70">lub</div>

        <div className="space-y-3">
          <button
            onClick={() => {
                clearAllErrors();
                socialLogin('google');
            }}
            className="flex items-center justify-center gap-3 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition"
          >
            <FaGoogle className="text-xl" /> Zaloguj przez Google
          </button>
          <button
            onClick={() => {
                clearAllErrors();
                socialLogin('github');
            }}
            className="flex items-center justify-center gap-3 w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded-lg transition"
          >
            <FaGithub className="text-xl" /> Zaloguj przez GitHub
          </button>
        </div>

        <p className="text-center text-sm text-white/80">
          Nie masz konta?{' '}
          <Link to="/register" className="text-blue-200 hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
