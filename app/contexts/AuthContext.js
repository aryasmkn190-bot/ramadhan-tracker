'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [configError, setConfigError] = useState(null);
    const mountedRef = useRef(true);
    const loadingSetRef = useRef(false);

    // Helper to safely set loading to false only once
    const finishLoading = () => {
        if (!loadingSetRef.current && mountedRef.current) {
            loadingSetRef.current = true;
            setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        loadingSetRef.current = false;

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            setConfigError('Supabase belum dikonfigurasi. Hubungi administrator.');
            finishLoading();
            return;
        }

        // Fallback timeout - force loading after 2 seconds
        const guaranteedTimeout = setTimeout(() => {
            finishLoading();
        }, 2000);

        // Check current session with race timeout
        const checkSession = async () => {
            try {
                // Race between getSession and a 1.5s timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 1500)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]);

                if (result.timedOut) {
                    finishLoading();
                    return;
                }

                const { data: { session }, error } = result;

                if (!mountedRef.current) return;

                if (error) {
                    console.error('Session error:', error);
                    finishLoading();
                    return;
                }

                setUser(session?.user ?? null);

                // Skip profile fetch on initial load - just show the app
                // Profile will be fetched in background
                if (session?.user) {
                    fetchProfileInBackground(session.user.id);
                }

                finishLoading();
            } catch (error) {
                if (error.name === 'AbortError') return;
                console.error('Error checking session:', error);
                finishLoading();
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mountedRef.current) return;

                setUser(session?.user ?? null);

                if (session?.user) {
                    fetchProfileInBackground(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => {
            clearTimeout(guaranteedTimeout);
            mountedRef.current = false;
            subscription?.unsubscribe();
        };
    }, []);

    // Fetch profile in background - don't block loading
    const fetchProfileInBackground = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!mountedRef.current) return;

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            // Profile fetch failed - non-blocking
        }
    };

    const fetchProfile = async (userId) => {
        await fetchProfileInBackground(userId);
    };

    const signUp = async (email, password, fullName, userGroup) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        user_group: userGroup,
                    },
                },
            });

            if (error) throw error;

            // If sign up succeeded and we have a user, update their profile with the group
            if (data?.user) {
                await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        full_name: fullName,
                        user_group: userGroup,
                        email: email,
                    }, {
                        onConflict: 'id',
                    });
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signIn = async (email, password) => {
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
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const updateProfile = async (updates) => {
        if (!user) {
            return { error: { message: 'Tidak terautentikasi' } };
        }

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
        configError,
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
