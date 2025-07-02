import React, { useState } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import clsx from 'clsx';
import { Product, productsService } from '../../services/productService';

interface DayCellProps {
    day: Date;
    monthStart: Date;
    products: Product[];
    onDateClick: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = ({ day, monthStart, products, onDateClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCurrent = isSameMonth(day, monthStart);
    const isToday = isSameDay(day, today);

    const activeProducts = products.filter(p => p.current_amount > 0);

    const MAX_DOTS_VISIBLE = 4;
    const productDots = activeProducts
        .slice(0, MAX_DOTS_VISIBLE)
        .map((product) => {
            const isExpired = productsService.isExpired(product);
            const isTodayExpiry = isSameDay(new Date(product.expiration_date), today);
            const dotColor = isExpired ? 'bg-red-500' : isTodayExpiry ? 'bg-orange-400' : 'bg-blue-500';
            return <div key={product.id} className={clsx('w-1.5 h-1.5 rounded-full', dotColor)}></div>;
        });

    if (activeProducts.length > MAX_DOTS_VISIBLE) {
        productDots.pop();
        productDots.push(<div key="more" className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>);
    }

    const extraCount = activeProducts.length - 2;
    const showExtraBadge = extraCount > 0 && !isHovered;

    return (
        <div
            className={clsx(
                'relative border border-gray-200 p-2 cursor-pointer transition-all duration-300 flex flex-col rounded-lg group',
                'transition-transform duration-100 active:scale-95',
                'min-h-[70px] sm:min-h-[110px]',
                !isCurrent && 'bg-gray-50 text-gray-400',
                isToday && 'bg-blue-50/50',
                isHovered ? 'z-10 scale-[1.03] shadow-2xl bg-white/60 backdrop-blur-lg saturate-150' : 'hover:shadow-lg hover:border-blue-200'
            )}
            onClick={() => onDateClick(day)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                isHovered ? 'max-h-40' : 'max-h-[3.6rem]'
            )}>
                {(activeProducts.slice(0, isHovered ? undefined : 2)).map((product, idx) => {
                     const isExpired = productsService.isExpired(product);
                     const isTodayExpiry = isSameDay(new Date(product.expiration_date), today);
                     const bgColor = isExpired ? 'bg-red-500/30 text-red-700' : isTodayExpiry ? 'bg-orange-400/30 text-orange-800' : 'bg-blue-400/30 text-blue-700';
                     return (
                        <div key={product.id} style={{ transitionDelay: `${idx * 40}ms` }}
                             className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium truncate max-w-full transition-all duration-300 shadow-sm', bgColor)}
                             title={isTodayExpiry ? `${product.name} (kończy się dziś!)` : product.name}
                        >
                            {product.name}
                        </div>
                    );
                })}
            </div>
            {showExtraBadge && (
                <div className="hidden sm:block absolute bottom-2 right-2 bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    +{extraCount}
                </div>
            )}
        </div>
    );
};

export default React.memo(DayCell);
