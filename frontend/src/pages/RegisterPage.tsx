import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import AuthBlobs from '../components/AuthBlobs';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    if (!acceptedTerms) {
      setErrorMessage('Musisz zaakceptować Regulamin i zapoznać się z Polityką prywatności.');
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
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AuthBlobs />
      <div className="relative bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">Rejestracja</h1>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
            placeholder="Email"
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
            placeholder="Hasło"
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            minLength={6}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
            placeholder="Powtórz hasło"
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            minLength={6}
          />

          {/* Checkbox akceptacji regulaminu i polityki */}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              required
            />
            <span>
              Akceptuję{' '}
              <Link to="/regulamin?from=register" className="text-teal-600 hover:underline">
                Regulamin
              </Link>{' '}
              i zapoznałem(-am) się z{' '}
              <Link to="/polityka-prywatnosci?from=register" className="text-teal-600 hover:underline">
                Polityką prywatności
              </Link>.
            </span>
          </label>

          {/* ReCAPTCHA */}
          <div className="flex justify-center mt-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LecyFwrAAAAAJyyx5MGuDTHsLUURCn1H1wq25VR"
              onChange={(token) => setRecaptchaToken(token)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className={`w-full py-2 rounded-lg font-semibold transition shadow-sm ${
              isLoading || !acceptedTerms
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white active:scale-[0.99]'
            }`}
          >
            {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Rejestrując się potwierdzasz, że masz co najmniej 16 lat lub zgodę opiekuna.
          </p>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:underline"
          >
            Masz już konto? Zaloguj się
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
