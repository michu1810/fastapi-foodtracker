import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaLock, FaCrown } from 'react-icons/fa';
import { Achievement } from '../services/statsService';

interface AchievementsProps {
  list: Achievement[];
}

// ZMIANA: Dodajemy wszystkie nowe kategorie i ich nazwy
const CATEGORY_NAMES: { [key: string]: string } = {
  saved_products: 'Walka z Marnotrawstwem',
  efficiency_rate: 'Walka z Marnotrawstwem',
  money_saved: 'Mistrzostwo Finansowe',
  active_value: 'Mistrzostwo Finansowe',
  total_products: 'Aktywność i Kolekcjonowanie',
  day_add_streak: 'Aktywność i Kolekcjonowanie',
  active_products_count: 'Aktywność i Kolekcjonowanie',
  days_as_user: 'Staż w Aplikacji',
  weekend_adds: 'Staż i Regularność',
  sunday_adds: 'Staż i Regularność',
  cheese_products: 'Kreatywne Wyzwania',
  night_actions: 'Kreatywne Wyzwania',
  healthy_monday_add: 'Kreatywne Wyzwania',
  morning_caffeine_add: 'Kreatywne Wyzwania',
};

// ZMIANA: Aktualizujemy kolejność i dodajemy nowe typy
const CATEGORY_ORDER = [
    'saved_products', 
    'efficiency_rate',
    'money_saved',
    'active_value',
    'total_products',
    'active_products_count',
    'day_add_streak',
    'days_as_user',
    'weekend_adds',
    'sunday_adds',
    'cheese_products',
    'night_actions',
    'healthy_monday_add',
    'morning_caffeine_add',
];

const Achievements: React.FC<AchievementsProps> = ({ list }) => {
  const groupedAchievements = useMemo(() => {
    if (!list) return {};
    const groups: { [key: string]: {name: string, achievements: Achievement[]} } = {};
    
    // Używamy zdefiniowanej mapy, aby uniknąć duplikatów kategorii
    list.forEach(ach => {
      const categoryName = CATEGORY_NAMES[ach.type] || 'Inne';
      if (!groups[categoryName]) {
        groups[categoryName] = { name: categoryName, achievements: [] };
      }
      groups[categoryName].achievements.push(ach);
    });

    // Sortujemy osiągnięcia wewnątrz każdej grupy
    for(const categoryName in groups) {
        groups[categoryName].achievements.sort((a, b) => (a.total_progress ?? 0) - (b.total_progress ?? 0));
    }
    
    return groups;
  }, [list]);

  if (!list || list.length === 0) return null;

  // Tworzymy posortowaną listę kategorii na podstawie kolejności i tego co istnieje
  const sortedCategoryNames = [...new Set(CATEGORY_ORDER.map(key => CATEGORY_NAMES[key]).filter(Boolean))];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="space-y-10">
        {sortedCategoryNames.map(categoryName => {
          const group = groupedAchievements[categoryName];
          if (!group || group.achievements.length === 0) return null;

          return (
            <section key={categoryName}>
              <h4 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
                {categoryName}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.achievements.map((ach, index) => (
                  <AchievementCard key={ach.id} achievement={ach} index={index} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};


const AchievementCard: React.FC<{ achievement: Achievement, index: number }> = ({ achievement, index }) => {
    const { name, description, icon, achieved, current_progress, total_progress, type } = achievement;
    const current = current_progress ?? 0;
    const total = total_progress ?? 1;
    const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    
    const isLocked = !achieved && current === 0 && total > 1;

    // Funkcja do formatowania wartości (szczególnie dla pieniędzy)
    const formatValue = (value: number) => {
        if (type.includes('money') || type.includes('value')) {
            return `${value.toFixed(2)} zł`;
        }
        if (type === 'efficiency_rate') return `${value}%`;
        return value;
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.05 } }
    };

    const cardClasses = achieved
      ? 'bg-yellow-50/50 border-yellow-400 shadow-lg'
      : isLocked
      ? 'grayscale opacity-60 hover:opacity-100'
      : 'bg-white border-gray-200';

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            title={isLocked ? `Wymaganie: ${description}` : ''}
            className={`p-4 rounded-xl border-2 flex flex-col transition-all duration-300 h-44 relative overflow-hidden group ${cardClasses}`}
        >
            {isLocked && <div className="absolute inset-0 bg-gray-500/10 backdrop-blur-[1px] z-10"></div>}
            
            <div className="flex items-center mb-2">
                <div className={`text-5xl mr-4 transition-transform duration-300 ${!isLocked && 'group-hover:scale-110'}`}>{icon}</div>
                <div className="flex-1">
                    <p className={`font-bold ${isLocked ? 'text-gray-500' : 'text-gray-800'}`}>{name}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
                {achieved && <FaCrown className="text-2xl text-yellow-500 absolute top-3 right-3" />}
                {isLocked && <FaLock className="text-xl text-gray-400 absolute top-3 right-3" />}
            </div>

            {!achieved && !isLocked && total_progress !== null && (
                <div className="mt-auto pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-right text-gray-500 mt-1">
                        {formatValue(Math.min(current, total))} / {formatValue(total)}
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default Achievements;