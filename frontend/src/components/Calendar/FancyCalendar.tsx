import React, { useState, useMemo } from 'react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, format, isBefore, subMonths, addMonths
} from 'date-fns';
import { pl } from 'date-fns/locale';
import clsx from 'clsx';
import { Product } from '../../services/productService';
import DayCell from './DayCell';

interface FancyCalendarProps {
    productsByDate: Record<string, Product[]>;
    onDateClick: (date: Date) => void;
    createdAt: Date | null;
}

const FancyCalendar: React.FC<FancyCalendarProps> = ({ productsByDate, onDateClick, createdAt }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const userStartMonth = useMemo(() => createdAt
        ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
        : new Date(today.getFullYear(), today.getMonth(), 1), [createdAt, today]);

    const canGoToPrevMonth = useMemo(() => {
        const targetPrevMonth = subMonths(currentMonth, 1);
        return !isBefore(targetPrevMonth, userStartMonth);
    }, [currentMonth, userStartMonth]);

    const monthStart = startOfMonth(currentMonth);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => {
        if (canGoToPrevMonth) setCurrentMonth(subMonths(currentMonth, 1));
    };

    const calendarGrid = useMemo(() => {
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const grid = [];
        let day = startDate;

        while (day <= endDate) {
            const formattedDate = format(day, 'yyyy-MM-dd');
            grid.push(
                <DayCell
                    key={day.toString()}
                    day={day}
                    monthStart={monthStart}
                    products={productsByDate[formattedDate] || []}
                    onDateClick={onDateClick}
                />
            );
            day = addDays(day, 1);
        }
        return grid;
    }, [ productsByDate, onDateClick, monthStart]);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-smooth relative">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-100 border-b">
                <button onClick={prevMonth} disabled={!canGoToPrevMonth}
                    className={clsx('text-gray-600 hover:text-black p-2 -m-2', !canGoToPrevMonth && 'opacity-30 cursor-not-allowed')}>
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
                    <div key={d} className={clsx('py-2', i > 4 && 'text-red-600')}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
                {calendarGrid}
            </div>
        </div>
    );
};

export default FancyCalendar;
