import { useState } from 'react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, format, isSameMonth, isSameDay, subMonths, addMonths,
    isBefore
} from 'date-fns';
import { pl } from 'date-fns/locale';
import clsx from 'clsx';
import { Product } from '../../services/productService';
import { productsService}  from '../../services/productService';

interface FancyCalendarProps {
    productsByDate: Record<string, Product[]>;
    onDateClick: (date: Date) => void;
    createdAt: Date | null;
}

const FancyCalendar: React.FC<FancyCalendarProps> = ({ productsByDate, onDateClick, createdAt }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    
    const today = new Date();
    
    const userStartMonth = createdAt
        ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
        : new Date(today.getFullYear(), today.getMonth(), 1);

    const canGoToPrevMonth = (() => {
        const targetPrevMonth = subMonths(currentMonth, 1);
        return !isBefore(targetPrevMonth, userStartMonth);
    })();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => {
        if (canGoToPrevMonth) {
            setCurrentMonth(subMonths(currentMonth, 1));
        }
    };

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            const formattedDate = format(day, 'yyyy-MM-dd');
            const isCurrent = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const pureDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());

            const allProducts = productsByDate[formattedDate] || [];
            
            // ZMIANA: Używamy nowego pola 'current_amount' zamiast 'quantity_current'
            const activeProducts = allProducts.filter(p => p.current_amount > 0);
            
            const showExpanded = hoveredDate === formattedDate;

            const hasTodayExpiry = activeProducts.some(product => {
                const exp = new Date(product.expiration_date);
                return (
                    exp.getFullYear() === today.getFullYear() &&
                    exp.getMonth() === today.getMonth() &&
                    exp.getDate() === today.getDate()
                );
            });

            const productTagElements = activeProducts.map((product, idx) => {
                const expirationDate = new Date(product.expiration_date);
                const isTodayExpiry =
                    expirationDate.getFullYear() === today.getFullYear() &&
                    expirationDate.getMonth() === today.getMonth() &&
                    expirationDate.getDate() === today.getDate();

                const isExpired = productsService.isExpired(product);

                const bgColor = isTodayExpiry
                    ? 'bg-orange-400/30 text-orange-800'
                    : isExpired
                        ? 'bg-red-500/30 text-red-700'
                        : 'bg-blue-400/30 text-blue-700';

                return (
                    <div
                        key={idx}
                        style={{ transitionDelay: `${idx * 40}ms` }}
                        className={clsx(
                            'rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-medium truncate max-w-full transition-all duration-300 shadow-sm',
                            bgColor,
                        )}
                        title={isTodayExpiry ? `${product.name} (kończy się dziś!)` : product.name}
                    >
                        {product.name}
                    </div>
                );
            });

            const extraCount = activeProducts.length - 2;
            const showExtraBadge = extraCount > 0 && !showExpanded;

            days.push(
                <div
                    key={day.toString()}
                    className={clsx(
                        'relative border border-gray-200 p-1 sm:p-2 cursor-pointer transition-all duration-300 flex flex-col overflow-hidden rounded-lg group',
                        'transition-transform duration-100 active:scale-95',
                        !isCurrent && 'bg-gray-50 text-gray-400',
                        isToday && 'bg-blue-50/50',
                        hasTodayExpiry && 'animate-breathe ring-2 ring-orange-300/40',
                        showExpanded
                            ? 'z-10 scale-[1.03] shadow-2xl bg-white/60 backdrop-blur-lg saturate-150'
                            : 'aspect-square hover:shadow-lg hover:border-blue-200'
                    )}
                    onClick={() => onDateClick(pureDate)}
                    onMouseEnter={() => setHoveredDate(formattedDate)}
                    onMouseLeave={() => setHoveredDate(null)}
                >
                    <div className="flex justify-between items-start mb-1 transition-colors duration-200">
                        <span className={clsx('text-sm', isToday && 'text-blue-600 font-bold')}>
                            {format(day, 'd')}
                        </span>
                    </div>

                    <div
                        className={clsx(
                            'flex flex-col gap-1 pr-1 overflow-y-auto transition-[max-height] duration-300 ease-in-out',
                            showExpanded ? 'max-h-40' : 'max-h-[3.6rem]'
                        )}
                    >
                        {productTagElements.slice(0, showExpanded ? undefined : 2)}
                    </div>

                    {showExtraBadge && (
                        <div className="absolute bottom-2 right-2 bg-gray-200 text-gray-700 text-[10px] px-1 rounded-full">
                            +{extraCount}
                        </div>
                    )}
                </div>
            );

            day = addDays(day, 1);
        }

        rows.push(
            <div key={day.toString()} className="grid grid-cols-7 gap-px">
                {days}
            </div>
        );
        days = [];
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-smooth relative">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-100 border-b">
                <button
                    onClick={prevMonth}
                    disabled={!canGoToPrevMonth}
                    className={clsx(
                        'text-gray-600 hover:text-black',
                        !canGoToPrevMonth && 'opacity-30 cursor-not-allowed'
                    )}
                >
                    &lt;
                </button>
                <h2 className="text-lg font-semibold text-gray-700">
                    {format(currentMonth, 'LLLL yyyy', { locale: pl })}
                </h2>
                <button onClick={nextMonth} className="text-gray-600 hover:text-black">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-600 bg-gray-50">
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((d, i) => (
                    <div key={d} className={clsx('py-2', i === 6 && 'text-red-600')}>
                        {d}
                    </div>
                ))}
            </div>
            {rows}
        </div>
    );
};

export default FancyCalendar;