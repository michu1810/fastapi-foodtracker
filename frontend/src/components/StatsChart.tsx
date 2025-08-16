import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

interface Props { total: number; used: number; wasted: number; }

const COLORS = ['#3B82F6', '#10B981', '#EF4444'];

export default function StatsChart({ total, used, wasted }: Props) {
  const { t } = useTranslation();
  const data = [
    { name: t('statsPage.pieChart.all'), value: total },
    { name: t('statsPage.pieChart.saved'), value: used },
    { name: t('statsPage.pieChart.wasted'), value: wasted },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 dark:text-slate-200 rounded-2xl shadow-lg border border-gray-200/80 dark:border-slate-700 p-6">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((color, i) => (
                <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="80%" stopColor={color} stopOpacity={0.2} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              label
              animationDuration={800}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#grad-${i})`} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: 'none'
              }}
            />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: 'currentColor' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
