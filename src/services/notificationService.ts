import { supabase } from '../../lib/supabaseClient';

export interface Notification {
    id: string;
    user_id: string;
    kind: 'request_created' | 'request_approved' | 'request_rejected';
    leave_request_id: string | null;
    title: string;
    body: string | null;
    read: boolean;
    created_at: string;
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;
    return (data || []) as Notification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

    if (error) throw error;
    return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

    if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

    if (error) throw error;
}
