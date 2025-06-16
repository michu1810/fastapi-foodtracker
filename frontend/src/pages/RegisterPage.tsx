import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage('Hasła nie są identyczne.');
      return;
    }
    if (!recaptchaToken) {
      setErrorMessage('Potwierdź, że nie jesteś robotem.');
      return;
    }
    try {
      await register(email, password, recaptchaToken);
      navigate('/email-verification-sent', { state: { email } });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail || 'Błąd rejestracji.';
      if (detail.includes('Google') || detail.includes('GitHub')) {
        setErrorMessage('Ten email jest powiązany z kontem społecznościowym. Użyj logowania społecznościowego.');
      } else if (detail.includes('already registered')) {
        setErrorMessage('Ten email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.');
      } else {
        setErrorMessage(detail);
      }
    }
  };

  return (
    <div className="min-h-screen bg-login-bg bg-cover bg-center flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md border border-white/20 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">📝 Rejestracja</h1>
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-100 rounded text-sm text-center">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
            placeholder="Email"
            className="w-full px-4 py-2 bg-white/30 placeholder-white text-white border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
            placeholder="Hasło"
            className="w-full px-4 py-2 bg-white/30 placeholder-white text-white border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            minLength={6}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
            placeholder="Powtórz hasło"
            className="w-full px-4 py-2 bg-white/30 placeholder-white text-white border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            minLength={6}
          />
          <div className="flex justify-center mt-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LecyFwrAAAAAJyyx5MGuDTHsLUURCn1H1wq25VR"
              onChange={(token) => setRecaptchaToken(token)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-semibold transition ${
              isLoading ? 'bg-blue-300 cursor-not-allowed text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-200 hover:underline"
          >
            Masz już konto? Zaloguj się
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
