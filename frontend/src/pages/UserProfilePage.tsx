import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const UserProfilePage = () => {
    const { user, logout, updateAvatar } = useAuth();


    const fileInputRef = useRef<HTMLInputElement>(null);

    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null);
    const [showPw, setShowPw] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const navigate = useNavigate();

    const isPasswordUser = user?.provider === 'password';

    const changePw = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);
        try {
            await apiClient.post('/auth/change-password', {
                old_password: oldPw,
                new_password: newPw,
            });
            setStatus('✅ Hasło zmienione!');
            setOldPw('');
            setNewPw('');
        } catch (err: unknown) {
            const axiosErr = err as AxiosError<{ detail: string }>;
            const msg = axiosErr.response?.data?.detail || 'Błąd';
            setStatus(`❌ ${msg}`);
        }
    };

    const confirmDelete = async () => {
        try {
            await apiClient.delete('/auth/delete-account');
            logout();
        } catch {
            alert('Nie udało się usunąć konta.');
        }
    };

    const uploadAvatar = () => fileInputRef.current?.click();

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        try {
            const res = await apiClient.post<{ avatar_url: string }>('/auth/me/avatar', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const newAvatarUrl = res.data.avatar_url;
            setAvatar(newAvatarUrl);

            updateAvatar(newAvatarUrl);


        } catch {
            alert('❌ Nie udało się wysłać avatara.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center items-center">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-lg p-8 grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 flex flex-col items-center">
                    <div className="relative w-32 h-32 mb-4 group">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt="Avatar"
                                className="w-32 h-32 rounded-full object-cover border border-gray-300 shadow-md transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-5xl text-gray-400">
                                👤
                            </div>
                        )}
                        <button
                            onClick={uploadAvatar}
                            className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-transform hover:scale-105 ring-2 ring-white"
                            title="Zmień zdjęcie profilowe"
                        >
                            ✏️
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={onFileChange}
                        />
                    </div>

                    <p className="text-lg font-semibold">{user?.email}</p>
                    <p className="text-sm text-gray-500">
                        {user?.createdAt && `Zarejestrowano: ${new Date(user.createdAt).toLocaleDateString()}`}
                    </p>
                    <button
                        onClick={logout}
                        className="mt-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg w-full transition hover:scale-105"
                    >
                        Wyloguj się
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg w-full transition hover:scale-105"
                    >
                        ⬅ Powrót do strony głównej
                    </button>
                </div>
                <div className="md:col-span-2 space-y-8">
                    {isPasswordUser ? (
                        <form onSubmit={changePw} className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800">🔒 Zmień hasło</h2>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="Stare hasło"
                                    value={oldPw}
                                    onChange={(e) => setOldPw(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(p => !p)}
                                    className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                                >
                                    {showPw ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <input
                                type="password"
                                placeholder="Nowe hasło"
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                                minLength={6}
                            />
                            <AnimatePresence>
                                {status && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className={`text-sm ${status.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {status}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                                Zmień hasło
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800">🔒 Zmień hasło</h2>
                            <p className="text-gray-700">
                                Twoje konto jest połączone z dostawcą zewnętrznym. Hasłem możesz zarządzać w ustawieniach swojego konta w tym serwisie.
                            </p>
                        </div>
                    )}

                    <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold text-red-600 mb-2">⚠️ Usuń konto</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Ta operacja jest nieodwracalna. Wszystkie dane zostaną usunięte.
                        </p>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition hover:scale-105"
                        >
                            Usuń konto
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white p-6 rounded-lg shadow-lg text-center space-y-4 w-80"
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        >
                            <h3 className="text-lg font-semibold text-red-600">Na pewno?</h3>
                            <p className="text-sm text-gray-600">
                                Tej operacji nie można cofnąć. Wszystkie dane zostaną usunięte.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded-lg"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg"
                                >
                                    Usuń
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserProfilePage;
