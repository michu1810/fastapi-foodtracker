import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { pantryService } from '../services/pantryService';
import type { PantryRead } from '../services/pantryService';
import { FaCopy, FaUsers, FaPen, FaPlusCircle, FaTrash, FaSignOutAlt, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface PantryManagementProps {
    pantry: PantryRead;
    onDataChange: () => void;
}

type ModalAction = 'removeMember' | 'deletePantry' | 'leavePantry' | 'createPantry'; // NOWOŚĆ: dodajemy akcję 'createPantry'
interface ModalState {
    isOpen: boolean;
    action: ModalAction | null;
    title: string;
    message: string;
    targetId?: number;
    onConfirm: () => void;
}

export const PantryManagement: React.FC<PantryManagementProps> = ({ pantry, onDataChange }) => {
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
            toast.error("Nazwa nie może być pusta i musi być inna od obecnej.");
            return;
        }
        try {
            await pantryService.updatePantry(pantry.id, newName);
            toast.success('Nazwa spiżarni została zmieniona!');
            onDataChange();
        } catch (error) {
            console.log(error);
            toast.error('Nie udało się zmienić nazwy spiżarni.');
        }
    };

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        try {
            const response = await pantryService.createInvitation(pantry.id);
            setInviteLink(response.invite_link);
            toast.success('Link wygenerowany!');
        } catch (error) {
            console.log(error);
            toast.error('Nie udało się wygenerować linku.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success('Skopiowano do schowka!');
    };

    const openRemoveMemberModal = (memberId: number) => {
        setModalState({
            isOpen: true,
            action: 'removeMember',
            title: 'Potwierdź usunięcie członka',
            message: 'Czy na pewno chcesz usunąć tego użytkownika ze spiżarni? Utraci on do niej dostęp.',
            onConfirm: () => performRemoveMember(memberId),
        });
    };

    const openDeletePantryModal = () => {
        setModalState({
            isOpen: true,
            action: 'deletePantry',
            title: 'NA PEWNO USUNĄĆ SPIŻARNIĘ?',
            message: `Ta operacja jest nieodwracalna. Wszystkie produkty i dane w spiżarni "${pantry.name}" zostaną bezpowrotnie usunięte.`,
            onConfirm: performDeletePantry,
        });
    };

    const openLeavePantryModal = () => {
        setModalState({
            isOpen: true,
            action: 'leavePantry',
            title: 'Potwierdź opuszczenie spiżarni',
            message: 'Czy na pewno chcesz opuścić tę spiżarnię? Aby dołączyć ponownie, będziesz potrzebować nowego zaproszenia.',
            onConfirm: performLeavePantry,
        });
    };

    const handleCreatePantry = async () => {
        if (newPantryName.trim().length < 2) {
            toast.error("Nazwa spiżarni musi mieć co najmniej 2 znaki.");
            return;
        }
        try {
            await pantryService.createPantry(newPantryName);
            toast.success(`Spiżarnia "${newPantryName}" została utworzona!`);
            onDataChange(); // Odświeżamy listę spiżarni w całej apce
            setIsCreateModalOpen(false);
            setNewPantryName('');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.detail || 'Nie udało się stworzyć spiżarni.';
            toast.error(errorMessage);
        }
    };

    const performRemoveMember = async (memberId: number) => {
        try {
            await pantryService.removeMember(pantry.id, memberId);
            toast.success("Usunięto członka.");
            onDataChange();
        } catch (error) {
            console.log(error);
            toast.error("Nie udało się usunąć członka.");
        }
        setModalState({ ...modalState, isOpen: false });
    };

    const performDeletePantry = async () => {
        try {
            await pantryService.deletePantry(pantry.id);
            toast.success("Spiżarnia została usunięta.");
            window.location.reload();
        } catch (error) {
            console.log(error);
            toast.error("Nie udało się usunąć spiżarni.");
        }
        setModalState({ ...modalState, isOpen: false });
    };

    const performLeavePantry = async () => {
        try {
            await pantryService.leavePantry(pantry.id);
            toast.success(`Opuściłeś spiżarnię "${pantry.name}".`);
            window.location.reload();
        } catch (error) {
            console.log(error);
            toast.error("Nie udało się opuścić spiżarni.");
        }
        setModalState({ ...modalState, isOpen: false });
    };

    return (
        <>
            <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><FaPlus className="mr-3 text-teal-600"/>Stwórz nową spiżarnię</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Możesz stworzyć maksymalnie 3 własne spiżarnie. Dołączanie do spiżarni innych nie ma limitu.
                    </p>
                    <button onClick={() => setIsCreateModalOpen(true)} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg">
                        Dodaj spiżarnię
                    </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><FaPen className="mr-3 text-teal-600"/>Zmień nazwę spiżarni</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            maxLength={50}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            disabled={!isOwner}
                        />
                        <button onClick={handleRenamePantry} disabled={!isOwner || newName.trim() === '' || newName === pantry.name} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Zapisz
                        </button>
                    </div>
                    {!isOwner && <p className="text-xs text-gray-500 mt-2">Tylko właściciel może zmienić nazwę spiżarni.</p>}
                </div>


                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><FaUsers className="mr-3 text-teal-600"/>Członkowie i zaproszenia</h2>
                    <div className="space-y-3 mb-6">
                        {pantry.member_associations.map(association => (
                            <div key={association.user.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                <div className="flex items-center min-w-0">
                                    <img src={association.user.avatar_url || `https://ui-avatars.com/api/?name=${association.user.email}&background=random`} alt="avatar" className="w-8 h-8 rounded-full mr-3 flex-shrink-0"/>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{association.user.email}</p>
                                        <p className="text-xs text-gray-500 capitalize">{association.role === 'owner' ? 'Właściciel' : 'Członek'}</p>
                                    </div>
                                </div>
                                {isOwner && association.user.id !== pantry.owner_id && (
                                    <button onClick={() => openRemoveMemberModal(association.user.id)} className="text-red-500 hover:text-red-700 text-sm font-medium ml-2 flex-shrink-0">Usuń</button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isOwner && (
                        <>
                            <h3 className="font-semibold text-gray-700 mb-2 flex items-center"><FaPlusCircle className="mr-2 text-gray-500"/>Zaproś nową osobę</h3>
                            {inviteLink ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input type="text" readOnly value={inviteLink} className="w-full px-4 py-2 border rounded-lg bg-gray-100" />
                                        <button onClick={copyToClipboard} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                            <FaCopy /> Kopiuj
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500">Pamiętaj, ten link jest ważny tylko przez 15 minut!</p>
                                </div>
                            ) : (
                                <div>
                                    <button onClick={handleGenerateLink} disabled={isGenerating} className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg disabled:bg-gray-400">
                                        {isGenerating ? 'Generowanie...' : 'Wygeneruj link zaproszenia'}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">Wygenerowany link będzie aktywny przez 15 minut.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-red-600">⚠️ Opcje nieodwracalne</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {!isOwner && (
                            <button onClick={openLeavePantryModal} className="flex-1 w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                                <FaSignOutAlt /> Opuść spiżarnię
                            </button>
                        )}
                        {isOwner && (
                            <button onClick={openDeletePantryModal} className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                                <FaTrash /> Usuń spiżarnię
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {modalState.isOpen && (
                    <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="bg-white p-6 rounded-lg shadow-xl text-center space-y-4 w-full max-w-sm" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <h3 className="text-lg font-bold text-gray-800">{modalState.title}</h3>
                            <p className="text-sm text-gray-600">{modalState.message}</p>
                            <div className="flex justify-center gap-4 pt-2">
                                <button onClick={() => setModalState({ ...modalState, isOpen: false })} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors">Anuluj</button>
                                <button onClick={modalState.onConfirm} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Potwierdź</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCreateModalOpen && (
                     <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Stwórz nową spiżarnię</h3>
                            <input
                                type="text"
                                value={newPantryName}
                                onChange={(e) => setNewPantryName(e.target.value)}
                                placeholder="Nazwa spiżarni..."
                                maxLength={50}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4"
                            />
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors">Anuluj</button>
                                <button onClick={handleCreatePantry} className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">Stwórz</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
