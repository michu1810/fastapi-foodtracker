import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { FinancialStats } from '../services/statsService';

const FinancialBarChart: React.FC<{ data: FinancialStats }> = ({ data }) => {
    const chartData = [
        { name: 'Zaoszczędzono', value: data.saved, color: '#22C55E' },
        { name: 'Stracono', value: data.wasted, color: '#EF4444' },
    ];

    const formatCurrency = (value: number) => `${value.toFixed(2)} zł`;
    
    return (
        <div className="w-full h-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Wizualizacja Finansów</h3>
            <ResponsiveContainer width="100%" height={200}>
                {/* ZMIANA: Zwiększone marginesy i szerokość osi Y, aby tekst się nie ucinał */}
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 65, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#4B5563', fontWeight: '600' }} 
                        width={110} 
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(229, 231, 235, 0.5)' }} 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), 'Wartość']}
                    />
                    <Bar dataKey="value" barSize={35} radius={[0, 8, 8, 0]}>
                        <LabelList dataKey="value" position="right" formatter={formatCurrency} offset={10} style={{ fill: '#374151', fontWeight: '500' }} />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FinancialBarChart;