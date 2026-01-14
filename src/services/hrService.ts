import { supabase } from '../../lib/supabaseClient';

export interface PendingRequest {
    id: string;
    user_id: string;
    type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: string;
    priority: string;
    created_at: string;
    note: string | null;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        department: string | null;
    };
    attachments_count?: number;
}

export interface HrMetrics {
    pendingCount: number;
    onLeaveToday: number;
    balanceUsedPercent: number;
}

export interface EmployeeSearchResult {
    id: string;
    full_name: string;
    department: string | null;
    avatar_url: string | null;
    role: string;
}

/**
 * Get count of pending approvals
 */
export async function getPendingApprovalsCount(): Promise<number> {
    const { count, error } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
}

/**
 * Get count of employees on leave today
 */
export async function getOnLeaveTodayCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

    if (error) throw error;
    return count || 0;
}

/**
 * Get percentage of leave balance used across all employees
 */
export async function getBalanceUsedPercent(): Promise<number> {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
        .from('leave_balances')
        .select('total_days, used_days')
        .eq('year', currentYear);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const totalDays = data.reduce((sum, b) => sum + (b.total_days || 0), 0);
    const usedDays = data.reduce((sum, b) => sum + (b.used_days || 0), 0);

    return totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0;
}

/**
 * Get all HR metrics at once
 */
export async function getHrMetrics(): Promise<HrMetrics> {
    const [pendingCount, onLeaveToday, balanceUsedPercent] = await Promise.all([
        getPendingApprovalsCount(),
        getOnLeaveTodayCount(),
        getBalanceUsedPercent()
    ]);

    return { pendingCount, onLeaveToday, balanceUsedPercent };
}

/**
 * Search employees by name or department
 */
export async function searchEmployees(
    query: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ data: EmployeeSearchResult[]; total: number }> {
    const offset = (page - 1) * pageSize;

    let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, department, avatar_url, role', { count: 'exact' });

    if (query.trim()) {
        queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,department.ilike.%${query}%`);
    }

    const { data, count, error } = await queryBuilder
        .range(offset, offset + pageSize - 1)
        .order('full_name');

    if (error) throw error;

    return {
        data: (data || []) as EmployeeSearchResult[],
        total: count || 0
    };
}

/**
 * Get priority approvals (pending requests, ordered by priority and date)
 */
export async function getPriorityApprovals(limit: number = 10): Promise<PendingRequest[]> {
    const { data, error } = await supabase
        .from('leave_requests')
        .select(`
            *,
            profiles (full_name, avatar_url, department)
        `)
        .eq('status', 'pending')
        .order('priority', { ascending: false }) // 'high' comes before 'normal'
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) throw error;

    // Get attachment counts
    const requestIds = (data || []).map(r => r.id);
    if (requestIds.length > 0) {
        const { data: attachments } = await supabase
            .from('leave_request_attachments')
            .select('leave_request_id')
            .in('leave_request_id', requestIds);

        const attachmentCounts: Record<string, number> = {};
        (attachments || []).forEach(a => {
            attachmentCounts[a.leave_request_id] = (attachmentCounts[a.leave_request_id] || 0) + 1;
        });

        return (data || []).map(r => ({
            ...r,
            attachments_count: attachmentCounts[r.id] || 0
        })) as PendingRequest[];
    }

    return (data || []) as PendingRequest[];
}

/**
 * Approve a leave request
 */
export async function approveLeaveRequest(id: string): Promise<void> {
    const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) throw error;
}

/**
 * Reject a leave request
 */
export async function rejectLeaveRequest(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
        .from('leave_requests')
        .update({
            status: 'rejected',
            note: reason || null
        })
        .eq('id', id);

    if (error) throw error;
}

/**
 * Get all pending requests for the HR dashboard
 */
export async function getAllPendingRequests(): Promise<PendingRequest[]> {
    return getPriorityApprovals(100);
}
