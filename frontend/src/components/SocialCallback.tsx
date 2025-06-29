import React, { useEffect, useRef } from 'react'; // Dodajemy useRef
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SocialCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setTokenFromCallback } = useAuth();

    const hasCalledCallback = useRef(false);

    useEffect(() => {
        if (hasCalledCallback.current) {
            return;
        }

        const handleCallback = async () => {
            hasCalledCallback.current = true;

            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                navigate('/login?error=' + encodeURIComponent(error), { replace: true });
                return;
            }

            if (token) {
                try {
                    const destination = await setTokenFromCallback(token);
                    navigate(destination, { replace: true });
                } catch (error) {
                    console.log(error);
                    navigate('/login?error=Wystąpił błąd podczas finalizowania sesji.', { replace: true });
                }
            } else {
                navigate('/login?error=Nie udało się uzyskać tokena do logowania.', { replace: true });
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
