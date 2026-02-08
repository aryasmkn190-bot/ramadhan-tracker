'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOnlineMode, setIsOnlineMode] = useState(false);

    useEffect(() => {
        setIsOnlineMode(isSupabaseConfigured());

        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Check current session
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (error) {
                console.error('Error checking session:', error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const signUp = async (email, password, fullName) => {
        if (!isSupabaseConfigured()) {
            return { error: { message: 'Supabase not configured' } };
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signIn = async (email, password) => {
        if (!isSupabaseConfigured()) {
            return { error: { message: 'Supabase not configured' } };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signOut = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const updateProfile = async (updates) => {
        if (!isSupabaseConfigured() || !user) return { error: { message: 'Not authenticated' } };

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            setProfile(data);
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const isAdmin = profile?.role === 'admin';

    const value = {
        user,
        profile,
        loading,
        isOnlineMode,
        isAdmin,
        signUp,
        signIn,
        signOut,
        updateProfile,
        fetchProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
