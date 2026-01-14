import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'employee' | 'manager' | 'hr_admin';
    department: string | null;
    manager_id: string | null;
}

/**
 * Fetches the user profile from public.profiles table.
 * If profile doesn't exist for the user, creates one with default role='employee'.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    // First, try to fetch existing profile
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, department, manager_id')
        .eq('id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                role: 'employee',
                full_name: null,
                avatar_url: null,
                department: null,
                manager_id: null
            })
            .select('id, full_name, avatar_url, role, department, manager_id')
            .single();

        if (createError) {
            console.error('[useProfile] Error creating profile:', createError);
            return null;
        }

        return normalizeProfile(newProfile);
    }

    if (error) {
        console.error('[useProfile] Error fetching profile:', error);
        return null;
    }

    return normalizeProfile(data);
}

function normalizeProfile(data: any): UserProfile {
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
        manager_id: data.manager_id
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
