import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { pantryService } from '../services/pantryService';
import type { PantryRead } from '../services/pantryService';
import { FaCopy, FaUsers, FaPen, FaPlusCircle, FaTrash, FaSignOutAlt, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PantryManagementProps {
  pantry: PantryRead;
  onDataChange: () => void;
}

type ModalAction = 'removeMember' | 'deletePantry' | 'leavePantry' | 'createPantry';
interface ModalState {
  isOpen: boolean;
  action: ModalAction | null;
  title: string;
  message: string;
  targetId?: number;
  onConfirm: () => void;
}

export const PantryManagement: React.FC<PantryManagementProps> = ({ pantry, onDataChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [newName, setNewName] = useState(pantry.name);
  const [inviteLink, setInviteLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPantryName, setNewPantryName] = useState('');

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isOwner = pantry.owner_id === user?.id;

  const handleRenamePantry = async () => {
    if (newName.trim() === '' || newName === pantry.name) {
      toast.error(t('pantryMgmt.toasts.nameEmpty'));
      return;
    }
    try {
      await pantryService.updatePantry(pantry.id, newName);
      toast.success(t('pantryMgmt.toasts.renameOk'));
      onDataChange();
    } catch (error) {
      console.log(error);
      toast.error(t('pantryMgmt.toasts.renameFail'));
    }
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await pantryService.createInvitation(pantry.id);
      setInviteLink(response.invite_link);
      toast.success(t('pantryMgmt.toasts.inviteOk'));
    } catch (error) {
      console.log(error);
      toast.error(t('pantryMgmt.toasts.inviteFail'));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success(t('pantryMgmt.toasts.copyOk'));
  };

  const openRemoveMemberModal = (memberId: number) => {
    setModalState({
      isOpen: true,
      action: 'removeMember',
      title: t('pantryMgmt.modals.removeTitle'),
      message: t('pantryMgmt.modals.removeMsg'),
      onConfirm: () => performRemoveMember(memberId),
    });
  };

  const openDeletePantryModal = () => {
    setModalState({
      isOpen: true,
      action: 'deletePantry',
      title: t('pantryMgmt.modals.deleteTitle'),
      message: t('pantryMgmt.modals.deleteMsg', { name: pantry.name }),
      onConfirm: performDeletePantry,
    });
  };

  const openLeavePantryModal = () => {
    setModalState({
      isOpen: true,
      action: 'leavePantry',
      title: t('pantryMgmt.modals.leaveTitle'),
      message: t('pantryMgmt.modals.leaveMsg'),
      onConfirm: performLeavePantry,
    });
  };

  const handleCreatePantry = async () => {
    if (newPantryName.trim().length < 2) {
      toast.error(t('pantryMgmt.toasts.createNameTooShort'));
      return;
    }
    try {
      await pantryService.createPantry(newPantryName);
      toast.success(t('pantryMgmt.toasts.createOk', { name: newPantryName }));
      onDataChange();
      setIsCreateModalOpen(false);
      setNewPantryName('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.detail || t('pantryMgmt.toasts.createFail');
      toast.error(errorMessage);
    }
  };

  const performRemoveMember = async (memberId: number) => {
    try {
      await pantryService.removeMember(pantry.id, memberId);
      toast.success(t('pantryMgmt.toasts.removeOk'));
      onDataChange();
    } catch (error) {
      console.log(error);
      toast.error(t('pantryMgmt.toasts.removeFail'));
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const performDeletePantry = async () => {
    try {
      await pantryService.deletePantry(pantry.id);
      toast.success(t('pantryMgmt.toasts.deleteOk'));
      window.location.reload();
    } catch (error) {
      console.log(error);
      toast.error(t('pantryMgmt.toasts.deleteFail'));
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const performLeavePantry = async () => {
    try {
      await pantryService.leavePantry(pantry.id);
      toast.success(t('pantryMgmt.toasts.leaveOk', { name: pantry.name }));
      window.location.reload();
    } catch (error) {
      console.log(error);
      toast.error(t('pantryMgmt.toasts.leaveFail'));
    }
    setModalState({ ...modalState, isOpen: false });
  };

  return (
    <>
      <div className="space-y-8">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm
                        dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
            <FaPlus className="mr-3 text-teal-600 dark:text-teal-400" />
            {t('pantryMgmt.createSectionTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
            {t('pantryMgmt.createSectionHint')}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg"
          >
            {t('pantryMgmt.createButton')}
          </button>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm
                        dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
            <FaPen className="mr-3 text-teal-600 dark:text-teal-400" />
            {t('pantryMgmt.renameTitle')}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500
                         dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
              disabled={!isOwner}
            />
            <button
              onClick={handleRenamePantry}
              disabled={!isOwner || newName.trim() === '' || newName === pantry.name}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('pantryMgmt.save')}
            </button>
          </div>
          {!isOwner && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              {t('pantryMgmt.ownerOnlyRenameHint')}
            </p>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm
                        dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
            <FaUsers className="mr-3 text-teal-600 dark:text-teal-400" />
            {t('pantryMgmt.membersInvitesTitle')}
          </h2>

          <div className="space-y-3 mb-6">
            {pantry.member_associations.map((association) => (
              <div
                key={association.user.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border
                           dark:bg-slate-800 dark:border-slate-700"
              >
                <div className="flex items-center min-w-0">
                  <img
                    src={
                      association.user.avatar_url ||
                      `https://ui-avatars.com/api/?name=${association.user.email}&background=random`
                    }
                    alt="avatar"
                    className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate dark:text-slate-100">{association.user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {association.role === 'owner'
                        ? t('pantryMgmt.role.owner')
                        : t('pantryMgmt.role.member')}
                    </p>
                  </div>
                </div>
                {isOwner && association.user.id !== pantry.owner_id && (
                  <button
                    onClick={() => openRemoveMemberModal(association.user.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium ml-2 flex-shrink-0"
                  >
                    {t('pantryMgmt.removeMember')}
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <>
              <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-2 flex items-center">
                <FaPlusCircle className="mr-2 text-gray-500 dark:text-slate-400" />
                {t('pantryMgmt.inviteNew')}
              </h3>

              {inviteLink ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="w-full px-4 py-2 border rounded-lg bg-gray-100
                                 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <FaCopy /> {t('pantryMgmt.copy')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {t('pantryMgmt.inviteValid15m')}
                  </p>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleGenerateLink}
                    disabled={isGenerating}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg disabled:bg-gray-400"
                  >
                    {isGenerating
                      ? t('pantryMgmt.generating')
                      : t('pantryMgmt.generateInvite')}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center">
                    {t('pantryMgmt.generatedActive15m')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm space-y-4
                        dark:bg-red-900/20 dark:border-red-800">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">⚠️ {t('pantryMgmt.irreversibleTitle')}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {!isOwner && (
              <button
                onClick={openLeavePantryModal}
                className="flex-1 w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <FaSignOutAlt /> {t('pantryMgmt.leavePantry')}
              </button>
            )}
            {isOwner && (
              <button
                onClick={openDeletePantryModal}
                className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <FaTrash /> {t('pantryMgmt.deletePantry')}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalState.isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-xl text-center space-y-4 w-full max-w-sm
                         dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{modalState.title}</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">{modalState.message}</p>
              <div className="flex justify-center gap-4 pt-2">
                <button
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors
                             dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
                >
                  {t('pantryMgmt.modals.cancel')}
                </button>
                <button
                  onClick={modalState.onConfirm}
                  className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                >
                  {t('pantryMgmt.modals.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm
                         dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">
                {t('pantryMgmt.modals.createTitle')}
              </h3>
              <input
                type="text"
                value={newPantryName}
                onChange={(e) => setNewPantryName(e.target.value)}
                placeholder={t('pantryMgmt.modals.namePlaceholder') || '...'}
                maxLength={50}
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4
                           dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors
                             dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
                >
                  {t('pantryMgmt.modals.cancel')}
                </button>
                <button
                  onClick={handleCreatePantry}
                  className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
                >
                  {t('pantryMgmt.modals.create')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
