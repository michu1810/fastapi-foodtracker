import apiClient from './api';

export interface Category {
    id: number;
    name: string;
    icon_name: string | null;
}

class CategoryService {
    async getAllCategories(): Promise<Category[]> {
        const response = await apiClient.get<Category[]>('/categories/');
        return response.data;
    }
}

export const categoryService = new CategoryService();
