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
    user_profiles: {
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
    client_id?: string;
    employee_code?: string;
    employment_type?: string;
    is_team_lead?: boolean;
    client_companies?: {
        name: string;
    } | { name: string }[] | null;
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
        .from('user_profiles')
        .select(`
            id, 
            full_name, 
            department, 
            avatar_url, 
            role,
            client_id,
            employee_code,
            employment_type,
            is_team_lead,
            client_companies (name)
        `, { count: 'exact' });

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
            user_profiles (full_name, avatar_url, department)
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

/**
 * Get upcoming absences (approved requests starting in the future)
 */
export async function getUpcomingAbsences(limit: number = 5): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('leave_requests')
        .select(`
            *,
            user_profiles (full_name, avatar_url)
        `)
        .eq('status', 'approved')
        .gt('start_date', today)
        .order('start_date', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ------------------------------------------------------------------
// YUKYU (Paid Leave) RULE IMPLEMENTATION
// Moved here to avoid dynamic import issues
// ------------------------------------------------------------------

interface YukyuGrant {
    id: string;
    grant_id?: string; // View alias
    user_id: string;
    grant_date: string;
    expires_on: string;
    remaining_days: number;
    remaining_hours: number;
}

interface YukyuUsage {
    leave_request_id: string;
    grant_id: string;
    used_days: number;
    used_hours: number;
}

/**
 * Approve a leave request using strict FIFO consumption logic for Yukyu.
 */
export async function approveLeaveWithYukyuRule(leaveRequestId: string, approverId: string): Promise<void> {
    console.log(`[YukyuRule] Starting approval for request: ${leaveRequestId} by approver: ${approverId}`);

    // 1. Fetch Request
    const { data: request, error: reqError } = await supabase
        .from('leave_requests')
        .select('id, user_id, status, days, hours, type')
        .eq('id', leaveRequestId)
        .single();

    if (reqError || !request) {
        throw new Error(`Request not found or error fetching: ${reqError?.message}`);
    }

    if (request.status !== 'pending') {
        throw new Error(`Request is not pending (current status: ${request.status})`);
    }

    const requestedDays = request.days || 0;
    const requestedHours = request.hours || 0;

    if (requestedDays <= 0 && requestedHours <= 0) {
        throw new Error("Request has no duration (0 days, 0 hours).");
    }

    // 2. Fetch Grants (FIFO)
    const today = new Date().toISOString().split('T')[0];
    const { data: grants, error: grantError } = await supabase
        .from('yukyu_balance_by_grant')
        .select('*')
        .eq('user_id', request.user_id)
        .gte('expires_on', today)
        .order('expires_on', { ascending: true })
        .order('grant_date', { ascending: true });

    if (grantError) throw new Error(`Error fetching grants: ${grantError.message}`);

    const availableGrants = (grants || []) as YukyuGrant[];

    // 3. Validate Balance
    const totalDays = availableGrants.reduce((sum, g) => sum + Number(g.remaining_days), 0);
    const totalHours = availableGrants.reduce((sum, g) => sum + Number(g.remaining_hours), 0);

    if (totalDays < requestedDays) {
        throw new Error(`Insufficient day balance. Requested: ${requestedDays}, Available: ${totalDays}`);
    }
    if (totalHours < requestedHours) {
        throw new Error(`Insufficient hour balance. Requested: ${requestedHours}, Available: ${totalHours}`);
    }

    // 4. Calculate Usage (FIFO)
    let leftToConsumeDays = requestedDays;
    let leftToConsumeHours = requestedHours;
    const usageOps: YukyuUsage[] = [];

    for (const grant of availableGrants) {
        if (leftToConsumeDays <= 0 && leftToConsumeHours <= 0) break;

        const takeDays = Math.min(leftToConsumeDays, Number(grant.remaining_days));
        const takeHours = Math.min(leftToConsumeHours, Number(grant.remaining_hours));

        if (takeDays > 0 || takeHours > 0) {
            usageOps.push({
                leave_request_id: leaveRequestId,
                grant_id: grant.grant_id || grant.id, // View might return 'grant_id' or 'id'
                used_days: takeDays,
                used_hours: takeHours
            });

            leftToConsumeDays -= takeDays;
            leftToConsumeHours -= takeHours;
        }
    }

    if (leftToConsumeDays > 0.01 || leftToConsumeHours > 0.01) {
        throw new Error("Unable to fully cover the request with available grants (fragmentation issue?).");
    }

    console.log('[YukyuRule] Calculated usage:', usageOps);

    // 5. Insert Usage Records
    for (const op of usageOps) {
        const { error: insertError } = await supabase
            .from('yukyu_usage')
            .insert({
                leave_request_id: op.leave_request_id,
                grant_id: op.grant_id,
                used_days: op.used_days,
                used_hours: op.used_hours
            });

        if (insertError) {
            console.error('[YukyuRule] Error inserting usage:', insertError);
            throw new Error(`Failed to record usage: ${insertError.message}`);
        }
    }

    // 6. Update Request Status
    const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', leaveRequestId);

    if (updateError) {
        throw new Error(`Failed to update request status: ${updateError.message}`);
    }

    console.log('[YukyuRule] Approval successful.');
}

/**
 * Get detailed profile for a single employee
 */
export async function getEmployeeDetail(id: string): Promise<any> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select(`
            *,
            client_companies (id, name),
            employee_history (*)
        `)
        .eq('id', id)
        .order('start_date', { foreignTable: 'employee_history', ascending: false })
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update detailed profile for an employee
 */
export async function updateEmployeeDetail(id: string, updates: any): Promise<void> {
    const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id);

    if (error) throw error;
}

/**
 * Get all available visa types
 */
export async function getVisaTypes(): Promise<any[]> {
    const { data, error } = await supabase
        .from('visa_types')
        .select('*')
        .order('label_pt');

    if (error) throw error;
    return data || [];
}

/**
 * Create a new visa type
 */
export async function createVisaType(visa: { name: string, label_pt: string, label_en: string, label_ja: string }): Promise<void> {
    const { error } = await supabase
        .from('visa_types')
        .insert(visa);

    if (error) throw error;
}

/**
 * Delete a visa type
 */
export async function deleteVisaType(id: string): Promise<void> {
    const { error } = await supabase
        .from('visa_types')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Lookup Japanese address by postal code using zipcloud API
 */
export async function lookupAddressByPostalCode(zipcode: string): Promise<string | null> {
    const cleanZip = zipcode.replace(/[^0-9]/g, '');
    if (cleanZip.length !== 7) return null;

    try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
        const data = await response.json();

        if (data.status === 200 && data.results && data.results.length > 0) {
            const res = data.results[0];
            // Format: Prefecture + City + Town
            return `${res.address1}${res.address2}${res.address3}`;
        }
        return null;
    } catch (error) {
        console.error('Error looking up postal code:', error);
        return null;
    }
}
