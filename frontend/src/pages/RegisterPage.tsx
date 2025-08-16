import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../components/auth/AuthLayout';

const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation();
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
      setErrorMessage(t('auth.errors.passwordsDontMatch'));
      return;
    }
    if (!acceptedTerms) {
      // prosty tekst – w tłumaczeniach mamy całe zdanie w agree, ale tu walidacja
      setErrorMessage(i18n.language.startsWith('pl')
        ? 'Musisz zaakceptować Regulamin i zapoznać się z Polityką prywatności.'
        : 'You must accept Terms and read the Privacy Policy.');
      return;
    }
    if (!recaptchaToken) {
      setErrorMessage(i18n.language.startsWith('pl')
        ? 'Potwierdź, że nie jesteś robotem.'
        : 'Please confirm you are not a robot.');
      return;
    }

    try {
      await register(email, password, recaptchaToken);
      navigate('/email-verification-sent', { state: { email } });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail || (i18n.language.startsWith('pl') ? 'Błąd rejestracji.' : 'Registration failed.');
      if (detail.includes('Google') || detail.includes('GitHub')) {
        setErrorMessage(
          i18n.language.startsWith('pl')
            ? 'Ten email jest powiązany z kontem społecznościowym. Użyj logowania społecznościowego.'
            : 'This email is linked to a social account. Use social login.'
        );
      } else if (detail.includes('already registered')) {
        setErrorMessage(
          i18n.language.startsWith('pl')
            ? 'Ten email jest już zarejestrowany. Zaloguj się lub zresetuj hasło.'
            : 'This email is already registered. Log in or reset your password.'
        );
      } else {
        setErrorMessage(detail);
      }
    }
  };

  return (
    <AuthLayout>
      <div className="relative bg-white/90 backdrop-blur rounded-2xl p-8 w-full border border-gray-100 shadow-xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">{t('auth.registerPage.title')}</h1>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
            placeholder={t('auth.email') || 'Email'}
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
            placeholder={t('auth.password') || 'Password'}
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            minLength={6}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
            placeholder={t('auth.confirmPassword') || 'Confirm password'}
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            minLength={6}
          />

          {/* akceptacja – tłumaczona z linkami przez <Trans/> */}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              required
            />
            <span>
              <Trans
                i18nKey="auth.registerPage.agree"
                components={{
                  privacy: <Link to="/polityka-prywatnosci?from=register" className="text-teal-600 hover:underline" />,
                  terms: <Link to="/regulamin?from=register" className="text-teal-600 hover:underline" />,
                }}
              />
            </span>
          </label>

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
            {isLoading ? `${t('auth.register')}...` : t('auth.register')}
          </button>

          <p className="text-xs text-gray-500 text-center">
            {i18n.language.startsWith('pl')
              ? 'Rejestrując się potwierdzasz, że masz co najmniej 16 lat lub zgodę opiekuna.'
              : 'By signing up you confirm you are at least 16 or have guardian consent.'}
          </p>
        </form>

        <div className="mt-2 text-center">
          <Link to="/login" className="text-sm text-gray-600 hover:underline">
            {i18n.language.startsWith('pl') ? 'Masz już konto? Zaloguj się' : 'Already have an account? Log in'}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
