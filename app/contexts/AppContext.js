'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AppContext = createContext();

// Default activities
const DEFAULT_PRAYERS = [
    { id: 'subuh', name: 'Sholat Subuh', icon: '🌅', time: '04:30', category: 'wajib' },
    { id: 'dzuhur', name: 'Sholat Dzuhur', icon: '☀️', time: '12:00', category: 'wajib' },
    { id: 'ashar', name: 'Sholat Ashar', icon: '🌤️', time: '15:00', category: 'wajib' },
    { id: 'maghrib', name: 'Sholat Maghrib', icon: '🌅', time: '18:00', category: 'wajib' },
    { id: 'isya', name: 'Sholat Isya', icon: '🌙', time: '19:30', category: 'wajib' },
];

const DEFAULT_SUNNAH = [
    { id: 'tahajud', name: 'Sholat Tahajud', icon: '🌌', time: '03:00', category: 'sunnah' },
    { id: 'dhuha', name: 'Sholat Dhuha', icon: '🌞', time: '08:00', category: 'sunnah' },
    { id: 'tarawih', name: 'Sholat Tarawih', icon: '🕌', time: '20:00', category: 'sunnah' },
    { id: 'witir', name: 'Sholat Witir', icon: '⭐', time: '21:00', category: 'sunnah' },
];

const DEFAULT_ACTIVITIES = [
    { id: 'sahur', name: 'Sahur', icon: '🍽️', time: '04:00', category: 'puasa' },
    { id: 'puasa', name: 'Puasa', icon: '☪️', time: 'Sepanjang Hari', category: 'puasa' },
    { id: 'buka', name: 'Buka Puasa', icon: '🌙', time: '18:00', category: 'puasa' },
    { id: 'dzikir', name: 'Dzikir Pagi/Petang', icon: '📿', time: 'Pagi & Petang', category: 'amal' },
    { id: 'sedekah', name: 'Sedekah', icon: '💝', time: 'Kapan saja', category: 'amal' },
    { id: 'tadarus', name: 'Tadarus Al-Quran', icon: '📖', time: 'Setelah Subuh/Maghrib', category: 'quran' },
];

const RAMADAN_START = new Date('2026-02-18');

