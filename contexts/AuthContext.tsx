import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { fetchUserProfile, UserProfile } from '../src/hooks/useProfile';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    role: 'employee' | 'manager' | 'hr_admin';
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    role: 'employee',
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId: string | undefined) => {
        console.log('[AuthContext] loadProfile for:', userId);
        if (!userId) {
            setProfile(null);
            return;
        }

        try {
            console.log('[AuthContext] Calling fetchUserProfile...');
            const profileData = await fetchUserProfile(userId);
            console.log('[AuthContext] fetchUserProfile finished, result:', !!profileData);
            setProfile(profileData);

            // Sync language with profile (if stored)
            if (profileData?.language && (profileData.language === 'en' || profileData.language === 'pt')) {
                import('../src/i18n').then((module) => {
                    module.default.changeLanguage(profileData.language as string);
                }).catch(err => console.error('[AuthContext] Failed to load i18n:', err));
            }
        } catch (err) {
            console.error('[AuthContext] Error loading profile:', err);
            setProfile(null);
        }
    }, []);

    useEffect(() => {
        // Global safety timeout to ensure landing page always loads
        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn('[AuthContext] SAFETY TIMEOUT: Force-clearing loading state');
                setLoading(false);
            }
        }, 8000);

        const initAuth = async () => {
            console.log('[AuthContext] initAuth: Fetching session...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[AuthContext] initAuth: Session determined:', session?.user?.id);

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    console.log('[AuthContext] initAuth: Triggering non-blocking loadProfile');
                    // We call it but don't AWAIT it indefinitely for the UI to show
                    loadProfile(session.user.id).finally(() => {
                        setLoading(false);
                    });

                    // Also set loading to false after a shorter grace period even if profile query is still slow
                    setTimeout(() => setLoading(false), 2000);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('[AuthContext] initAuth error:', err);
                setLoading(false);
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthContext] onAuthStateChange:', event, session?.user?.id);
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    const refreshProfile = async () => {
        if (user) {
            await loadProfile(user.id);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        sessionStorage.removeItem('is2FAVerified');
    };

    // Derive role from profile (default to 'employee')
    const role = profile?.role ?? 'employee';

    const value = {
        session,
        user,
        profile,
        role,
        loading,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
