import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { TrendData } from '../services/statsService';

// POPRAWKA: Komponent przyjmuje dane przez propsy, a nie pobiera ich sam
const TrendChart: React.FC<{ data: TrendData[] }> = ({ data }) => {

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Trend dodawania produktów (ostatnie 30 dni)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="period" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.5rem', backdropFilter: 'blur(5px)', border: 'none' }} />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Area type="monotone" dataKey="added" stroke="#3B82F6" strokeWidth={2} fill="url(#colorAdded)" name="Dodane produkty" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
