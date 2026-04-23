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
import {
  ArrowRight,
  ArrowLeft,
  BellRing,
  Camera,
  LockKeyhole,
  LogOut,
  ShieldAlert,
  Sparkles,
  UserRound,
  CalendarDays,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const UserProfilePage = () => {
  const { t } = useTranslation();
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null);
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
      setStatus(`success:${t('profilePage.passwordChanged')}`);
      setOldPw('');
      setNewPw('');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      const msg =
        axiosErr.response?.data?.detail || t('profilePage.passwordChangeFailed');
      setStatus(`error:${msg}`);
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

  const statusIsSuccess = status?.startsWith('success:');
  const statusMessage = status?.includes(':') ? status.split(':').slice(1).join(':') : status;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-slate-900">
      {/* Back link */}
      <div className="mx-auto mb-6 max-w-5xl">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('profilePage.backHome')}
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-3">
        {/* ── LEFT SIDEBAR ── */}
        <motion.aside
          {...fadeUp}
          className="flex flex-col gap-4 md:col-span-1"
        >
          {/* Avatar card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-white shadow-md dark:bg-slate-800">
            {/* subtle top gradient bar */}
            <div className="h-20 w-full bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-violet-500/20" />

            <div className="flex flex-col items-center px-6 pb-6">
              {/* Avatar */}
              <div className="group relative -mt-10 mb-3">
                <div className="h-20 w-20 rounded-full p-[3px] ring-4 ring-white dark:ring-slate-800"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                      <UserRound className="h-9 w-9 text-slate-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={uploadAvatar}
                  className="absolute bottom-0 right-0 rounded-full bg-cyan-500 p-1.5 text-white shadow-md ring-2 ring-white transition hover:bg-cyan-600 dark:ring-slate-800"
                  title={t('profilePage.changeAvatarTitle')}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              <p className="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
                {user?.email}
              </p>

              {user?.createdAt && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  <CalendarDays className="h-3 w-3" />
                  {t('profilePage.registeredAt')}{' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              )}

              <div className="mt-5 w-full border-t border-slate-100 pt-5 dark:border-slate-700" />

              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500"
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </button>
            </div>
          </div>

          {/* iPurel brand card — compact vertical */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(22,36,58,0.97))] p-5 shadow-[0_8px_40px_-12px_rgba(34,211,238,0.45)]"
          >
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
              <Sparkles className="h-3 w-3" />
              iPurel
            </div>
            <h3 className="text-sm font-semibold leading-snug text-white">
              {t('profilePage.startupBannerTitle', {
                defaultValue: 'iPurel buduje bardziej inteligentne doświadczenie wokół codziennych nawyków.',
              })}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {t('profilePage.startupBannerDescription', {
                defaultValue:
                  'FoodTracker to część większej wizji iPurel: produktów, które upraszczają życie, ograniczają straty i wyglądają nowocześnie bez zbędnego chaosu.',
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                t('profilePage.startupPillWaste', { defaultValue: 'mniej marnowania' }),
                t('profilePage.startupPillAutomation', { defaultValue: 'sprytne automatyzacje' }),
                t('profilePage.startupPillExperience', { defaultValue: 'dopieszczony UX' }),
              ].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300"
                >
                  {pill}
                </span>
              ))}
            </div>
            <a
              href="https://ipurel.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3.5 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/25"
            >
              {t('profilePage.startupCardCta', { defaultValue: 'Poznaj kierunek marki' })}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </motion.aside>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex flex-col gap-5 md:col-span-2">

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15">
                <BellRing className="h-4 w-4 text-amber-400" />
              </span>
              {t('profilePage.notificationsTitle')}
            </h2>
            <Switch.Group
              as="div"
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 dark:border-slate-700 dark:bg-slate-700/40"
            >
              <Switch.Label as="span" className="flex flex-grow flex-col" passive>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {t('profilePage.expiringLabel')}
                </span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('profilePage.expiringHint')}
                </span>
              </Switch.Label>
              <Switch
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ui-checked:bg-blue-500 ui-not-checked:bg-slate-300 dark:ui-not-checked:bg-slate-600"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ui-checked:translate-x-5 ui-not-checked:translate-x-0"
                />
              </Switch>
            </Switch.Group>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15">
                <LockKeyhole className="h-4 w-4 text-blue-400" />
              </span>
              {t('profilePage.changePasswordTitle')}
            </h2>

            {isPasswordUser ? (
              <form onSubmit={changePw} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder={t('profilePage.oldPasswordPlaceholder')}
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPw ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder={t('profilePage.newPasswordPlaceholder')}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500"
                  required
                  minLength={6}
                />

                <AnimatePresence>
                  {statusMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        statusIsSuccess
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {statusMessage}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  {t('profilePage.changePassword')}
                </button>
              </form>
            ) : (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
                {t('profilePage.externalPasswordInfo')}
              </p>
            )}
          </motion.div>

          {/* Danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-2xl border border-red-200/70 bg-red-50/60 p-6 shadow-sm dark:border-red-800/40 dark:bg-red-950/20"
          >
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-red-600 dark:text-red-400">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10">
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </span>
              {t('profilePage.deleteTitle')}
            </h2>
            <p className="mb-4 ml-10 text-sm text-slate-500 dark:text-slate-400">
              {t('profilePage.deleteDescription')}
            </p>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-xl border border-red-300 bg-white py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500 hover:text-white dark:border-red-700 dark:bg-transparent dark:hover:bg-red-600"
            >
              {t('profilePage.deleteButton')}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-80 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldAlert className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {t('profilePage.deleteModalTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('profilePage.deleteModalDescription')}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  {t('profilePage.cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-medium text-white transition hover:bg-red-600"
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
