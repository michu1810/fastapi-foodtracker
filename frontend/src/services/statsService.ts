import api from './api';

export interface TrendData {
    period: string;
    total: number;
    used?: number;
    expired: number;
    added: number;
    wasted?: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: string;
    achieved: boolean;
    current_progress: number | null;
    total_progress: number | null;
}

export interface Averages {
    avgDaily: number;
    avgWeekly: number;
    avgMonthly: number;
}
export interface Stats {
    total: number;
    used: number;
    wasted: number;
}

// NOWY INTERFEJS DLA STATYSTYK FINANSOWYCH
export interface FinancialStats {
    saved: number;
    wasted: number;
}


export async function getTrends(range: 'day' | 'week' | 'month'): Promise<TrendData[]> {
    const res = await api.get(`/products/stats/trends?range=${range}`);
    return res.data;
}

export async function getAchievements(): Promise<Achievement[]> {
    const res = await api.get('/products/achievements');
    return res.data;
}

export async function getAverages(): Promise<Averages> {
    const res = await api.get('/products/stats/averages');
    return res.data;
}
export async function getStats(): Promise<Stats> {
    const response = await api.get('/products/stats');
    return response.data;
}

// NOWA FUNKCJA DO POBIERANIA STATYSTYK FINANSOWYCH
export async function getFinancialStats(): Promise<FinancialStats> {
    const response = await api.get('/products/stats/financial');
    return response.data;
}
