import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { loadFromStorage, clearStorageKey } from '../utils/localStorage';

interface User {
    id: number;
    email: string;
    createdAt?: string;
    avatar_url?: string;
    provider: string;
    send_expiration_notifications: boolean;
}

interface ApiError {
    response?: { data?: { detail?: string; message?: string } };
    message?: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, recaptchaToken: string) => Promise<void>;
    logout: () => Promise<void>;
    socialLogin: (provider: 'google' | 'github') => void;
    setTokenFromCallback: (token: string) => Promise<string>;
    clearError: () => void;
    updateAvatar: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate(); // Przenosimy navigate tutaj, będzie używane w logout

    useEffect(() => {
        const checkUserStatus = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                setToken(storedToken);
                try {
                    const res = await apiClient.get<User>('/auth/me');
                    setUser(res.data);
                } catch {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        checkUserStatus();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
            const newAccessToken = res.data.access_token;

            localStorage.setItem('token', newAccessToken);
            setToken(newAccessToken);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            const userRes = await apiClient.get<User>('/auth/me');
            setUser(userRes.data);

            // Logika przekierowania po standardowym logowaniu
            const redirectPath = loadFromStorage<string | null>('redirectAfterLogin', null);
            if (redirectPath) {
                clearStorageKey('redirectAfterLogin');
                navigate(redirectPath);
            } else {
                navigate('/');
            }
        } catch (err: unknown) {
            const axiosErr = err as ApiError;
            const msg =
                axiosErr.response?.data?.detail ||
                axiosErr.response?.data?.message ||
                axiosErr.message ||
                'Nie udało się zalogować. Sprawdź dane logowania.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    const register = useCallback(async (email: string, password: string, recaptchaToken: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await apiClient.post('/auth/register', { email, password, recaptcha_token: recaptchaToken });
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e.response?.data?.detail || e.response?.data?.message || e.message || 'Błąd rejestracji';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (err) {
            console.error('Błąd wylogowania:', err);
        } finally {
            localStorage.removeItem('token');
            delete apiClient.defaults.headers.common['Authorization'];
            setToken(null);
            setUser(null);
            navigate('/login');
        }
    }, [navigate]);

    const socialLogin = useCallback((provider: 'google' | 'github') => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;

        if (!apiUrl) {
            console.error("VITE_API_BASE_URL is not set!");
            setError("Błąd konfiguracji aplikacji. Prosimy o kontakt z administratorem.");
            return;
        }

        window.location.href = `${apiUrl}/${provider}/login`;
    }, []);

    const setTokenFromCallback = useCallback(async (cbToken: string): Promise<string> => {
        localStorage.setItem('token', cbToken);
        setToken(cbToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${cbToken}`;
        try {
            const res = await apiClient.get<User>('/auth/me');
            setUser(res.data);

            const redirectPath = loadFromStorage<string | null>('redirectAfterLogin', null);
            if (redirectPath) {
                clearStorageKey('redirectAfterLogin');
                return redirectPath;
            }
            return '/';
        } catch (err) {
            console.error("Błąd po ustawieniu tokena z callbacku:", err);
            await logout();
            setError('Błąd sesji OAuth. Spróbuj ponownie.');
            return '/login';
        }
    }, [logout]);

    const updateAvatar = (url: string) => {
        setUser(prev => prev ? { ...prev, avatar_url: url } : null);
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{
            user, token, isLoading, error,
            login, register, logout,
            socialLogin, setTokenFromCallback,
            clearError, updateAvatar
        }}>
            {children}
        </AuthContext.Provider>
    );
};
