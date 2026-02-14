'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import QURAN_SURAHS, { TOTAL_AYAT } from '../data/quranSurahs';

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

// Helper: get next date string
const getNextDateString = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

// Helper: parse "HH:MM" to minutes
const parseTimeToMinutes = (t) => {
    if (!t) return null;
    const m = t.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1]) * 60 + parseInt(m[2]);
};

// Helper: check if a session is overnight (end < start)
const isOvernightSession = (start, end) => {
    if (!start || !end) return false;
    const sm = parseTimeToMinutes(start);
    const em = parseTimeToMinutes(end);
    if (sm === null || em === null) return false;
    return em < sm; // e.g., 21:00 start, 03:00 end
};

export function AppProvider({ children }) {
    const { user, profile } = useAuth();

    const [activities, setActivities] = useState({});
    const [quranReadings, setQuranReadings] = useState([]); // [{id, read_date, surah_number, start_ayat, end_ayat}]
    const [notifications, setNotifications] = useState(true);
    const [currentPage, setCurrentPageState] = useState('home');
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [communityStats, setCommunityStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [customActivities, setCustomActivities] = useState([]);

    // Valid pages for persistence
    const VALID_PAGES = ['home', 'quran', 'rekap', 'leaderboard', 'settings', 'admin', 'admin_dashboard', 'admin_members', 'admin_activities', 'admin_announcements'];

    // Wrapper: save currentPage to localStorage on change
    const setCurrentPage = useCallback((page) => {
        setCurrentPageState(page);
        if (typeof window !== 'undefined') {
            localStorage.setItem('ramadhan_current_page', page);
        }
    }, []);

    // Restore saved page on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedPage = localStorage.getItem('ramadhan_current_page');
            if (savedPage && VALID_PAGES.includes(savedPage)) {
                setCurrentPageState(savedPage);
            }
        }
    }, []);
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

    // Initialize selected day (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ramadhan_last_viewed_day');
            if (saved) {
                const parsedDay = parseInt(saved);
                if (parsedDay >= 1 && parsedDay <= 30) {
                    setSelectedRamadanDay(parsedDay);
                    return;
                }
            }
            setSelectedRamadanDay(clampedRamadanDay);
        }
    }, []); // Run only once on mount

    // Save selected day whenever it changes (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedRamadanDay >= 1 && selectedRamadanDay <= 30) {
            localStorage.setItem('ramadhan_last_viewed_day', selectedRamadanDay.toString());
        }
    }, [selectedRamadanDay]);

    // Load data when user logs in
    useEffect(() => {
        let isMounted = true;

        if (user) {
            loadAllData(isMounted);
        } else {
            // Reset state when logged out
            setActivities({});
            setQuranReadings([]);
            setLeaderboard([]);
            setCommunityStats(null);
            setAnnouncements([]);
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [user?.id, profile?.user_group]);

    // Load ALL data in parallel for fast loading
    const loadAllData = async (isMounted = true) => {
        setIsLoading(true);

        try {
            // ESSENTIAL: Load user activities and quran readings
            const [activitiesResult, quranResult] = await Promise.all([
                supabase.from('daily_activities').select('*').eq('user_id', user.id),
                supabase.from('quran_readings').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
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
                        added: a.added || false,
                        name: a.activity_name,
                        category: a.activity_category,
                    };
                });
                setActivities(allActivities);
            }

            // Process Quran readings
            if (quranResult.data) {
                setQuranReadings(quranResult.data.map(r => ({
                    id: r.id,
                    readDate: r.read_date,
                    surahNumber: r.surah_number,
                    startAyat: r.start_ayat,
                    endAyat: r.end_ayat,
                })));
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

        // Load custom activities from admin
        try {
            const { data: customData, error: customError } = await supabase
                .from('custom_activities')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });

            console.log('Custom activities fetch result:', { customData, customError });

            if (customError) {
                console.error('Error fetching custom activities:', customError);
            }

            if (customData && customData.length > 0) {
                // Filter by user's group
                const userGroup = profile?.user_group;
                const filteredCustom = customData.filter(item => {
                    // If target_groups is null or empty, show to everyone
                    if (!item.target_groups || item.target_groups.length === 0) return true;
                    // If user has a group, check if it matches
                    if (userGroup && item.target_groups.includes(userGroup)) return true;
                    // If user has no group, only show activities with no target
                    return false;
                });

                const formatted = filteredCustom.map(item => ({
                    id: `custom_${item.id}`,
                    name: item.name,
                    icon: item.icon || '📌',
                    category: item.category,
                    description: item.description,
                    isCustom: true,
                }));
                console.log('Formatted custom activities:', formatted);
                setCustomActivities(formatted);
            }
        } catch (e) {
            console.error('Custom activities error:', e);
        }
    };

    // Load user data only (for revert/refresh after error)
    const loadUserData = async (isMounted = true) => {
        try {
            const [{ data: activityData }, { data: quranData }] = await Promise.all([
                supabase.from('daily_activities').select('*').eq('user_id', user.id),
                supabase.from('quran_readings').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            ]);
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
            if (quranData) {
                setQuranReadings(quranData.map(r => ({
                    id: r.id,
                    readDate: r.read_date,
                    surahNumber: r.surah_number,
                    startAyat: r.start_ayat,
                    endAyat: r.end_ayat,
                })));
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

    const fetchCustomActivities = async () => {
        try {
            const { data, error } = await supabase
                .from('custom_activities')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });

            if (error) throw error;
            if (data) {
                // Transform to match activity format
                const formatted = data.map(item => ({
                    id: `custom_${item.id}`,
                    name: item.name,
                    icon: item.icon || '📌',
                    category: item.category,
                    description: item.description,
                    isCustom: true,
                }));
                setCustomActivities(formatted);
            }
        } catch (error) {
            console.error('Error fetching custom activities:', error);
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

    // Get custom activities that user has added for the selected day
    const getAddedCustomActivitiesForDay = useCallback((dateStr) => {
        const dayData = activities[dateStr || selectedDateString] || {};
        return customActivities.filter(ca => dayData[ca.id]?.added);
    }, [activities, selectedDateString, customActivities]);

    // Get activities for selected day (only includes custom activities user explicitly added)
    const getSelectedDayActivities = useCallback(() => {
        const dayData = activities[selectedDateString] || {};
        const addedCustom = getAddedCustomActivitiesForDay();
        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...addedCustom];

        const result = allActivities.map(activity => {
            const activityData = dayData[activity.id];
            const isCompleted = activityData?.completed || false;

            return {
                ...activity,
                completed: isCompleted,
                timeData: activityData || null,
            };
        });

        // Add spillover activities (overnight from previous day)
        Object.entries(dayData).forEach(([key, data]) => {
            if (key.endsWith('__spillover') && data?.completed) {
                const originalId = key.replace('__spillover', '');
                // Find original activity for icon/category
                const allDefault = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
                const original = allDefault.find(a => a.id === originalId);
                result.push({
                    id: key,
                    name: `${original?.name || originalId} (lanjutan)`,
                    icon: original?.icon || '🔄',
                    category: original?.category || 'other',
                    completed: true,
                    timeData: data,
                    isSpillover: true,
                });
            }
        });

        return result;
    }, [activities, selectedDateString, getAddedCustomActivitiesForDay, customActivities]);

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

        // Validation removed: Users can fill any day (honesty system)

        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
        const activity = allActivities.find(a => a.id === activityId);
        const currentData = activities[selectedDateString]?.[activityId];
        const currentlyCompleted = currentData?.completed || false;
        const newCompleted = !currentlyCompleted;
        const isCustom = activity?.isCustom || false;

        // Create new activity data
        let newActivityData;
        if (newCompleted) {
            newActivityData = {
                completed: true,
                startTime: startTime || null,
                endTime: endTime || null,
                completedAt: new Date().toISOString(),
                added: currentData?.added || isCustom, // preserve added flag
            };
        } else if (isCustom) {
            // Custom activity: keep it added but uncompleted
            newActivityData = {
                completed: false,
                added: true,
            };
        } else {
            newActivityData = null;
        }

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
                    added: isCustom ? true : false,
                };

                const { error } = await supabase
                    .from('daily_activities')
                    .upsert(upsertData, {
                        onConflict: 'user_id,activity_date,activity_id',
                    });

                if (error) throw error;

                // === OVERNIGHT SPILLOVER ===
                await handleOvernightSpillover(activityId, activity, startTime, endTime, selectedDateString);
            } else if (isCustom) {
                // Custom activity: update to uncompleted but keep the row (added=true)
                const { error } = await supabase
                    .from('daily_activities')
                    .upsert({
                        user_id: user.id,
                        activity_date: selectedDateString,
                        activity_id: activityId,
                        activity_name: activity?.name || activityId,
                        activity_category: activity?.category || 'custom',
                        completed: false,
                        added: true,
                    }, {
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

                // Also remove spillover from next day if exists
                const nextDate = getNextDateString(selectedDateString);
                const spilloverId = `${activityId}__spillover`;
                await supabase
                    .from('daily_activities')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('activity_date', nextDate)
                    .eq('activity_id', spilloverId);
                // Remove from local state
                setActivities(prev => {
                    const nextDayData = { ...prev[nextDate] };
                    delete nextDayData[spilloverId];
                    return { ...prev, [nextDate]: nextDayData };
                });
            }

            // Show toast
            if (activity) {
                const dayLabel = isSelectedDayToday ? '' : ` (Hari ${selectedRamadanDay})`;
                let timeInfo = '';
                if (newCompleted && startTime) {
                    if (endTime === '__multi__') {
                        // Multi-session format
                        try {
                            const sessions = JSON.parse(startTime);
                            timeInfo = ` (${sessions.length} sesi)`;
                        } catch { timeInfo = ''; }
                    } else {
                        timeInfo = endTime ? ` ${startTime}-${endTime}` : ` ${startTime}`;
                    }
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
    }, [activities, selectedDateString, selectedRamadanDay, isSelectedDayToday, user, customActivities]);

    // === Handle Overnight Spillover ===
    // Detects sessions that cross midnight and auto-creates next-day entries
    const handleOvernightSpillover = useCallback(async (activityId, activity, startTime, endTime, dateString) => {
        if (!user) return;
        const nextDate = getNextDateString(dateString);
        const spilloverId = `${activityId}__spillover`;

        let spilloverSessions = [];

        if (endTime === '__multi__' && startTime) {
            // Multi-session: check each session
            try {
                const sessions = JSON.parse(startTime);
                sessions.forEach(s => {
                    if (isOvernightSession(s.start, s.end)) {
                        spilloverSessions.push({ start: '00:00', end: s.end });
                    }
                });
            } catch { /* ignore parse errors */ }
        } else if (startTime && endTime && isOvernightSession(startTime, endTime)) {
            // Single session overnight
            spilloverSessions.push({ start: '00:00', end: endTime });
        }

        if (spilloverSessions.length === 0) {
            // No overnight — remove any existing spillover
            await supabase
                .from('daily_activities')
                .delete()
                .eq('user_id', user.id)
                .eq('activity_date', nextDate)
                .eq('activity_id', spilloverId);
            setActivities(prev => {
                const nextDayData = { ...prev[nextDate] };
                delete nextDayData[spilloverId];
                return { ...prev, [nextDate]: nextDayData };
            });
            return;
        }

        // Build spillover time data
        let spillStartTime, spillEndTime;
        if (spilloverSessions.length === 1) {
            spillStartTime = spilloverSessions[0].start;
            spillEndTime = spilloverSessions[0].end;
        } else {
            spillStartTime = JSON.stringify(spilloverSessions);
            spillEndTime = '__multi__';
        }

        // Optimistic update for next day
        setActivities(prev => ({
            ...prev,
            [nextDate]: {
                ...prev[nextDate],
                [spilloverId]: {
                    completed: true,
                    startTime: spillStartTime,
                    endTime: spillEndTime,
                    completedAt: new Date().toISOString(),
                    spillover: true,
                },
            },
        }));

        // Upsert spillover to Supabase
        await supabase
            .from('daily_activities')
            .upsert({
                user_id: user.id,
                activity_date: nextDate,
                activity_id: spilloverId,
                activity_name: `${activity?.name || activityId} (lanjutan)`,
                activity_category: activity?.category || 'other',
                completed: true,
                completed_at: new Date().toISOString(),
                start_time: spillStartTime,
                end_time: spillEndTime,
            }, {
                onConflict: 'user_id,activity_date,activity_id',
            });
    }, [user]);

    // Update activity time data without toggling completion status
    const updateActivityTime = useCallback(async (activityId, startTime, endTime) => {
        if (!user) return;

        const allActivities = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
        const activity = allActivities.find(a => a.id === activityId);
        const currentData = activities[selectedDateString]?.[activityId];
        if (!currentData?.completed) return; // Only update time on completed activities

        // Optimistic update
        setActivities(prev => ({
            ...prev,
            [selectedDateString]: {
                ...prev[selectedDateString],
                [activityId]: {
                    ...currentData,
                    startTime: startTime || null,
                    endTime: endTime || null,
                },
            },
        }));

        try {
            const { error } = await supabase
                .from('daily_activities')
                .update({
                    start_time: startTime || null,
                    end_time: endTime || null,
                })
                .eq('user_id', user.id)
                .eq('activity_date', selectedDateString)
                .eq('activity_id', activityId);

            if (error) throw error;

            // === OVERNIGHT SPILLOVER ===
            await handleOvernightSpillover(activityId, activity, startTime, endTime, selectedDateString);

            // Format toast
            let timeInfo = '';
            if (endTime === '__multi__') {
                try {
                    const sessions = JSON.parse(startTime);
                    timeInfo = ` (${sessions.length} sesi)`;
                } catch { timeInfo = ''; }
            } else {
                timeInfo = endTime ? ` ${startTime}-${endTime}` : ` ${startTime}`;
            }
            const dayLabel = isSelectedDayToday ? '' : ` (Hari ${selectedRamadanDay})`;
            addToast(`✅ Waktu diperbarui${timeInfo}${dayLabel}`, 'success');
        } catch (error) {
            addToast('Gagal memperbarui waktu. Coba lagi.', 'error');
            loadUserData(true);
        }
    }, [activities, selectedDateString, selectedRamadanDay, isSelectedDayToday, user, customActivities, handleOvernightSpillover]);

    // Add a custom activity to the selected day
    const addCustomActivityToDay = useCallback(async (activityId) => {
        if (!user) {
            addToast('Silakan login terlebih dahulu', 'error');
            return;
        }

        const activity = customActivities.find(a => a.id === activityId);
        if (!activity) return;

        // Mark as added (not completed yet)
        setActivities(prev => ({
            ...prev,
            [selectedDateString]: {
                ...prev[selectedDateString],
                [activityId]: {
                    completed: false,
                    added: true,
                    addedAt: new Date().toISOString(),
                },
            },
        }));

        addToast(`➕ ${activity.name} ditambahkan ke Hari ${selectedRamadanDay}`, 'success');

        // Sync to Supabase
        try {
            await supabase
                .from('daily_activities')
                .upsert({
                    user_id: user.id,
                    activity_date: selectedDateString,
                    activity_id: activityId,
                    activity_name: activity.name,
                    activity_category: activity.category || 'custom',
                    completed: false,
                    added: true,
                }, {
                    onConflict: 'user_id,activity_date,activity_id',
                });
        } catch (error) {
            console.error('Error adding custom activity:', error);
        }
    }, [user, selectedDateString, selectedRamadanDay, customActivities]);

    // Remove a custom activity from the selected day
    const removeCustomActivityFromDay = useCallback(async (activityId) => {
        if (!user) return;

        const activity = customActivities.find(a => a.id === activityId);

        // Remove from local state
        setActivities(prev => {
            const dayData = { ...prev[selectedDateString] };
            delete dayData[activityId];
            return { ...prev, [selectedDateString]: dayData };
        });

        addToast(`🗑️ ${activity?.name || 'Aktivitas'} dihapus dari Hari ${selectedRamadanDay}`, 'info');

        // Remove from Supabase
        try {
            await supabase
                .from('daily_activities')
                .delete()
                .eq('user_id', user.id)
                .eq('activity_date', selectedDateString)
                .eq('activity_id', activityId);
        } catch (error) {
            console.error('Error removing custom activity:', error);
        }
    }, [user, selectedDateString, selectedRamadanDay, customActivities]);

    // ==================== QURAN AYAT TRACKING ====================

    // Add a Quran reading session (surah + ayat range + date)
    const addQuranReading = useCallback(async (surahNumber, startAyat, endAyat, readDate) => {
        if (!user) {
            addToast('Silakan login terlebih dahulu', 'error');
            return;
        }

        const dateStr = readDate || todayString;
        const surah = QURAN_SURAHS.find(s => s.number === surahNumber);
        if (!surah) return;

        // Validate ayat range
        const clampedStart = Math.max(1, Math.min(startAyat, surah.totalAyat));
        const clampedEnd = Math.max(clampedStart, Math.min(endAyat, surah.totalAyat));

        // Optimistic: add to local state with temp ID
        const tempId = `temp_${Date.now()}`;
        const newReading = {
            id: tempId,
            readDate: dateStr,
            surahNumber,
            startAyat: clampedStart,
            endAyat: clampedEnd,
        };
        setQuranReadings(prev => [...prev, newReading]);

        try {
            const { data, error } = await supabase
                .from('quran_readings')
                .insert({
                    user_id: user.id,
                    read_date: dateStr,
                    surah_number: surahNumber,
                    start_ayat: clampedStart,
                    end_ayat: clampedEnd,
                })
                .select()
                .single();

            if (error) throw error;

            // Replace temp ID with real ID
            setQuranReadings(prev =>
                prev.map(r => r.id === tempId
                    ? { ...r, id: data.id }
                    : r
                )
            );

            const ayatCount = clampedEnd - clampedStart + 1;
            addToast(`📖 ${surah.name} ayat ${clampedStart}-${clampedEnd} (${ayatCount} ayat)`, 'success');
        } catch (error) {
            console.error('Error saving Quran reading:', error);
            // Revert optimistic update
            setQuranReadings(prev => prev.filter(r => r.id !== tempId));
            if (error.code === '23505') {
                addToast('Bacaan ini sudah tercatat sebelumnya', 'info');
            } else {
                addToast('Gagal menyimpan. Coba lagi.', 'error');
            }
        }
    }, [user, todayString]);

    // Delete a quran reading session
    const deleteQuranReading = useCallback(async (readingId) => {
        if (!user) return;

        const deleted = quranReadings.find(r => r.id === readingId);
        setQuranReadings(prev => prev.filter(r => r.id !== readingId));

        try {
            const { error } = await supabase
                .from('quran_readings')
                .delete()
                .eq('id', readingId)
                .eq('user_id', user.id);

            if (error) throw error;
            addToast('🗑️ Bacaan dihapus', 'info');
        } catch (error) {
            console.error('Error deleting Quran reading:', error);
            // Revert
            if (deleted) setQuranReadings(prev => [...prev, deleted]);
            addToast('Gagal menghapus. Coba lagi.', 'error');
        }
    }, [user, quranReadings]);

    // Reset all Quran readings
    const resetQuranReadings = useCallback(async () => {
        if (!user) return;

        const backup = [...quranReadings];
        setQuranReadings([]);

        try {
            const { error } = await supabase
                .from('quran_readings')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            addToast('🔄 Progress Al-Quran direset', 'info');
        } catch (error) {
            console.error('Error resetting Quran readings:', error);
            setQuranReadings(backup);
            addToast('Gagal mereset. Coba lagi.', 'error');
        }
    }, [user, quranReadings]);

    // Get readings for a specific day
    const getQuranReadingsForDay = useCallback((dateStr) => {
        return quranReadings.filter(r => r.readDate === dateStr);
    }, [quranReadings]);

    // Compute global progress: unique ayat read / total ayat
    const quranGlobalProgress = useMemo(() => {
        // Build set of unique "surah:ayat" keys
        const readAyatSet = new Set();
        quranReadings.forEach(r => {
            for (let a = r.startAyat; a <= r.endAyat; a++) {
                readAyatSet.add(`${r.surahNumber}:${a}`);
            }
        });

        const totalRead = readAyatSet.size;
        const percentage = TOTAL_AYAT > 0 ? Math.round((totalRead / TOTAL_AYAT) * 1000) / 10 : 0;

        // Per-surah breakdown
        const surahProgress = QURAN_SURAHS.map(s => {
            let readCount = 0;
            for (let a = 1; a <= s.totalAyat; a++) {
                if (readAyatSet.has(`${s.number}:${a}`)) readCount++;
            }
            return {
                ...s,
                readCount,
                completed: readCount === s.totalAyat,
                percentage: s.totalAyat > 0 ? Math.round((readCount / s.totalAyat) * 100) : 0,
            };
        });

        return {
            totalRead,
            totalAyat: TOTAL_AYAT,
            percentage,
            surahProgress,
            completedSurahs: surahProgress.filter(s => s.completed).length,
        };
    }, [quranReadings]);

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
            quranTotalRead: quranGlobalProgress.totalRead,
            quranPercentage: quranGlobalProgress.percentage,
            streak,
        };
    }, [getSelectedDayActivities, activities, currentRamadanDay, selectedRamadanDay, quranGlobalProgress]);

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

    // Day navigation - Allow navigating all 30 days
    const goToPreviousDay = useCallback(() => {
        if (selectedRamadanDay > 1) {
            setSelectedRamadanDay(prev => prev - 1);
        }
    }, [selectedRamadanDay]);

    const goToNextDay = useCallback(() => {
        if (selectedRamadanDay < 30) {
            setSelectedRamadanDay(prev => prev + 1);
        }
    }, [selectedRamadanDay]);

    const goToDay = useCallback((day) => {
        if (day >= 1 && day <= 30) {
            setSelectedRamadanDay(day);
        }
    }, []);

    const goToToday = useCallback(() => {
        // Use clamped day to ensure we don't go to negative day
        setSelectedRamadanDay(clampedRamadanDay);
    }, [clampedRamadanDay]);

    const value = {
        // State
        activities,
        quranReadings,
        quranGlobalProgress,
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
        customActivities,

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
        updateActivityTime,
        addQuranReading,
        deleteQuranReading,
        resetQuranReadings,
        addToast,
        resetToday: resetSelectedDay,
        requestNotificationPermission,
        fetchLeaderboard,
        fetchCommunityStats,
        loadUserData,
        addCustomActivityToDay,
        removeCustomActivityFromDay,

        // Getters
        getTodayActivities: getSelectedDayActivities,
        getSelectedDayActivities,
        getAddedCustomActivitiesForDay,
        getActivityTimeData,
        getQuranReadingsForDay,
        getStats,
        getHistory,
        getDateForRamadanDay,

        // Constants
        DEFAULT_PRAYERS,
        DEFAULT_SUNNAH,
        DEFAULT_ACTIVITIES,
        QURAN_SURAHS,
        TOTAL_AYAT,
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