export function AppProvider({ children }) {
    const { user, isOnlineMode } = useAuth();

    const [activities, setActivities] = useState({});
    const [quranProgress, setQuranProgress] = useState({ currentJuz: 1, pagesRead: 0 });
    const [notifications, setNotifications] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [communityStats, setCommunityStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const daysSinceRamadan = Math.max(1, Math.ceil((today - RAMADAN_START) / (1000 * 60 * 60 * 24)));
    const currentRamadanDay = Math.min(Math.max(daysSinceRamadan, 1), 30);

    // Load data from Supabase or localStorage
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);

            if (isOnlineMode && user) {
                await loadFromSupabase();
            } else {
                loadFromLocalStorage();
            }

            setIsLoading(false);
        };

        loadData();
    }, [user, isOnlineMode]);

    // Load leaderboard and community stats
    useEffect(() => {
        if (isOnlineMode && user) {
            fetchLeaderboard();
            fetchCommunityStats();
            fetchAnnouncements();
        }
    }, [isOnlineMode, user]);

    const loadFromLocalStorage = () => {
        try {
            const savedActivities = localStorage.getItem('ramadhan_activities');
            const savedQuran = localStorage.getItem('ramadhan_quran');
            const savedNotifications = localStorage.getItem('ramadhan_notifications');

            if (savedActivities) setActivities(JSON.parse(savedActivities));
            if (savedQuran) setQuranProgress(JSON.parse(savedQuran));
            if (savedNotifications !== null) setNotifications(JSON.parse(savedNotifications));
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    };

    const loadFromSupabase = async () => {
        try {
            // Load today's activities
            const { data: activityData } = await supabase
                .from('daily_activities')
                .select('*')
                .eq('user_id', user.id)
                .eq('activity_date', todayString);

            if (activityData) {
                const todayActivities = {};
                activityData.forEach(a => {
                    todayActivities[a.activity_id] = a.completed;
                });
                setActivities({ [todayString]: todayActivities });
            }

            // Load Quran progress
            const { data: quranData } = await supabase
                .from('quran_progress')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (quranData) {
                setQuranProgress({
                    currentJuz: quranData.current_juz,
                    pagesRead: quranData.pages_read,
                });
            }
        } catch (error) {
            console.error('Error loading from Supabase:', error);
            loadFromLocalStorage();
        }
    };

    const fetchLeaderboard = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data } = await supabase
                .from('quran_leaderboard')
                .select('*')
                .limit(20);

            if (data) setLeaderboard(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const fetchCommunityStats = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data } = await supabase
                .from('community_stats')
                .select('*')
                .single();

            if (data) setCommunityStats(data);
        } catch (error) {
            console.error('Error fetching community stats:', error);
        }
    };

    const fetchAnnouncements = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data } = await supabase
                .from('announcements')
                .select('*, profiles(full_name)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) setAnnouncements(data);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    // Save to localStorage whenever data changes (fallback)
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('ramadhan_activities', JSON.stringify(activities));
            localStorage.setItem('ramadhan_quran', JSON.stringify(quranProgress));
            localStorage.setItem('ramadhan_notifications', JSON.stringify(notifications));
        }
    }, [activities, quranProgress, notifications, isLoading]);

    // Get today's activities
    const getTodayActivities = useCallback(() => {
        const todayData = activities[todayString] || {};
        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];

        return allActivities.map(activity => ({
            ...activity,
            completed: todayData[activity.id] || false,
        }));
    }, [activities, todayString]);

    // Toggle activity completion
    const toggleActivity = useCallback(async (activityId) => {
        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];
        const activity = allActivities.find(a => a.id === activityId);
        const currentlyCompleted = activities[todayString]?.[activityId] || false;
        const newCompleted = !currentlyCompleted;

        // Update local state immediately
        setActivities(prev => ({
            ...prev,
            [todayString]: {
                ...prev[todayString],
                [activityId]: newCompleted,
            },
        }));

        // Sync to Supabase if online
        if (isOnlineMode && user) {
            try {
                if (newCompleted) {
                    await supabase.from('daily_activities').upsert({
                        user_id: user.id,
                        activity_date: todayString,
                        activity_id: activityId,
                        activity_name: activity?.name || activityId,
                        activity_category: activity?.category || 'other',
                        completed: true,
                        completed_at: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,activity_date,activity_id',
                    });
                } else {
                    await supabase
                        .from('daily_activities')
                        .update({ completed: false, completed_at: null })
                        .eq('user_id', user.id)
                        .eq('activity_date', todayString)
                        .eq('activity_id', activityId);
                }
            } catch (error) {
                console.error('Error syncing activity:', error);
            }
        }

        // Show toast
        if (activity) {
            addToast(
                newCompleted ? `✅ ${activity.name} tercatat!` : `↩️ ${activity.name} dibatalkan`,
                newCompleted ? 'success' : 'info'
            );
        }
    }, [activities, todayString, isOnlineMode, user]);

    // Update Quran progress
    const addPagesRead = useCallback(async (pages) => {
        const newPages = quranProgress.pagesRead + pages;
        const newJuz = Math.min(Math.floor(newPages / 20) + 1, 30);

        setQuranProgress({ currentJuz: newJuz, pagesRead: newPages });

        // Sync to Supabase if online
        if (isOnlineMode && user) {
            try {
                await supabase
                    .from('quran_progress')
                    .upsert({
                        user_id: user.id,
                        current_juz: newJuz,
                        pages_read: newPages,
                        last_read_date: todayString,
                    }, {
                        onConflict: 'user_id',
                    });

                // Also log the reading
                await supabase.from('quran_reading_log').upsert({
                    user_id: user.id,
                    read_date: todayString,
                    pages_count: pages,
                    juz_number: newJuz,
                }, {
                    onConflict: 'user_id,read_date',
                });

                // Refresh leaderboard
                fetchLeaderboard();
            } catch (error) {
                console.error('Error syncing Quran progress:', error);
            }
        }

        addToast(`📖 +${pages} halaman Al-Quran hari ini!`, 'success');
    }, [quranProgress, isOnlineMode, user, todayString]);

    // Calculate stats
    const getStats = useCallback(() => {
        const todayActivities = getTodayActivities();
        const completedToday = todayActivities.filter(a => a.completed).length;
        const totalActivities = todayActivities.length;

        let totalCompleted = 0;
        Object.values(activities).forEach(dayData => {
            totalCompleted += Object.values(dayData).filter(Boolean).length;
        });

        return {
            completedToday,
            totalActivities,
            percentage: Math.round((completedToday / totalActivities) * 100),
            totalCompleted,
            currentDay: currentRamadanDay,
            quranJuz: quranProgress.currentJuz,
            quranPages: quranProgress.pagesRead,
        };
    }, [getTodayActivities, activities, currentRamadanDay, quranProgress]);

    // Toast management
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    // Get history
    const getHistory = useCallback(() => {
        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];
        return Object.entries(activities)
            .map(([date, dayData]) => ({
                date,
                activities: allActivities.filter(a => dayData[a.id]).map(a => a.name),
                missed: allActivities.filter(a => !dayData[a.id] && a.category === 'wajib').map(a => a.name),
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [activities]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotifications(true);
                addToast('🔔 Notifikasi diaktifkan!', 'success');
                return true;
            }
        }
        return false;
    }, [addToast]);

    // Reset today's activities
    const resetToday = useCallback(async () => {
        setActivities(prev => ({
            ...prev,
            [todayString]: {},
        }));

        if (isOnlineMode && user) {
            try {
                await supabase
                    .from('daily_activities')
                    .update({ completed: false, completed_at: null })
                    .eq('user_id', user.id)
                    .eq('activity_date', todayString);
            } catch (error) {
                console.error('Error resetting activities:', error);
            }
        }

        addToast('🔄 Aktivitas hari ini direset', 'info');
    }, [todayString, isOnlineMode, user, addToast]);

    const value = {
        // State
        activities,
        quranProgress,
        notifications,
        currentPage,
        toasts,
        isLoading,
        currentRamadanDay,
        todayString,
        leaderboard,
        communityStats,
        announcements,
        isOnlineMode,

        // Setters
        setCurrentPage,
        setNotifications,

        // Actions
        toggleActivity,
        addPagesRead,
        addToast,
        resetToday,
        requestNotificationPermission,
        fetchLeaderboard,
        fetchCommunityStats,

        // Getters
        getTodayActivities,
        getStats,
        getHistory,

        // Constants
        DEFAULT_PRAYERS,
        DEFAULT_SUNNAH,
        DEFAULT_ACTIVITIES,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
