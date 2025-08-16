import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Switch } from '@headlessui/react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const UserProfilePage = () => {
  const { t } = useTranslation();
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();

  // Stany dla formularzy
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  // Stan dla modala usuwania konta
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Stan dla avatara
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null);

  // Powiadomienia
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.send_expiration_notifications ?? true
  );

  const isPasswordUser = user?.provider === 'password';

  useEffect(() => {
    if (user) {
      setNotificationsEnabled(user.send_expiration_notifications);
      setAvatar(user.avatar_url ?? null);
    }
  }, [user]);

  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      await apiClient.patch('/auth/me/settings', {
        send_expiration_notifications: enabled,
      });
      toast.success(t('profilePage.notificationsUpdated'));
    } catch (error) {
      toast.error(t('profilePage.notificationsSaveFailed'));
      setNotificationsEnabled(!enabled);
      console.error('Notification settings update error:', error);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      await apiClient.post('/auth/change-password', {
        old_password: oldPw,
        new_password: newPw,
      });
      setStatus(`✅ ${t('profilePage.passwordChanged')}`);
      setOldPw('');
      setNewPw('');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      const msg =
        axiosErr.response?.data?.detail ||
        t('profilePage.passwordChangeFailed');
      setStatus(`❌ ${msg}`);
    }
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete('/auth/delete-account');
      logout();
    } catch {
      toast.error(t('profilePage.deleteFailed'));
    }
    setShowConfirmModal(false);
  };

  const uploadAvatar = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await apiClient.post<{ avatar_url: string }>(
        '/auth/me/avatar',
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const newAvatarUrl = res.data.avatar_url;
      setAvatar(newAvatarUrl);
      updateAvatar(newAvatarUrl);
      toast.success(t('profilePage.avatarUpdated'));
    } catch {
      toast.error(t('profilePage.avatarUploadFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4 flex justify-center items-center">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700 rounded-2xl shadow-lg p-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4 group">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border border-gray-300 dark:border-slate-600 shadow-md transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-5xl text-gray-400 dark:text-slate-300">
                👤
              </div>
            )}
            <button
              onClick={uploadAvatar}
              className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-transform hover:scale-105 ring-2 ring-white dark:ring-slate-900"
              title={t('profilePage.changeAvatarTitle')}
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
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {user?.createdAt &&
              `${t('profilePage.registeredAt')} ${new Date(
                user.createdAt
              ).toLocaleDateString()}`}
          </p>

          <button
            onClick={logout}
            className="mt-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg w-full transition hover:scale-105"
          >
            {t('logout')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 px-4 py-2 rounded-lg w-full transition hover:scale-105"
          >
            {t('profilePage.backHome')}
          </button>
        </div>

        <div className="md:col-span-2 space-y-8">
          {/* Powiadomienia */}
          <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
              🔔 {t('profilePage.notificationsTitle')}
            </h2>
            <Switch.Group as="div" className="flex items-center justify-between">
              <Switch.Label as="span" className="flex-grow flex flex-col" passive>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {t('profilePage.expiringLabel')}
                </span>
                <span className="text-sm text-gray-500 dark:text-slate-300">
                  {t('profilePage.expiringHint')}
                </span>
              </Switch.Label>
              <Switch
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ui-checked:bg-blue-600 ui-not-checked:bg-gray-400"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ui-checked:translate-x-5 ui-not-checked:translate-x-0"
                />
              </Switch>
            </Switch.Group>
          </div>

          {/* Zmiana hasła */}
          {isPasswordUser ? (
            <form
              onSubmit={changePw}
              className="space-y-4 bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                🔒 {t('profilePage.changePasswordTitle')}
              </h2>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('profilePage.oldPasswordPlaceholder')}
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg pr-10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 dark:text-slate-300"
                >
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <input
                type="password"
                placeholder={t('profilePage.newPasswordPlaceholder')}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                required
                minLength={6}
              />
              <AnimatePresence>
                {status && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`text-sm ${
                      status.startsWith('✅') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {status}
                  </motion.p>
                )}
              </AnimatePresence>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                {t('profilePage.changePassword')}
              </button>
            </form>
          ) : (
            <div className="space-y-4 bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                🔒 {t('profilePage.changePasswordTitle')}
              </h2>
              <p className="text-gray-700 dark:text-slate-200">
                {t('profilePage.externalPasswordInfo')}
              </p>
            </div>
          )}

          {/* Usuwanie konta */}
          <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm dark:bg-red-900/20 dark:border-red-800">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              ⚠️ {t('profilePage.deleteTitle')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              {t('profilePage.deleteDescription')}
            </p>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition hover:scale-105"
            >
              {t('profilePage.deleteButton')}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 dark:text-slate-200 p-6 rounded-lg shadow-lg text-center space-y-4 w-80 border border-transparent dark:border-slate-700"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {t('profilePage.deleteModalTitle')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {t('profilePage.deleteModalDescription')}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 px-4 py-1.5 rounded-lg"
                >
                  {t('profilePage.cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg"
                >
                  {t('profilePage.delete')}
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
