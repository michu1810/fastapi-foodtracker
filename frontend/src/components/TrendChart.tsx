import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { TrendData } from '../services/statsService';
import { useTranslation } from 'react-i18next';

const TrendChart: React.FC<{ data: TrendData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80
                    dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
        {t('statsPage.trendChart.title')}
      </h3>
      <div className="h-[300px] text-gray-600 dark:text-slate-300">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* ujednolicone kolory pod dark przez currentColor */}
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
            <XAxis dataKey="period" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '0.5rem',
                backdropFilter: 'blur(5px)',
                border: 'none'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', color: 'currentColor' }} />
            <Area
              type="monotone"
              dataKey="added"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorAdded)"
              name={t('statsPage.trendChart.seriesAdded')}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
