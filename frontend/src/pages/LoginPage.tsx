import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveToStorage } from '../utils/localStorage';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import AuthBlobs from '../components/AuthBlobs';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, socialLogin, isLoading, error: authError, clearError } = useAuth();
    const [displayedError, setDisplayedError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // NOWOŚĆ: Używamy useLocation do odczytania stanu przekazanego przez nawigację
    const location = useLocation();

   useEffect(() => {
    const redirectPath = location.state?.from;
    if (redirectPath) {
        // Używamy funkcji pomocniczej zamiast bezpośredniego wywołania
        saveToStorage('redirectAfterLogin', redirectPath);
    }

    const urlError = searchParams.get('error');
    if (urlError) {
      setDisplayedError(decodeURIComponent(urlError));
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [location.state, searchParams, setSearchParams]);

  useEffect(() => {
    if (authError) setDisplayedError(authError);
  }, [authError]);

  const clearAllErrors = () => {
    clearError();
    setDisplayedError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAllErrors();
    await login(email, password);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-white to-emerald-50">
      <AuthBlobs />
      <div className="relative bg-white shadow-xl rounded-2xl px-8 py-10 w-full max-w-md border border-gray-100 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-center text-gray-900">Logowanie</h1>

        {displayedError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center text-sm">
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { clearAllErrors(); setEmail(e.target.value); }}
              placeholder="Email"
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-700">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { clearAllErrors(); setPassword(e.target.value); }}
              placeholder="Hasło"
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-teal-700 hover:underline">
              Zapomniałeś hasła?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-semibold transition shadow-sm ${
              isLoading ? 'bg-teal-300 text-white cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            {isLoading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="text-center text-gray-500">lub</div>

        <div className="space-y-3">
          <button
            onClick={() => { clearAllErrors(); socialLogin('google'); }}
            className="flex items-center justify-center gap-3 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition"
          >
            <FaGoogle className="text-xl" /> Zaloguj przez Google
          </button>
          <button
            onClick={() => { clearAllErrors(); socialLogin('github'); }}
            className="flex items-center justify-center gap-3 w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded-lg transition"
          >
            <FaGithub className="text-xl" /> Zaloguj przez GitHub
          </button>
        </div>

        <p className="text-center text-sm text-gray-600">
          Nie masz konta?{' '}
          <Link to="/register" className="text-teal-700 hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
