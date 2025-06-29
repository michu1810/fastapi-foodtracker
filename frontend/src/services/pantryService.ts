import apiClient from './api';

export interface PantryUser {
    id: number;
    email: string;
    avatar_url: string | null;
}

export interface PantryUser_Association {
    user: PantryUser;
    role: string;
}

export interface PantryRead {
    id: number;
    name: string;
    owner_id: number;
    member_associations: PantryUser_Association[];
}

export interface PantryUpdate {
    name: string;
}

export interface PantryInvitationLink {
    invite_link: string;
}

class PantryService {
    async getUserPantries(): Promise<PantryRead[]> {
        const response = await apiClient.get<PantryRead[]>('/pantries/');
        return response.data;
    }

    async createPantry(name: string): Promise<PantryRead> {
        const response = await apiClient.post<PantryRead>('/pantries/', { name });
        return response.data;
    }

    async updatePantry(pantryId: number, name: string): Promise<PantryRead> {
        const response = await apiClient.put<PantryRead>(`/pantries/${pantryId}`, { name });
        return response.data;
    }

    async deletePantry(pantryId: number): Promise<void> {
        await apiClient.delete(`/pantries/${pantryId}`);
    }

    async removeMember(pantryId: number, memberId: number): Promise<void> {
        await apiClient.delete(`/pantries/${pantryId}/members/${memberId}`);
    }

    async leavePantry(pantryId: number): Promise<void> {
        await apiClient.post(`/pantries/${pantryId}/leave`);
    }

    async createInvitation(pantryId: number): Promise<PantryInvitationLink> {
        const response = await apiClient.post<PantryInvitationLink>(`/pantries/${pantryId}/invitations`);
        return response.data;
    }

    async acceptInvitation(token: string): Promise<PantryRead> {
        const response = await apiClient.post<PantryRead>(`/invitations/accept/${token}`);
        return response.data;
    }
}

export const pantryService = new PantryService();
