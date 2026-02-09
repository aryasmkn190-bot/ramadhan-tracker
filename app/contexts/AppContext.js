'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

const RAMADAN_START = new Date('2026-02-19');

// Helper to get date string for a specific Ramadan day
const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
};

export function AppProvider({ children }) {
    const { user } = useAuth();

    const [activities, setActivities] = useState({});
    const [quranProgress, setQuranProgress] = useState({ currentJuz: 1, pagesRead: 0 });
    const [notifications, setNotifications] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [communityStats, setCommunityStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

    // Selected day for viewing/editing
    const [selectedRamadanDay, setSelectedRamadanDay] = useState(1);

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const daysSinceRamadan = Math.ceil((today - RAMADAN_START) / (1000 * 60 * 60 * 24));
    // Real current day (can be negative if before Ramadan)
    const currentRamadanDay = daysSinceRamadan + 1;
    // Clamped for UI defaults (1-30)
    const clampedRamadanDay = Math.min(Math.max(currentRamadanDay, 1), 30);

    const selectedDateString = getDateForRamadanDay(selectedRamadanDay);
    const isSelectedDayToday = selectedRamadanDay === currentRamadanDay;

    // Initialize selected day
    useEffect(() => {
        setSelectedRamadanDay(clampedRamadanDay);
    }, [clampedRamadanDay]);

    // Load data when user logs in
    useEffect(() => {
        let isMounted = true;

        if (user) {
            loadAllData(isMounted);
        } else {
            // Reset state when logged out
            setActivities({});
            setQuranProgress({ currentJuz: 1, pagesRead: 0 });
            setLeaderboard([]);
            setCommunityStats(null);
            setAnnouncements([]);
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [user]);

    // Load ALL data in parallel for fast loading
    const loadAllData = async (isMounted = true) => {
        setIsLoading(true);

        try {
            // ESSENTIAL: Load user activities and quran progress only
            const [activitiesResult, quranResult] = await Promise.all([
                supabase.from('daily_activities').select('*').eq('user_id', user.id),
                supabase.from('quran_progress').select('*').eq('user_id', user.id).maybeSingle(),
            ]);

            if (!isMounted) return;

            // Process activities
            if (activitiesResult.data) {
                const allActivities = {};
                activitiesResult.data.forEach(a => {
                    if (!allActivities[a.activity_date]) {
                        allActivities[a.activity_date] = {};
                    }
                    allActivities[a.activity_date][a.activity_id] = {
                        completed: a.completed,
                        startTime: a.start_time,
                        endTime: a.end_time,
                        completedAt: a.completed_at,
                    };
                });
                setActivities(allActivities);
            }

            // Process Quran progress
            if (quranResult.data) {
                setQuranProgress({
                    currentJuz: quranResult.data.current_juz || 1,
                    pagesRead: quranResult.data.pages_read || 0,
                });
            }

        } catch (error) {
            console.error('Error loading essential data:', error);
        } finally {
            // Always finish loading - even if there's an error
            if (isMounted) {
                setIsLoading(false);
            }
        }

        // OPTIONAL: Load community data in background (non-blocking)
        loadOptionalData();
    };

    // Load optional community data in background
    const loadOptionalData = async () => {
        try {
            const { data: leaderboardData } = await supabase
                .from('quran_leaderboard')
                .select('*')
                .limit(20);
            if (leaderboardData) setLeaderboard(leaderboardData);
        } catch (e) { /* Leaderboard not available */ }

        try {
            const { data: statsData } = await supabase
                .from('community_stats')
                .select('*')
                .maybeSingle();
            if (statsData) setCommunityStats(statsData);
        } catch (e) { /* Stats not available */ }

        try {
            const { data: announcementsData } = await supabase
                .from('announcements')
                .select('*, profiles(full_name)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            if (announcementsData) setAnnouncements(announcementsData);
        } catch (e) { /* Announcements not available */ }
    };

    // Load user data only (for revert/refresh after error)
    const loadUserData = async (isMounted = true) => {
        try {
            const { data: activityData } = await supabase.from('daily_activities').select('*').eq('user_id', user.id);
            if (!isMounted) return;
            if (activityData) {
                const allActivities = {};
                activityData.forEach(a => {
                    if (!allActivities[a.activity_date]) {
                        allActivities[a.activity_date] = {};
                    }
                    allActivities[a.activity_date][a.activity_id] = {
                        completed: a.completed,
                        startTime: a.start_time,
                        endTime: a.end_time,
                        completedAt: a.completed_at,
                    };
                });
                setActivities(allActivities);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error loading user data:', error);
        }
    };

    const fetchLeaderboard = async () => {
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

    // Get activities for selected day
    const getSelectedDayActivities = useCallback(() => {
        const dayData = activities[selectedDateString] || {};
        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];

        return allActivities.map(activity => {
            const activityData = dayData[activity.id];
            const isCompleted = activityData?.completed || false;

            return {
                ...activity,
                completed: isCompleted,
                timeData: activityData || null,
            };
        });
    }, [activities, selectedDateString]);

    // Get time data for a specific activity
    const getActivityTimeData = useCallback((activityId) => {
        const dayData = activities[selectedDateString] || {};
        const activityData = dayData[activityId];

        if (activityData) {
            return {
                startTime: activityData.startTime,
                endTime: activityData.endTime,
            };
        }
        return null;
    }, [activities, selectedDateString]);

    // Toggle activity completion
    const toggleActivity = useCallback(async (activityId, startTime = null, endTime = null) => {
        if (!user) {
            addToast('Silakan login terlebih dahulu', 'error');
            return;
        }

        // Prevent filling future dates
        const today = new Date();
        const selectedDate = new Date(selectedDateString);
        // Reset hours to compare dates only
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            addToast('Belum waktunya mengisi hari ini! 🚫', 'error');
            return;
        }

        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];
        const activity = allActivities.find(a => a.id === activityId);
        const currentData = activities[selectedDateString]?.[activityId];
        const currentlyCompleted = currentData?.completed || false;
        const newCompleted = !currentlyCompleted;

        // Create new activity data
        const newActivityData = newCompleted ? {
            completed: true,
            startTime: startTime || null,
            endTime: endTime || null,
            completedAt: new Date().toISOString(),
        } : null;

        // Optimistic update
        setActivities(prev => ({
            ...prev,
            [selectedDateString]: {
                ...prev[selectedDateString],
                [activityId]: newActivityData,
            },
        }));

        // Sync to Supabase
        try {
            if (newCompleted) {
                const upsertData = {
                    user_id: user.id,
                    activity_date: selectedDateString,
                    activity_id: activityId,
                    activity_name: activity?.name || activityId,
                    activity_category: activity?.category || 'other',
                    completed: true,
                    completed_at: new Date().toISOString(),
                    start_time: startTime || null,
                    end_time: endTime || null,
                };

                const { error } = await supabase
                    .from('daily_activities')
                    .upsert(upsertData, {
                        onConflict: 'user_id,activity_date,activity_id',
                    });

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('daily_activities')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('activity_date', selectedDateString)
                    .eq('activity_id', activityId);

                if (error) throw error;
            }

            // Show toast
            if (activity) {
                const dayLabel = isSelectedDayToday ? '' : ` (Hari ${selectedRamadanDay})`;
                let timeInfo = '';
                if (newCompleted && startTime) {
                    timeInfo = endTime ? ` ${startTime}-${endTime}` : ` ${startTime}`;
                }
                addToast(
                    newCompleted
                        ? `✅ ${activity.name}${timeInfo} tercatat!${dayLabel}`
                        : `↩️ ${activity.name} dibatalkan${dayLabel}`,
                    newCompleted ? 'success' : 'info'
                );
            }
        } catch (error) {
            addToast('Gagal menyimpan. Coba lagi.', 'error');
            loadUserData(true);
        }
    }, [activities, selectedDateString, selectedRamadanDay, isSelectedDayToday, user]);

    // Update Quran progress
    const addPagesRead = useCallback(async (pages) => {
        if (!user) {
            addToast('Silakan login terlebih dahulu', 'error');
            return;
        }

        const newPages = quranProgress.pagesRead + pages;
        const newJuz = Math.min(Math.floor(newPages / 20) + 1, 30);

        // Optimistic update
        setQuranProgress({ currentJuz: newJuz, pagesRead: newPages });

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

            // Log the reading
            await supabase.from('quran_reading_log').upsert({
                user_id: user.id,
                read_date: todayString,
                pages_count: pages,
                juz_number: newJuz,
            }, {
                onConflict: 'user_id,read_date',
            });

            fetchLeaderboard();
            addToast(`📖 +${pages} halaman Al-Quran!`, 'success');
        } catch (error) {
            console.error('Error syncing Quran progress:', error);
            addToast('Gagal menyimpan. Coba lagi.', 'error');
            loadUserData();
        }
    }, [quranProgress, user, todayString]);

    // Calculate stats
    const getStats = useCallback(() => {
        const dayActivities = getSelectedDayActivities();
        const completedDay = dayActivities.filter(a => a.completed).length;
        const totalActivities = dayActivities.length;

        let totalCompleted = 0;
        Object.values(activities).forEach(dayData => {
            totalCompleted += Object.values(dayData).filter(a => a?.completed).length;
        });

        // Calculate streak
        let streak = 0;
        for (let day = currentRamadanDay; day >= 1; day--) {
            const dateStr = getDateForRamadanDay(day);
            const dayData = activities[dateStr] || {};
            const wajibCompleted = DEFAULT_PRAYERS.every(p => dayData[p.id]?.completed);
            if (wajibCompleted) {
                streak++;
            } else {
                break;
            }
        }

        return {
            completedToday: completedDay,
            totalActivities,
            percentage: Math.round((completedDay / totalActivities) * 100),
            totalCompleted,
            currentDay: currentRamadanDay,
            selectedDay: selectedRamadanDay,
            quranJuz: quranProgress.currentJuz,
            quranPages: quranProgress.pagesRead,
            streak,
        };
    }, [getSelectedDayActivities, activities, currentRamadanDay, selectedRamadanDay, quranProgress]);

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
        const history = [];

        for (let day = 1; day <= currentRamadanDay; day++) {
            const dateStr = getDateForRamadanDay(day);
            const dayData = activities[dateStr] || {};

            history.push({
                date: dateStr,
                day,
                activities: allActivities.filter(a => dayData[a.id]?.completed).map(a => a.name),
                missed: allActivities.filter(a => !dayData[a.id]?.completed && a.category === 'wajib').map(a => a.name),
                completedCount: Object.values(dayData).filter(a => a?.completed).length,
                totalCount: allActivities.length,
            });
        }

        return history.reverse();
    }, [activities, currentRamadanDay]);

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

    // Reset selected day's activities
    const resetSelectedDay = useCallback(async () => {
        if (!user) return;

        try {
            await supabase
                .from('daily_activities')
                .delete()
                .eq('user_id', user.id)
                .eq('activity_date', selectedDateString);

            setActivities(prev => ({
                ...prev,
                [selectedDateString]: {},
            }));

            addToast(`🔄 Aktivitas Hari ${selectedRamadanDay} direset`, 'info');
        } catch (error) {
            console.error('Error resetting activities:', error);
            addToast('Gagal mereset. Coba lagi.', 'error');
        }
    }, [selectedDateString, selectedRamadanDay, user, addToast]);

    // Day navigation
    const goToPreviousDay = useCallback(() => {
        if (selectedRamadanDay > 1) {
            setSelectedRamadanDay(prev => prev - 1);
        }
    }, [selectedRamadanDay]);

    const goToNextDay = useCallback(() => {
        if (selectedRamadanDay < currentRamadanDay) {
            setSelectedRamadanDay(prev => prev + 1);
        }
    }, [selectedRamadanDay, currentRamadanDay]);

    const goToDay = useCallback((day) => {
        if (day >= 1 && day <= currentRamadanDay) {
            setSelectedRamadanDay(day);
        }
    }, [currentRamadanDay]);

    const goToToday = useCallback(() => {
        setSelectedRamadanDay(currentRamadanDay);
    }, [currentRamadanDay]);

    const value = {
        // State
        activities,
        quranProgress,
        notifications,
        currentPage,
        toasts,
        isLoading,
        currentRamadanDay,
        selectedRamadanDay,
        selectedDateString,
        isSelectedDayToday,
        todayString,
        leaderboard,
        communityStats,
        announcements,

        // Setters
        setCurrentPage,
        setNotifications,
        setSelectedRamadanDay,

        // Navigation
        goToPreviousDay,
        goToNextDay,
        goToDay,
        goToToday,

        // Actions
        toggleActivity,
        addPagesRead,
        addToast,
        resetToday: resetSelectedDay,
        requestNotificationPermission,
        fetchLeaderboard,
        fetchCommunityStats,
        loadUserData,

        // Getters
        getTodayActivities: getSelectedDayActivities,
        getSelectedDayActivities,
        getActivityTimeData,
        getStats,
        getHistory,
        getDateForRamadanDay,

        // Constants
        DEFAULT_PRAYERS,
        DEFAULT_SUNNAH,
        DEFAULT_ACTIVITIES,
        RAMADAN_START,
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
