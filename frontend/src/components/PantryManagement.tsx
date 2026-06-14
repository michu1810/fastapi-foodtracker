import { useEffect, useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Copy,
  Crown,
  DoorOpen,
  Edit3,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { pantryService } from '../services/pantryService';
import type { PantryRead, PantryUser_Association } from '../services/pantryService';
import { useAuth } from '../context/AuthContext';

interface PantryManagementProps {
  pantry: PantryRead;
  pantryCount: number;
  onDataChange: () => void;
}

type ConfirmAction = {
  kind: 'removeMember' | 'deletePantry' | 'leavePantry';
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'red' | 'amber';
  onConfirm: () => Promise<void>;
};

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function ownerFirst(a: PantryUser_Association, b: PantryUser_Association) {
  if (a.role === b.role) return a.user.email.localeCompare(b.user.email);
  return a.role === 'owner' ? -1 : 1;
}

export const PantryManagement = ({ pantry, pantryCount, onDataChange }: PantryManagementProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const inviteInputId = useId();

  const [newName, setNewName] = useState(pantry.name);
  const [inviteLink, setInviteLink] = useState('');
  const [newPantryName, setNewPantryName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const isOwner = pantry.owner_id === user?.id;
  const sortedMembers = useMemo(
    () => [...pantry.member_associations].sort(ownerFirst),
    [pantry.member_associations]
  );
  const owner = sortedMembers.find((association) => association.role === 'owner')?.user;
  const hasPendingNameChange = newName.trim() !== '' && newName.trim() !== pantry.name;

  useEffect(() => {
    setNewName(pantry.name);
    setInviteLink('');
  }, [pantry.id, pantry.name]);

  const refreshAfterMutation = async () => {
    await onDataChange();
  };

  const handleRenamePantry = async () => {
    if (!hasPendingNameChange) {
      toast.error(t('pantryMgmt.toasts.nameEmpty'));
      return;
    }

    setBusyAction('rename');
    try {
      await pantryService.updatePantry(pantry.id, newName.trim());
      toast.success(t('pantryMgmt.toasts.renameOk'));
      await refreshAfterMutation();
    } catch (error) {
      console.error('Rename pantry failed:', error);
      toast.error(t('pantryMgmt.toasts.renameFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateLink = async () => {
    setBusyAction('invite');
    try {
      const response = await pantryService.createInvitation(pantry.id);
      setInviteLink(response.invite_link);
      toast.success(t('pantryMgmt.toasts.inviteOk'));
    } catch (error) {
      console.error('Generate pantry invite failed:', error);
      toast.error(t('pantryMgmt.toasts.inviteFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t('pantryMgmt.toasts.copyOk'));
    } catch (error) {
      console.error('Copy invite failed:', error);
      toast.error(t('pantryMgmt.toasts.copyFail'));
    }
  };

  const handleCreatePantry = async () => {
    if (newPantryName.trim().length < 2) {
      toast.error(t('pantryMgmt.toasts.createNameTooShort'));
      return;
    }

    setBusyAction('create');
    try {
      await pantryService.createPantry(newPantryName.trim());
      toast.success(t('pantryMgmt.toasts.createOk', { name: newPantryName.trim() }));
      setIsCreateModalOpen(false);
      setNewPantryName('');
      await refreshAfterMutation();
    } catch (error: unknown) {
      console.error('Create pantry failed:', error);
      const apiError = error as { response?: { data?: { detail?: string } } };
      toast.error(apiError.response?.data?.detail || t('pantryMgmt.toasts.createFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const performRemoveMember = async (memberId: number) => {
    setBusyAction(`remove-${memberId}`);
    try {
      await pantryService.removeMember(pantry.id, memberId);
      toast.success(t('pantryMgmt.toasts.removeOk'));
      setConfirmAction(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Remove member failed:', error);
      toast.error(t('pantryMgmt.toasts.removeFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const performDeletePantry = async () => {
    setBusyAction('delete');
    try {
      await pantryService.deletePantry(pantry.id);
      localStorage.removeItem('selectedPantryId');
      toast.success(t('pantryMgmt.toasts.deleteOk'));
      setConfirmAction(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Delete pantry failed:', error);
      toast.error(t('pantryMgmt.toasts.deleteFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const performLeavePantry = async () => {
    setBusyAction('leave');
    try {
      await pantryService.leavePantry(pantry.id);
      localStorage.removeItem('selectedPantryId');
      toast.success(t('pantryMgmt.toasts.leaveOk', { name: pantry.name }));
      setConfirmAction(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Leave pantry failed:', error);
      toast.error(t('pantryMgmt.toasts.leaveFail'));
    } finally {
      setBusyAction(null);
    }
  };

  const openRemoveMemberModal = (association: PantryUser_Association) => {
    setConfirmAction({
      kind: 'removeMember',
      title: t('pantryMgmt.modals.removeTitle'),
      message: t('pantryMgmt.modals.removeMsgWithEmail', { email: association.user.email }),
      confirmLabel: t('pantryMgmt.removeMember'),
      tone: 'red',
      onConfirm: () => performRemoveMember(association.user.id),
    });
  };

  const openDeletePantryModal = () => {
    setConfirmAction({
      kind: 'deletePantry',
      title: t('pantryMgmt.modals.deleteTitle'),
      message: t('pantryMgmt.modals.deleteMsg', { name: pantry.name }),
      confirmLabel: t('pantryMgmt.deletePantry'),
      tone: 'red',
      onConfirm: performDeletePantry,
    });
  };

  const openLeavePantryModal = () => {
    setConfirmAction({
      kind: 'leavePantry',
      title: t('pantryMgmt.modals.leaveTitle'),
      message: t('pantryMgmt.modals.leaveMsg'),
      confirmLabel: t('pantryMgmt.leavePantry'),
      tone: 'amber',
      onConfirm: performLeavePantry,
    });
  };

  return (
    <>
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-slate-200 p-5 dark:border-slate-700 lg:border-b-0 lg:border-r">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                <Warehouse className="h-4 w-4" aria-hidden="true" />
                {t('pantryMgmt.overview.eyebrow')}
              </p>
              <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {pantry.name}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {isOwner ? t('pantryMgmt.overview.ownerBody') : t('pantryMgmt.overview.memberBody')}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric icon={Users} label={t('pantryMgmt.overview.members')} value={String(sortedMembers.length)} />
                <Metric icon={Crown} label={t('pantryMgmt.overview.owner')} value={owner?.email ?? '-'} compact />
                <Metric icon={ShieldCheck} label={t('pantryMgmt.overview.role')} value={isOwner ? t('pantryMgmt.role.owner') : t('pantryMgmt.role.member')} />
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-500/30 dark:bg-teal-500/10">
                <p className="flex items-center gap-2 text-sm font-bold text-teal-900 dark:text-teal-100">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {t('pantryMgmt.overview.quickWinTitle')}
                </p>
                <p className="mt-2 text-sm leading-6 text-teal-800/80 dark:text-teal-100/75">
                  {t('pantryMgmt.overview.quickWinBody')}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-900"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('pantryMgmt.createButton')}
                </button>
                <p className="mt-2 text-xs text-teal-800/70 dark:text-teal-100/65">
                  {t('pantryMgmt.createLimit', { count: pantryCount })}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel
            icon={Edit3}
            title={t('pantryMgmt.renameTitle')}
            description={isOwner ? t('pantryMgmt.renameHint') : t('pantryMgmt.ownerOnlyRenameHint')}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="pantry-name">
                {t('pantryMgmt.renameTitle')}
              </label>
              <input
                id="pantry-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                disabled={!isOwner}
              />
              <button
                type="button"
                onClick={handleRenamePantry}
                disabled={!isOwner || !hasPendingNameChange || busyAction === 'rename'}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-slate-900 sm:w-32"
              >
                {busyAction === 'rename' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('pantryMgmt.save')}
              </button>
            </div>
          </Panel>

          <Panel
            icon={Link2}
            title={t('pantryMgmt.inviteNew')}
            description={isOwner ? t('pantryMgmt.inviteHint') : t('pantryMgmt.inviteOwnerOnly')}
          >
            {isOwner && (
              inviteLink ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="sr-only" htmlFor={inviteInputId}>{t('pantryMgmt.inviteNew')}</label>
                    <input
                      id={inviteInputId}
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-900 sm:w-36"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {t('pantryMgmt.copy')}
                    </button>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {t('pantryMgmt.inviteValid15m')}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={busyAction === 'invite'}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 dark:focus-visible:ring-offset-slate-900"
                >
                  {busyAction === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                  {busyAction === 'invite' ? t('pantryMgmt.generating') : t('pantryMgmt.generateInvite')}
                </button>
              )
            )}
          </Panel>
        </div>

        <Panel icon={Users} title={t('pantryMgmt.membersInvitesTitle')} description={t('pantryMgmt.membersHint')}>
          <div className="grid gap-3 md:grid-cols-2">
            {sortedMembers.map((association) => (
              <article
                key={association.user.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {association.user.avatar_url ? (
                    <img
                      src={association.user.avatar_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                      {initials(association.user.email)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{association.user.email}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {association.role === 'owner' && <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />}
                      {association.role === 'owner' ? t('pantryMgmt.role.owner') : t('pantryMgmt.role.member')}
                    </p>
                  </div>
                </div>
                {isOwner && association.user.id !== pantry.owner_id && (
                  <button
                    type="button"
                    onClick={() => openRemoveMemberModal(association)}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10 dark:focus-visible:ring-offset-slate-900"
                    aria-label={t('pantryMgmt.removeMemberAria', { email: association.user.email })}
                  >
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </article>
            ))}
          </div>
        </Panel>

        <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-md dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-red-700 dark:text-red-200">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                {t('pantryMgmt.irreversibleTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-100/80">
                {isOwner ? t('pantryMgmt.dangerOwnerHint') : t('pantryMgmt.dangerMemberHint')}
              </p>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={openDeletePantryModal}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-950 sm:w-48"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('pantryMgmt.deletePantry')}
              </button>
            ) : (
              <button
                type="button"
                onClick={openLeavePantryModal}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-950 sm:w-48"
              >
                <DoorOpen className="h-4 w-4" aria-hidden="true" />
                {t('pantryMgmt.leavePantry')}
              </button>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        action={confirmAction}
        isBusy={!!busyAction && ['delete', 'leave'].includes(busyAction)}
        onClose={() => setConfirmAction(null)}
      />

      <CreatePantryDialog
        isOpen={isCreateModalOpen}
        value={newPantryName}
        isBusy={busyAction === 'create'}
        onChange={setNewPantryName}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreatePantry}
      />
    </>
  );
};

type MetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  compact?: boolean;
};

function Metric({ icon: Icon, label, value, compact }: MetricProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <Icon className="h-4 w-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 font-bold text-slate-950 dark:text-white ${compact ? 'truncate text-sm' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  );
}

type PanelProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
};

function Panel({ icon: Icon, title, description, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ConfirmDialog({
  action,
  isBusy,
  onClose,
}: {
  action: ConfirmAction | null;
  isBusy: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pantry-confirm-title"
        >
          <motion.div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${action.tone === 'red' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'}`}>
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="pantry-confirm-title" className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              {action.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{action.message}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              >
                {t('pantryMgmt.modals.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void action.onConfirm()}
                disabled={isBusy}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${action.tone === 'red' ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' : 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500'}`}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {action.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CreatePantryDialog({
  isOpen,
  value,
  isBusy,
  onChange,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  value: string;
  isBusy: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-pantry-title"
        >
          <motion.div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
              <Warehouse className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="create-pantry-title" className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              {t('pantryMgmt.modals.createTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t('pantryMgmt.modals.createBody')}
            </p>
            <label className="sr-only" htmlFor="new-pantry-name">
              {t('pantryMgmt.modals.namePlaceholder')}
            </label>
            <input
              id="new-pantry-name"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={t('pantryMgmt.modals.namePlaceholder')}
              maxLength={50}
              className="mt-4 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              >
                {t('pantryMgmt.modals.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('pantryMgmt.modals.create')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
