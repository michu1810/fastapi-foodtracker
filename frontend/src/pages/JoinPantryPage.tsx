import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pantryService } from '../services/pantryService';
import toast from 'react-hot-toast';
import { usePantry } from '../context/PantryContext';
import { useAuth } from '../context/AuthContext';
import { saveToStorage } from '../utils/localStorage';
import axios from 'axios';
import AuthBlobs from '../components/AuthBlobs';

const JoinPantryPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectPantry, refreshPantries } = usePantry();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    if (!user) {
      if (!toastShownRef.current) {
        toast.error("Musisz się zalogować, aby dołączyć do spiżarni.");
        toastShownRef.current = true;
      }
      saveToStorage('redirectAfterLogin', `/join-pantry/${token}`);
      navigate('/login');
      return;
    }

    const accept = async () => {
      try {
        const newPantry = await pantryService.acceptInvitation(token);
        setStatus('success');
        await refreshPantries();
        selectPantry(newPantry.id);
        toast.success(`Pomyślnie dołączyłeś do spiżarni "${newPantry.name}"!`);
        navigate('/');
      } catch (error) {
        setStatus('error');
        if (axios.isAxiosError(error) && error.response) {
          setErrorMessage(error.response.data?.detail || "Wystąpił nieznany błąd.");
        } else {
          setErrorMessage("Wystąpił nieznany błąd połączenia.");
        }
      }
    };

    accept();
  }, [token, user, navigate, selectPantry, refreshPantries]);

  return (
    <div className="relative min-h-screen">
      <AuthBlobs />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div className="pointer-events-auto bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 text-center text-gray-900 animate-fade-in">
          {status === 'loading' && <p className="text-xl">Przetwarzanie zaproszenia...</p>}

          {status === 'error' && (
            <div>
              <h1 className="text-2xl font-bold text-red-700">Nie udało się dołączyć do spiżarni</h1>
              <p className="mt-2 text-gray-600">{errorMessage}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 font-semibold shadow-sm"
              >
                Wróć do strony głównej
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinPantryPage;
