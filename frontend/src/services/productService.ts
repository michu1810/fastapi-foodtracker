import axios from 'axios';
import apiClient from './api';
import type { Achievement } from './statsService';
import type { Category } from './categoryService';


export interface Product {
    id: number;
    name: string;
    expiration_date: string;
    external_id?: string | null;
    pantry_id: number;
    price: number;
    unit: string;
    initial_amount: number;
    current_amount: number;
    wasted_amount: number;
    category: Category | null;
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
    category_id?: number | null;
}

export interface ExternalProduct {
    id: string;
    name: string;
    description?: string;
}

export interface BarcodeProductData {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
}

export interface ProductActionResponse {
    product: Product;
    unlocked_achievements: Achievement[];
}


class ProductsService {
    async getAllProducts(pantryId: number): Promise<Product[]> {
        const response = await apiClient.get<Product[]>(`/pantries/${pantryId}/products/get`);
        return response.data;
    }

    async createProduct(pantryId: number, product: CreateProductRequest): Promise<Product> {
        const response = await apiClient.post<Product>(`/pantries/${pantryId}/products/create`, product);
        return response.data;
    }

    async deleteProduct(pantryId: number, productId: number): Promise<void> {
        await apiClient.delete(`/pantries/${pantryId}/products/delete/${productId}`);
    }

    async useProduct(pantryId: number, productId: number, amountToUse: number): Promise<ProductActionResponse> {
        const response = await apiClient.post<ProductActionResponse>(`/pantries/${pantryId}/products/use/${productId}`, {
            amount: amountToUse,
        });
        return response.data;
    }

    async wasteProduct(pantryId: number, productId: number, amountToWaste: number): Promise<ProductActionResponse> {
        const response = await apiClient.post<ProductActionResponse>(`/pantries/${pantryId}/products/waste/${productId}`, {
            amount: amountToWaste,
        });
        return response.data;
    }

    async updateProduct(pantryId: number, productId: number, productData: CreateProductRequest): Promise<Product> {
        const response = await apiClient.put<Product>(`/pantries/${pantryId}/products/update/${productId}`, productData);
        return response.data;
    }
    async resolveCategory(externalId: string): Promise<Category> {
        const response = await apiClient.get<Category>(`/external-products/resolve-category/${externalId}`);
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

    async getProductByBarcode(barcode: string): Promise<BarcodeProductData | null> {
        try {
            const response = await apiClient.get<BarcodeProductData>(`/external-products/barcode/${barcode}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.log(`Produkt o kodzie ${barcode} nie został znaleziony.`);
                    return null;
                }
            }
            console.error('Pobieranie produktu po kodzie kreskowym nie powiodło się:', error);
            throw error;
        }
    }

      async getExpiringSoonProducts(pantryId: number): Promise<ExpiringProduct[]> {
        const response = await apiClient.get<ExpiringProduct[]>(`/pantries/${pantryId}/products/expiring-soon`);
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
