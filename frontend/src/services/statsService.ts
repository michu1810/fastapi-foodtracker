import apiClient from './api';

// Interfejsy
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
    active: number;
}

export interface FinancialStats {
    saved: number;
    wasted: number;
}

export async function getTrends(pantryId: number, range: 'day' | 'week' | 'month'): Promise<TrendData[]> {
    const res = await apiClient.get(`/pantries/${pantryId}/products/stats/trends?range=${range}`);
    return res.data;
}

export async function getAchievements(): Promise<Achievement[]> {
    const res = await apiClient.get('/pantries/{pantryId}/products/achievements');
    return res.data;
}

export async function getAverages(pantryId: number): Promise<Averages> {
    const res = await apiClient.get(`/pantries/${pantryId}/products/stats/averages`);
    return res.data;
}

export async function getStats(pantryId: number): Promise<Stats> {
    const response = await apiClient.get(`/pantries/${pantryId}/products/stats`);
    return response.data;
}

export async function getFinancialStats(pantryId: number): Promise<FinancialStats> {
    const response = await apiClient.get(`/pantries/${pantryId}/products/stats/financial`);
    return response.data;
}
