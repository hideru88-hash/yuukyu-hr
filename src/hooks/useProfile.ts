import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'employee' | 'manager' | 'hr_admin';
    department: string | null;
    manager_id: string | null;
    language: string | null;
    leave_balance: number;
}

/**
 * Fetches the user profile from public.user_profiles table.
 * Includes a safety timeout to prevent app hangs in Chrome.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('[useProfile] fetchUserProfile started for:', userId);

    // Safety timeout to prevent Chrome hangs
    const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
            console.warn('[useProfile] fetchUserProfile TIMED_OUT after 5s');
            resolve(null);
        }, 5000);
    });

    const fetchPromise = (async (): Promise<UserProfile | null> => {
        try {
            // 1. Try to fetch with all fields including 'language'
            let { data, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, avatar_url, role, department, manager_id, language, leave_balance')
                .eq('id', userId)
                .single();

            console.log('[useProfile] First attempt result:', { hasData: !!data, errorCode: error?.code });

            // 2. If column doesn't exist (code 42703), retry without it
            if (error && (error as any).code === '42703') {
                console.warn('[useProfile] Column missing in DB, retrying with minimal fields.');
                const retry = await supabase
                    .from('user_profiles')
                    .select('id, full_name, role')
                    .eq('id', userId)
                    .single();

                if (retry.data) {
                    data = { ...retry.data, avatar_url: null, department: null, manager_id: null, language: null, leave_balance: 20 } as any;
                    error = null;
                } else {
                    error = retry.error;
                }
            }

            // 3. Fallback: If profile doesn't exist, return a default object for the UI
            // but DO NOT write to the database here (it overwrites roles)
            if (error && error.code === 'PGRST116') {
                console.log('[useProfile] Profile not found in DB.');
                return normalizeProfile({ id: userId, role: 'employee' });
            }

            if (error) {
                console.error('[useProfile] Query error:', error);
                return normalizeProfile({ id: userId, role: 'employee' });
            }

            return normalizeProfile(data);
        } catch (err) {
            console.error('[useProfile] Unexpected error in fetchUserProfile:', err);
            return normalizeProfile({ id: userId, role: 'employee' });
        }
    })();

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (result === null) {
        console.warn('[useProfile] Using fallback profile due to timeout');
        return normalizeProfile({ id: userId, role: 'employee' });
    }

    return result;
}

function normalizeProfile(data: any): UserProfile {
    if (!data) return {
        id: '',
        full_name: null,
        avatar_url: null,
        role: 'employee',
        department: null,
        manager_id: null,
        language: null,
        leave_balance: 20
    };

    // Normalize role to lowercase
    const role = (data.role || 'employee').toLowerCase() as UserProfile['role'];

    // Ensure valid role
    const validRoles = ['employee', 'manager', 'hr_admin'];
    const normalizedRole = validRoles.includes(role) ? role : 'employee';

    return {
        id: data.id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        role: normalizedRole as UserProfile['role'],
        department: data.department,
        manager_id: data.manager_id,
        language: data.language || null,
        leave_balance: data.leave_balance ?? 20
    };
}

export function useProfile(userId: string | undefined) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        if (!userId) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const profileData = await fetchUserProfile(userId);
            setProfile(profileData);
        } catch (err: any) {
            console.error('[useProfile] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        loading,
        error,
        reload: loadProfile
    };
}
