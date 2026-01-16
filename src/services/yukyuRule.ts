import { supabase } from '../../lib/supabaseClient';

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
 * 
 * 1. Fetch request details.
 * 2. Fetch valid grants for the user, ordered by expiration date (ASC).
 * 3. Validate total balance.
 * 4. Calculate usage per grant (FIFO).
 * 5. Insert usage records.
 * 6. Update request status to 'approved'.
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

    // Only apply Yukyu rule for paid leave types? 
    // Usually "Vacation" consumes Yukyu. "Sick" or others might not.
    // However, the user request implies generic approval logic replacing the old one.
    // For safety, let's assume ALL "Vacation" or "Paid Leave" types consume it. 
    // If type is NOT vacation, maybe simply approve? 
    // The prompt says "Implementar a regra correta de yūkyū... Ao clicar Aprovar... o sistema deve Verificar se o usuário tem saldo".
    // It doesn't explicitly say "only for vacation". 
    // But logically, if type is "Sick" (unless paid) or "Other", maybe it shouldn't consume Yukyu?
    // User context: "leave_requests table... type". 
    // Let's assume for now this rule applies to 'Vacation'. If type is different, perhaps we should warn or simple approve?
    // Given the strict requirement: "Ao clicar Aprovar... deve Verificar...". 
    // I will enforce it for 'Vacation' type. For others, I will just do simple approve to avoid blocking non-yukyu leaves.
    // Wait, the user prompt implies this IS the approval logic. 
    // Let's start by checking if type is 'Vacation'. If so, run logic. Else, fallback to simple approve?
    // Actually, asking the user might be too slow. I'll implement the logic. 
    // If the request type is 'Vacation', we consume. If not, we just change status.

    // NOTE: User prompt says "Ao clicar Aprovar... o sistema deve...". It implies a global replacement.
    // But consuming Yukyu for "Sick" leave is unusual unless it's "Paid Sick Leave".
    // I will add a check: if request.type !== 'Vacation', just approve using legacy method (or simpler update).
    // BUT the prompt says "Implementar a regra correta de yūkyū".
    // I'll proceed with consumption logic regardless of type for now, OR better, check if type is 'Vacation'.
    // Let's assume 'Vacation' for consumption.


    // We used to fail-safe check for 'Vacation' type only, but in Japan context (Yuukyu),
    // employees use Paid Leave for Sick, Personal, and Other reasons too.
    // If the system should support "Unpaid Leave", we would need a specific flag or type.
    // For now, based on user feedback, we treat all configured request types as consuming Balance.
    // if (request.type !== 'Vacation') {
    //    ...
    // }


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

    // Simplification: We treat days and hours separately or convert?
    // Usually Yukyu is consumed in days or hours. 
    // If user takes 1 day 2 hours, we need 1 day and 2 hours availability.
    // However, sometimes days can be converted to hours (1 day = 8 hours).
    // The prompt separates them: "remainingDays = request.days", "remainingHours = request.hours".
    // And "useDays = min(remainingDays, grant.remaining_days)".
    // This implies exact matching without conversion logic specified in prompt.
    // We will stick to the prompt's algorithm.

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
                grant_id: grant.grant_id || grant.id, // View might return 'grant_id' or 'id' depending on alias
                used_days: takeDays,
                used_hours: takeHours
            });

            leftToConsumeDays -= takeDays;
            leftToConsumeHours -= takeHours;
        }
    }

    if (leftToConsumeDays > 0.01 || leftToConsumeHours > 0.01) { // tolerance for floating point
        throw new Error("Unable to fully cover the request with available grants (fragmentation issue?).");
    }

    console.log('[YukyuRule] Calculated usage:', usageOps);

    // 5. Insert Usage Records
    // We can't use a transaction easily with supabase-js unless using RPC.
    // The prompt says: "Se RLS bloquear... implementar um fallback... Para este delivery, implemente via Supabase client".
    // We will do optimistic inserts. If insert fails, we might leave partial data (bad), but without RPC/Typescript transaction blocks, it's the best we can do client-side.
    // Ideally, we would wrap this in a postgres function `approve_leave_request(id)`.
    // But the instructions are specific about creating this Typescript service.

    for (const op of usageOps) {
        const { error: insertError } = await supabase
            .from('yukyu_usage')
            .insert({
                leave_request_id: op.leave_request_id,
                grant_id: op.grant_id, // Ensure view alias matches 'grant_id'
                used_days: op.used_days,
                used_hours: op.used_hours
            });

        if (insertError) {
            console.error('[YukyuRule] Error inserting usage:', insertError);
            // Rollback strategy is hard here. Manual cleanup?
            // For now, throw.
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
