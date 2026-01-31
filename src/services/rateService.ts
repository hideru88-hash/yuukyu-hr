import { supabase } from '../lib/supabaseClient';
import { BillingRate, SalaryRate } from '../../types';

// ==================== BILLING RATES (請求単価) ====================

export const getBillingRates = async (clientCompanyId: string): Promise<BillingRate[]> => {
    const { data, error } = await supabase
        .from('billing_rates')
        .select('*')
        .eq('client_company_id', clientCompanyId)
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createBillingRate = async (rate: Omit<BillingRate, 'id' | 'created_at'>): Promise<BillingRate> => {
    const { data, error } = await supabase
        .from('billing_rates')
        .insert(rate)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateBillingRate = async (id: string, rate: Partial<BillingRate>): Promise<BillingRate> => {
    const { data, error } = await supabase
        .from('billing_rates')
        .update(rate)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteBillingRate = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('billing_rates')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ==================== SALARY RATES (給与単価) ====================

export const getSalaryRates = async (userId: string): Promise<SalaryRate[]> => {
    const { data, error } = await supabase
        .from('salary_rates')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createSalaryRate = async (rate: Omit<SalaryRate, 'id' | 'created_at'>): Promise<SalaryRate> => {
    const { data, error } = await supabase
        .from('salary_rates')
        .insert(rate)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateSalaryRate = async (id: string, rate: Partial<SalaryRate>): Promise<SalaryRate> => {
    const { data, error } = await supabase
        .from('salary_rates')
        .update(rate)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteSalaryRate = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('salary_rates')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const rateService = {
    getBillingRates,
    createBillingRate,
    updateBillingRate,
    deleteBillingRate,
    getSalaryRates,
    createSalaryRate,
    updateSalaryRate,
    deleteSalaryRate,
};
