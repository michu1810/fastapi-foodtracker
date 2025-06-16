import apiClient from './api';
import type { Achievement } from './statsService';

export interface Product {
    id: number;
    name: string;
    expiration_date: string;
    external_id?: string | null;
    user_id: number;
    price: number;
    unit: string;
    initial_amount: number;
    current_amount: number;
    wasted_amount: number;
}

export interface ExpiringProduct {
    id: number;
    name: string;
    days_left: number;
    current_amount: number;
    unit: string;
}

export interface CreateProductRequest {
    name: string;
    price: number;
    unit: 'szt.' | 'g' | 'kg' | 'ml' | 'l';
    initial_amount: number;
    is_fresh_product?: boolean;
    purchase_date?: string | null;
    shelf_life_days?: number;
    expiration_date?: string | null;
    external_id?: string | null;
}

export interface ExternalProduct {
    id: string;
    name: string;
    description?: string;
}

export interface ProductActionResponse {
    product: Product;
    unlocked_achievements: Achievement[];
}

class ProductsService {
    async getAllProducts(): Promise<Product[]> {
        const response = await apiClient.get<Product[]>('/products/get');
        return response.data;
    }

    async createProduct(product: CreateProductRequest): Promise<Product> {
        const response = await apiClient.post<Product>('/products/create', product);
        return response.data;
    }

    async deleteProduct(productId: number): Promise<void> {
        await apiClient.delete(`/products/delete/${productId}`);
    }

    async useProduct(productId: number, amountToUse: number): Promise<ProductActionResponse> {
        const response = await apiClient.post<ProductActionResponse>(`/products/use/${productId}`, {
            amount: amountToUse,
        });
        return response.data;
    }
    
    async wasteProduct(productId: number, amountToWaste: number): Promise<ProductActionResponse> {
        const response = await apiClient.post<ProductActionResponse>(`/products/waste/${productId}`, {
            amount: amountToWaste,
        });
        return response.data;
    }

    async updateProduct(productId: number, productData: {name: string, expiration_date: string}): Promise<Product> {
        const response = await apiClient.put<Product>(`/products/update/${productId}`, productData);
        return response.data;
    }

    async searchExternalProducts(query: string): Promise<ExternalProduct[]> {
        try {
            const response = await apiClient.get<ExternalProduct[]>(`/external-products/search?q=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            console.error('External search failed:', error);
            return [];
        }
    }

    async getExpiringSoonProducts(): Promise<ExpiringProduct[]> {
        const response = await apiClient.get<ExpiringProduct[]>('/products/expiring-soon');
        return response.data;
    }
    
    async sendTestNotification(): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/notifications/send-test');
        return response.data;
    }

    async runExpirationCheck(): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/notifications/run-check');
        return response.data;
    }

    groupProductsByDate(products: Product[]): Record<string, Product[]> {
        return products.reduce((acc, product) => {
            const date = product.expiration_date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }

    formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isExpired(product?: Product): boolean {
        if (!product) return false;
        const today = this.formatDate(new Date());
        return product.expiration_date < today;
    }
}

export const productsService = new ProductsService();