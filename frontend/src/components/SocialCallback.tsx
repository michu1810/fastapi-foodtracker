import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SocialCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Sprawdź czy jest token w URL params
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Social login error:', error);
        navigate('/login?error=' + encodeURIComponent(error));
        return;
      }

      if (token) {
        // Ustaw token i przekieruj na dashboard
        await setTokenFromCallback(token);
        navigate('/');
      } else {
        // Brak tokena - przekieruj na login
        navigate('/login?error=Nie udało się zalogować');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setTokenFromCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg">Logowanie...</span>
        </div>
      </div>
    </div>
  );
};

export default SocialCallback;