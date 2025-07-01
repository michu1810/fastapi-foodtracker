import { useState } from 'react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, format, isSameMonth, isSameDay, subMonths, addMonths,
    isBefore,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import clsx from 'clsx';
import { Product } from '../../services/productService';
import { productsService } from '../../services/productService';

interface FancyCalendarProps {
    productsByDate: Record<string, Product[]>;
    onDateClick: (date: Date) => void;
    createdAt: Date | null;
}

const FancyCalendar: React.FC<FancyCalendarProps> = ({ productsByDate, onDateClick, createdAt }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
            const clickDate = new Date(day);
            clickDate.setHours(0, 0, 0, 0);

            const allProducts = productsByDate[formattedDate] || [];
            const activeProducts = allProducts.filter(p => p.current_amount > 0);

            const showExpanded = hoveredDate === formattedDate;

            const MAX_DOTS_VISIBLE = 4;
            const productDots = activeProducts
                .slice(0, MAX_DOTS_VISIBLE)
                .map((product, idx) => {
                    const isExpired = productsService.isExpired(product);
                    const isTodayExpiry = isSameDay(new Date(product.expiration_date), today);
                    const dotColor = isExpired ? 'bg-red-500' : isTodayExpiry ? 'bg-orange-400' : 'bg-blue-500';
                    return <div key={idx} className={clsx('w-1.5 h-1.5 rounded-full', dotColor)}></div>;
                });

            if (activeProducts.length > MAX_DOTS_VISIBLE) {
                productDots.pop();
                productDots.push(<div key="more" className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>);
            }

            const productTagElements = activeProducts.map((product, idx) => {
                const isExpired = productsService.isExpired(product);
                const isTodayExpiry = isSameDay(new Date(product.expiration_date), today);
                const bgColor = isExpired ? 'bg-red-500/30 text-red-700' : isTodayExpiry ? 'bg-orange-400/30 text-orange-800' : 'bg-blue-400/30 text-blue-700';

                return (
                    <div
                        key={idx}
                        style={{ transitionDelay: `${idx * 40}ms` }}
                        className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium truncate max-w-full transition-all duration-300 shadow-sm', bgColor)}
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
                        'relative border border-gray-200 p-2 cursor-pointer transition-all duration-300 flex flex-col rounded-lg group',
                        'transition-transform duration-100 active:scale-95',
                        'min-h-[70px] sm:min-h-[110px]',
                        !isCurrent && 'bg-gray-50 text-gray-400',
                        isToday && 'bg-blue-50/50',
                        showExpanded ? 'sm:z-10 sm:scale-[1.03] sm:shadow-2xl sm:bg-white/60 sm:backdrop-blur-lg sm:saturate-150' : 'hover:shadow-lg hover:border-blue-200'
                    )}
                    onClick={() => onDateClick(clickDate)}
                    onMouseEnter={() => setHoveredDate(formattedDate)}
                    onMouseLeave={() => setHoveredDate(null)}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={clsx('text-sm', isToday && 'text-blue-600 font-bold')}>
                            {format(day, 'd')}
                        </span>
                    </div>

                    <div className="flex sm:hidden flex-wrap items-center justify-start gap-1 mt-auto pt-1">
                         {productDots}
                    </div>

                    <div className={clsx(
                        'hidden sm:flex flex-col gap-1 pr-1 overflow-y-auto transition-[max-height] duration-300 ease-in-out',
                        showExpanded ? 'max-h-40' : 'max-h-[3.6rem]'
                    )}>
                        {productTagElements.slice(0, showExpanded ? undefined : 2)}
                    </div>

                    {showExtraBadge && (
                        <div className="hidden sm:block absolute bottom-2 right-2 bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded-full">
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
                        'text-gray-600 hover:text-black p-2 -m-2',
                        !canGoToPrevMonth && 'opacity-30 cursor-not-allowed'
                    )}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-700">
                    {format(currentMonth, 'LLLL yyyy', { locale: pl })}
                </h2>
                <button onClick={nextMonth} className="text-gray-600 hover:text-black p-2 -m-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-600 bg-gray-50">
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((d, i) => (
                    <div key={d} className={clsx('py-2', i > 4 && 'text-red-600')}>
                        {d}
                    </div>
                ))}
            </div>
            {rows}
        </div>
    );
};

export default FancyCalendar;
