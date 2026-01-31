import { supabase } from '../lib/supabaseClient';
import { ClientCompany } from '../../types';

export const clientService = {
    async getClients(): Promise<ClientCompany[]> {
        const { data, error } = await supabase
            .from('client_companies')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async createClient(client: Omit<ClientCompany, 'id' | 'created_at'>): Promise<ClientCompany> {
        const { data, error } = await supabase
            .from('client_companies')
            .insert(client)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateClient(id: string, client: Partial<Omit<ClientCompany, 'id' | 'created_at'>>): Promise<ClientCompany> {
        const { data, error } = await supabase
            .from('client_companies')
            .update(client)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteClient(id: string): Promise<void> {
        const { error } = await supabase
            .from('client_companies')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
