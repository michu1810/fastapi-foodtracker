import React from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { getAchievements } from '../services/statsService'; 
import type { Achievement } from '../services/statsService';
import Achievements from '../components/Achievements'; 

const AchievementsPage: React.FC = () => {
    // Używamy SWR do pobierania danych, co daje nam darmowe odświeżanie i cache'owanie
    const { data: list, error } = useSWR<Achievement[]>('/products/achievements', getAchievements);

    if (error) return <div className="p-6 bg-red-100 text-red-700 rounded-lg text-center">Nie udało się pobrać osiągnięć.</div>;
    if (!list) return <div className="text-center p-10">Ładowanie osiągnięć...</div>;

    const achievedCount = list.filter(ach => ach.achieved).length;
    const totalCount = list.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-slate-50 py-10 px-4"
        >
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-bold text-gray-800 tracking-tight">Twoje Osiągnięcia</h2>
                    <p className="mt-2 text-lg text-gray-600">
                        Zdobyto: <span className="font-bold text-blue-600">{achievedCount}</span> / {totalCount}
                    </p>
                </div>
                <Achievements list={list} />
            </div>
        </motion.div>
    );
};

export default AchievementsPage;