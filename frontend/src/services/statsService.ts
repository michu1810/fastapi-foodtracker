import apiClient from './api';

export interface TrendData {
    period: string;
    total: number;
    used?: number;
    expired: number;
    added: number;
    wasted?: number;
}

export interface CategoryWasteStat {
  category_name: string;
  saved_szt: number;
  wasted_szt: number;
  saved_grams: number;
  wasted_grams: number;
  icon_name: string | null;
}

export interface MostWastedProduct {
    id: number;
    name: string;
    wasted_value: number;
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

// Funkcje API (bez zmian, aż do ostatniej)
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


export async function getCategoryWasteStats(pantryId: number): Promise<CategoryWasteStat[]> {
    const response = await apiClient.get(`/pantries/${pantryId}/products/stats/category-waste`, {
        params: { pantryId },
    });
    return response.data;
}
export async function getMostWastedProducts(pantryId: number): Promise<MostWastedProduct[]> {
    const response = await apiClient.get(`/pantries/${pantryId}/products/stats/most-wasted-products`);
    return response.data;
}
