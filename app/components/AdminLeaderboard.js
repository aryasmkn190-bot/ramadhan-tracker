'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserDetailModal from './UserDetailModal';
import Pagination, { usePagination } from './Pagination';
import { USER_GROUPS, GROUP_COLORS } from '../data/userGroups';
import { getSessionCount } from '../utils/activityHelpers';

const RAMADAN_START_STR = '2026-02-18'; // 1 Ramadhan 1447 H

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START_STR + 'T00:00:00');
    date.setDate(date.getDate() + day - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export default function AdminLeaderboard() {
    const [profiles, setProfiles] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [quranData, setQuranData] = useState([]);
    const [customActivitiesList, setCustomActivitiesList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterMode, setFilterMode] = useState('all'); // 'day', 'week', 'all'
    const [selectedDay, setSelectedDay] = useState(1);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [rankBy, setRankBy] = useState('total'); // 'total', 'sholat', 'sunnah', 'aktivitas', 'quran'
    const [filterActivity, setFilterActivity] = useState('all'); // 'all' or specific activity id
    const [selectedUser, setSelectedUser] = useState(null);

    // Current Ramadan day — starts at Maghrib (18:00) on Feb 18 2026
    const today = new Date();
    const RAMADAN_MAGHRIB_START = new Date('2026-02-18T18:00:00');
    const msSinceRamadan = today - RAMADAN_MAGHRIB_START;
    const currentRamadanDay = Math.min(Math.max(
        msSinceRamadan >= 0 ? Math.floor(msSinceRamadan / (1000 * 60 * 60 * 24)) + 1 : 0,
        1), 30);

    // Track whether we're using optimized RPC or fallback
    const [useRpc, setUseRpc] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    // Helper: fetch ALL rows from a table, paginating past Supabase's default 1000-row limit
    const fetchAllRows = async (table, selectFields, filters = {}) => {
        const PAGE_SIZE = 1000;
        let allData = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            let query = supabase.from(table).select(selectFields).range(from, from + PAGE_SIZE - 1);
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            const { data, error } = await query;
            if (error || !data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < PAGE_SIZE) hasMore = false;
            from += PAGE_SIZE;
        }

        return allData;
    };

    const fetchAllData = async () => {
        if (!isSupabaseConfigured()) return;
        setLoading(true);

        try {
            // Always fetch custom activities (small dataset)
            const customActRes = await supabase.from('custom_activities').select('id, name, icon, category');
            if (customActRes.data) setCustomActivitiesList(customActRes.data);

            // Try optimized RPC first — aggregation done on database server
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard');

            if (!rpcError && rpcData && rpcData.length > 0) {
                // RPC returns pre-aggregated data, map to expected format
                const mappedProfiles = rpcData.map(r => ({
                    id: r.user_id,
                    full_name: r.full_name,
                    user_group: r.user_group,
                    email: r.email,
                    role: r.role,
                }));
                setProfiles(mappedProfiles);

                setUseRpc(true);

                // Fetch ALL activities with pagination (Supabase default limit is 1000)
                const actData = await fetchAllRows(
                    'daily_activities',
                    'user_id, activity_date, activity_id, activity_name, completed, start_time, end_time'
                );
                setAllActivities(actData);
                setQuranData([]); // Not needed when using RPC
            } else {
                // Fallback to original queries if RPC not available
                console.warn('Leaderboard RPC not available, using fallback:', rpcError?.message);
                setUseRpc(false);

                const [profilesRes, actData, quranRes] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, user_group, role, email'),
                    fetchAllRows(
                        'daily_activities',
                        'user_id, activity_date, activity_id, activity_name, completed, start_time, end_time'
                    ),
                    fetchAllRows(
                        'quran_readings',
                        'user_id, read_date, surah_number, start_ayat, end_ayat'
                    ),
                ]);

                if (profilesRes.data) setProfiles(profilesRes.data);
                setAllActivities(actData);
                setQuranData(quranRes);
            }
        } catch (error) {
            console.error('Error fetching admin leaderboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch leaderboard data for specific date range using RPC
    const fetchRpcLeaderboard = async (dateFrom, dateTo, groupFilter) => {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (groupFilter && groupFilter !== 'all') params.group_filter = groupFilter;

        const { data, error } = await supabase.rpc('get_leaderboard', params);
        if (error) {
            console.error('RPC leaderboard error:', error);
            return null;
        }
        return data;
    };

    // Filter dates based on mode
    const filteredDates = useMemo(() => {
        if (filterMode === 'day') {
            return [getDateForRamadanDay(selectedDay)];
        } else if (filterMode === 'week') {
            const startDay = (selectedWeek - 1) * 7 + 1;
            const endDay = Math.min(selectedWeek * 7, 30);
            const dates = [];
            for (let d = startDay; d <= endDay; d++) {
                dates.push(getDateForRamadanDay(d));
            }
            return dates;
        } else {
            // all 30 days
            const dates = [];
            for (let d = 1; d <= 30; d++) {
                dates.push(getDateForRamadanDay(d));
            }
            return dates;
        }
    }, [filterMode, selectedDay, selectedWeek]);

    // Define activity categories (used in fallback mode)
    const SHOLAT_IDS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const SUNNAH_IDS = ['tahajud', 'dhuha', 'tarawih', 'witir'];
    const AKTIVITAS_IDS = ['sahur', 'puasa', 'buka', 'dzikir', 'sedekah', 'tadarus'];

    // Default activity definitions for name/icon lookup
    const DEFAULT_ACTIVITY_MAP = {
        subuh: '🌅 Sholat Subuh', dzuhur: '☀️ Sholat Dzuhur', ashar: '🌤️ Sholat Ashar',
        maghrib: '🌅 Sholat Maghrib', isya: '🌙 Sholat Isya',
        tahajud: '🌌 Sholat Tahajud', dhuha: '🌞 Sholat Dhuha',
        tarawih: '🕌 Sholat Tarawih', witir: '⭐ Sholat Witir',
        sahur: '🍽️ Sahur', puasa: '☪️ Puasa', buka: '🌙 Buka Puasa',
        dzikir: '📿 Dzikir Pagi/Petang', sedekah: '💝 Sedekah', tadarus: '📖 Tadarus Al-Quran',
    };

    // Build dynamic activity options from actual data
    const activityFilterOptions = useMemo(() => {
        // Collect all unique activity IDs from actual data (strip spillover suffix)
        const activityMap = {}; // id -> { id, name, category }
        allActivities.forEach(a => {
            if (!a.completed) return;
            // Skip spillover entries — they are continuations, not separate activities
            if (a.activity_id.endsWith('__spillover')) return;
            const baseId = a.activity_id;
            if (activityMap[baseId]) return; // already mapped

            // Determine name and category
            let name = '';
            let category = 'other';

            if (DEFAULT_ACTIVITY_MAP[baseId]) {
                name = DEFAULT_ACTIVITY_MAP[baseId];
                if (SHOLAT_IDS.includes(baseId)) category = 'sholat';
                else if (SUNNAH_IDS.includes(baseId)) category = 'sunnah';
                else if (AKTIVITAS_IDS.includes(baseId)) category = 'aktivitas';
            } else {
                // Check if it's a known custom activity
                const customAct = customActivitiesList.find(ca => `custom_${ca.id}` === baseId);
                if (customAct) {
                    name = `${customAct.icon} ${customAct.name}`;
                    category = customAct.category || 'other';
                } else {
                    // Use stored activity name, skip if it looks like a raw ID
                    const cleanName = (a.activity_name || '').replace(/\s*\(lanjutan\)$/, '').trim();
                    if (!cleanName || cleanName.startsWith('custom_') || /^[0-9a-f]{8}-/.test(cleanName)) {
                        return; // Skip unresolvable entries (orphaned/deleted custom activities)
                    }
                    name = cleanName;
                }
            }

            activityMap[baseId] = { id: baseId, name, category };
        });

        // Group by category
        const groups = {
            sholat: { label: '🕌 Sholat Wajib', items: [] },
            sunnah: { label: '⭐ Sholat Sunnah', items: [] },
            aktivitas: { label: '📋 Aktivitas Harian', items: [] },
            amanah: { label: '🎯 Amanah (Tugas)', items: [] },
            other: { label: '📌 Lainnya', items: [] },
        };

        Object.values(activityMap).forEach(act => {
            const cat = groups[act.category] ? act.category : 'other';
            groups[cat].items.push(act);
        });

        // Sort items within each group
        Object.values(groups).forEach(g => {
            g.items.sort((a, b) => a.name.localeCompare(b.name));
        });

        return groups;
    }, [allActivities, customActivitiesList]);

    // RPC leaderboard data (pre-aggregated from database)
    const [rpcLeaderboardData, setRpcLeaderboardData] = useState([]);

    // Re-fetch RPC data when filters change
    useEffect(() => {
        if (useRpc !== true) return;

        const fetchFiltered = async () => {
            const dateFrom = filteredDates[0];
            const dateTo = filteredDates[filteredDates.length - 1];
            const data = await fetchRpcLeaderboard(dateFrom, dateTo, selectedGroup);
            if (data) setRpcLeaderboardData(data);
        };

        fetchFiltered();
    }, [useRpc, filteredDates, selectedGroup]);

    // Build ranked users
    // Build set of amanah activity IDs from custom activities list
    const amanahIds = useMemo(() => {
        return new Set(customActivitiesList.filter(ca => ca.category === 'amanah').map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Build set of "tidur/istirahat" activity IDs
    const tidurIds = useMemo(() => {
        return new Set(customActivitiesList
            .filter(ca => ca.category === 'istirahat' || ca.name?.toLowerCase().includes('tidur'))
            .map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Build set of "hiburan" activity IDs
    const hiburanIds = useMemo(() => {
        return new Set(customActivitiesList
            .filter(ca => ca.category === 'hiburan')
            .map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Helper: parse "HH:MM" to fractional hours (same as DailyClockChart)
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const m = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1]) + parseInt(m[2]) / 60;
    };

    // Calculate idle hours for a set of activities on a single day
    // Same algorithm as DailyClockChart: merge time intervals, find gaps in 0-24
    // Exclude puasa (fasting is passive, not a timed activity)
    const calcIdleHours = (activities) => {
        const intervals = [];
        activities.forEach(a => {
            if (!a.start_time) return;
            // Skip puasa — fasting is passive, should not reduce idle time
            const baseId = (a.activity_id || '').replace('__spillover', '');
            if (baseId === 'puasa') return;
            // Multi-session
            if (a.start_time && a.end_time === '__multi__') {
                try {
                    JSON.parse(a.start_time).forEach(s => {
                        if (s.start) {
                            const startH = parseTime(s.start);
                            if (startH === null || startH < 0 || startH >= 24) return;
                            let endH = s.end ? parseTime(s.end) : null;
                            if (endH === null) endH = Math.min(startH + 1, 24);
                            if (endH < startH) endH = 24;
                            if (endH > 24) endH = 24;
                            intervals.push([startH, endH]);
                        }
                    });
                } catch { }
            } else {
                const startH = parseTime(a.start_time);
                if (startH === null || startH < 0 || startH >= 24) return;
                let endH = a.end_time ? parseTime(a.end_time) : null;
                if (endH === null) endH = Math.min(startH + 1, 24);
                if (endH < startH) endH = 24;
                if (endH > 24) endH = 24;
                intervals.push([startH, endH]);
            }
        });
        if (intervals.length === 0) return 24; // no timed activities = 24h idle
        // Merge overlapping intervals
        intervals.sort((a, b) => a[0] - b[0]);
        const merged = [];
        intervals.forEach(([s, e]) => {
            if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
                merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
            } else {
                merged.push([s, e]);
            }
        });
        // Sum gaps
        let idle = 0;
        let cursor = 0;
        merged.forEach(([s, e]) => {
            if (s > cursor) idle += (s - cursor);
            cursor = Math.max(cursor, e);
        });
        if (cursor < 24) idle += (24 - cursor);
        return idle;
    };

    // Total days in current filter range
    const totalDaysInRange = filteredDates.length;

    // Productivity score calculator: normalizes and weights multiple metrics
    const calculateProductivityScores = (users) => {
        if (users.length === 0) return;

        // Find max values for normalization
        const maxOf = (key) => Math.max(...users.map(u => u[key] || 0), 1);

        const maxAmanah = maxOf('amanah');
        const maxAmanahHours = maxOf('amanah_hours');
        const maxSholat = maxOf('sholat');
        const maxSunnah = maxOf('sunnah');
        const maxAktivitas = Math.max(...users.map(u => (u.aktivitas || 0) + (u.custom || 0)), 1);
        const maxQuran = maxOf('quran_ayat');
        const maxTidurCount = maxOf('tidur_count');
        const maxTidurHours = maxOf('tidur_hours');
        const maxIdle = maxOf('idle_hours');
        const maxHiburan = maxOf('hiburan_count');

        // Weights: positive = good (higher is better), negative = bad (lower is better)
        const weights = {
            amanah: 20,         // tugas completion count
            amanah_hours: 15,   // tugas duration
            sholat: 15,         // sholat wajib
            sunnah: 10,         // sholat sunnah
            aktivitas: 10,      // aktivitas ramadhan
            quran: 15,          // tadarus quran
            tidur_count: -5,    // less sleep sessions = more productive
            tidur_hours: -8,    // less sleep hours = more productive
            idle: -10,          // less idle hours = more productive
            hiburan: -7,        // less entertainment = more productive
        };

        users.forEach(u => {
            let score = 0;
            // Positive factors (normalized 0-1, higher is better)
            score += (u.amanah / maxAmanah) * weights.amanah;
            score += ((u.amanah_hours || 0) / maxAmanahHours) * weights.amanah_hours;
            score += (u.sholat / maxSholat) * weights.sholat;
            score += (u.sunnah / maxSunnah) * weights.sunnah;
            score += (((u.aktivitas || 0) + (u.custom || 0)) / maxAktivitas) * weights.aktivitas;
            score += (u.quran_ayat / maxQuran) * weights.quran;

            // Negative factors (normalized 0-1, then inverted: less = better score)
            score += (1 - (u.tidur_count || 0) / maxTidurCount) * Math.abs(weights.tidur_count);
            score += (1 - (u.tidur_hours || 0) / maxTidurHours) * Math.abs(weights.tidur_hours);
            score += (1 - (u.idle_hours || 0) / maxIdle) * Math.abs(weights.idle);
            score += (1 - (u.hiburan_count || 0) / maxHiburan) * Math.abs(weights.hiburan);

            u.produktif_score = Math.round(score);
        });
    };
    const rankedUsers = useMemo(() => {
        // Helper: compute idle hours per user from allActivities
        const computeUserIdleHours = (userId) => {
            let totalIdle = 0;
            filteredDates.forEach(date => {
                const dayActs = allActivities.filter(a =>
                    a.user_id === userId && a.activity_date === date && a.completed
                );
                totalIdle += calcIdleHours(dayActs);
            });
            return Math.round(totalIdle);
        };

        // Helper: count specific activity completions (sessions) and total hours for a user
        const countUserActivity = (userId, activityId) => {
            const matched = allActivities.filter(a =>
                a.user_id === userId &&
                a.completed &&
                filteredDates.includes(a.activity_date) &&
                (a.activity_id === activityId || a.activity_id === `${activityId}__spillover`)
            );
            let totalSessions = 0;
            let totalMinutes = 0;
            matched.forEach(a => {
                const sc = getSessionCount(a);
                totalSessions += sc;
                if (!a.start_time) return;
                if (a.end_time === '__multi__') {
                    try {
                        JSON.parse(a.start_time).forEach(s => {
                            if (s.start && s.end) {
                                const startH = parseTime(s.start);
                                let endH = parseTime(s.end);
                                if (startH === null || endH === null) return;
                                if (endH < startH) endH += 24;
                                totalMinutes += (endH - startH) * 60;
                            }
                        });
                    } catch { }
                } else if (a.start_time && a.end_time) {
                    const startH = parseTime(a.start_time);
                    let endH = parseTime(a.end_time);
                    if (startH !== null && endH !== null) {
                        if (endH < startH) endH += 24;
                        totalMinutes += (endH - startH) * 60;
                    }
                }
            });
            return { count: totalSessions, hours: Math.round(totalMinutes / 60 * 10) / 10 };
        };

        // Helper: compute hours for a single activity record from its time fields
        const computeActivityHours = (a) => {
            let hours = 0;
            if (!a.start_time) return 0;
            if (a.end_time === '__multi__') {
                try {
                    JSON.parse(a.start_time).forEach(s => {
                        if (s.start && s.end) {
                            const sH = parseTime(s.start);
                            let eH = parseTime(s.end);
                            if (sH !== null && eH !== null) {
                                if (eH < sH) eH += 24;
                                hours += (eH - sH);
                            }
                        }
                    });
                } catch { }
            } else if (a.end_time) {
                const sH = parseTime(a.start_time);
                let eH = parseTime(a.end_time);
                if (sH !== null && eH !== null) {
                    if (eH < sH) eH += 24;
                    hours += (eH - sH);
                }
            }
            return hours;
        };

        // Helper: compute tidur/amanah/hiburan metrics for a user from raw activities
        const computeExtraMetrics = (userId) => {
            let tidur_count = 0, tidur_hours = 0, amanah_hours = 0, hiburan_count = 0;
            allActivities.forEach(a => {
                if (a.user_id !== userId || !a.completed || !filteredDates.includes(a.activity_date)) return;
                const baseId = a.activity_id.replace('__spillover', '');
                const sc = getSessionCount(a);
                if (tidurIds.has(baseId)) {
                    tidur_count += sc;
                    tidur_hours += computeActivityHours(a);
                }
                if (amanahIds.has(baseId)) {
                    amanah_hours += computeActivityHours(a);
                }
                if (hiburanIds.has(baseId)) {
                    hiburan_count += sc;
                }
            });
            return {
                tidur_count,
                tidur_hours: Math.round(tidur_hours * 10) / 10,
                amanah_hours: Math.round(amanah_hours * 10) / 10,
                hiburan_count,
            };
        };

        // RPC mode: use profiles from RPC but compute activity counts client-side
        // This ensures session-aware counting
        if (useRpc === true && rpcLeaderboardData.length > 0) {
            // Client-side aggregation (same as fallback mode but using RPC profiles)
            const relevantActivities = allActivities.filter(a =>
                a.completed && filteredDates.includes(a.activity_date)
            );

            const userStats = {};
            const userDateActivities = {};

            rpcLeaderboardData.forEach(r => {
                userStats[r.user_id] = {
                    id: r.user_id,
                    full_name: r.full_name,
                    user_group: r.user_group,
                    email: r.email,
                    role: r.role,
                    sholat: 0, sunnah: 0, aktivitas: 0, custom: 0, amanah: 0, total: 0,
                    quran_ayat: Number(r.quran_ayat) || Number(r.quran_sessions) || 0,
                    idle_hours: 0,
                    activityCount: 0, activityHours: 0,
                    tidur_count: 0, tidur_hours: 0, amanah_hours: 0, hiburan_count: 0,
                    produktif_score: 0,
                };
            });

            relevantActivities.forEach(a => {
                if (!userStats[a.user_id]) return;
                const baseId = a.activity_id.replace('__spillover', '');
                const sc = getSessionCount(a);

                if (SHOLAT_IDS.includes(baseId)) {
                    userStats[a.user_id].sholat += sc;
                } else if (SUNNAH_IDS.includes(baseId)) {
                    userStats[a.user_id].sunnah += sc;
                } else if (AKTIVITAS_IDS.includes(baseId)) {
                    userStats[a.user_id].aktivitas += sc;
                } else if (amanahIds.has(baseId)) {
                    userStats[a.user_id].amanah += sc;
                } else {
                    userStats[a.user_id].custom += sc;
                }
                userStats[a.user_id].total += sc;

                if (tidurIds.has(baseId)) {
                    userStats[a.user_id].tidur_count += sc;
                    userStats[a.user_id].tidur_hours += computeActivityHours(a);
                }
                if (amanahIds.has(baseId)) {
                    userStats[a.user_id].amanah_hours += computeActivityHours(a);
                }
                if (hiburanIds.has(baseId)) {
                    userStats[a.user_id].hiburan_count += sc;
                }

                if (filterActivity !== 'all' && baseId === filterActivity) {
                    userStats[a.user_id].activityCount += sc;
                    userStats[a.user_id].activityHours += computeActivityHours(a);
                }

                const key = `${a.user_id}_${a.activity_date}`;
                if (!userDateActivities[key]) userDateActivities[key] = [];
                userDateActivities[key].push(a);
            });

            // Calculate idle hours
            Object.keys(userStats).forEach(uid => {
                let totalIdle = 0;
                filteredDates.forEach(date => {
                    const key = `${uid}_${date}`;
                    const dayActs = userDateActivities[key] || [];
                    totalIdle += calcIdleHours(dayActs);
                });
                userStats[uid].idle_hours = Math.round(totalIdle);
                userStats[uid].activityHours = Math.round(userStats[uid].activityHours * 10) / 10;
                userStats[uid].tidur_hours = Math.round(userStats[uid].tidur_hours * 10) / 10;
                userStats[uid].amanah_hours = Math.round(userStats[uid].amanah_hours * 10) / 10;
            });

            let users = Object.values(userStats);
            if (selectedGroup !== 'all') {
                users = users.filter(u => u.user_group === selectedGroup);
            }

            // Calculate productivity scores
            if (rankBy === 'produktif') {
                calculateProductivityScores(users);
            }

            // Sort
            if (filterActivity !== 'all') {
                users.sort((a, b) => b.activityCount - a.activityCount || b.total - a.total);
            } else {
                users.sort((a, b) => {
                    if (rankBy === 'produktif') return b.produktif_score - a.produktif_score;
                    if (rankBy === 'quran') return b.quran_ayat - a.quran_ayat;
                    if (rankBy === 'sholat') return b.sholat - a.sholat;
                    if (rankBy === 'sunnah') return b.sunnah - a.sunnah;
                    if (rankBy === 'aktivitas') return (b.aktivitas + b.custom) - (a.aktivitas + a.custom);
                    if (rankBy === 'amanah') return b.amanah - a.amanah;
                    if (rankBy === 'idle') return b.idle_hours - a.idle_hours || a.total - b.total;
                    return b.total - a.total;
                });
            }

            return users;
        }

        // Fallback mode: client-side aggregation
        const relevantActivities = allActivities.filter(a =>
            a.completed && filteredDates.includes(a.activity_date)
        );

        const userStats = {};
        // Group activities by user+date for idle calculation
        const userDateActivities = {}; // { `${userId}_${date}`: [activities] }

        profiles.forEach(p => {
            userStats[p.id] = {
                id: p.id,
                full_name: p.full_name,
                user_group: p.user_group,
                email: p.email,
                role: p.role,
                sholat: 0,
                sunnah: 0,
                aktivitas: 0,
                custom: 0,
                amanah: 0,
                total: 0,
                quran_ayat: 0,
                activityCount: 0,
                activityHours: 0,
                tidur_count: 0,
                tidur_hours: 0,
                amanah_hours: 0,
                hiburan_count: 0,
                produktif_score: 0,
            };
        });

        relevantActivities.forEach(a => {
            if (!userStats[a.user_id]) return;
            const baseId = a.activity_id.replace('__spillover', '');

            const sc = getSessionCount(a);

            if (SHOLAT_IDS.includes(baseId)) {
                userStats[a.user_id].sholat += sc;
            } else if (SUNNAH_IDS.includes(baseId)) {
                userStats[a.user_id].sunnah += sc;
            } else if (AKTIVITAS_IDS.includes(baseId)) {
                userStats[a.user_id].aktivitas += sc;
            } else if (amanahIds.has(baseId)) {
                userStats[a.user_id].amanah += sc;
            } else {
                userStats[a.user_id].custom += sc;
            }
            userStats[a.user_id].total += sc;

            // Track tidur metrics
            if (tidurIds.has(baseId)) {
                userStats[a.user_id].tidur_count += sc;
                userStats[a.user_id].tidur_hours += computeActivityHours(a);
            }
            // Track amanah hours
            if (amanahIds.has(baseId)) {
                userStats[a.user_id].amanah_hours += computeActivityHours(a);
            }
            // Track hiburan
            if (hiburanIds.has(baseId)) {
                userStats[a.user_id].hiburan_count += sc;
            }

            // Count specific activity and hours
            if (filterActivity !== 'all') {
                if (baseId === filterActivity) {
                    userStats[a.user_id].activityCount += sc;
                    userStats[a.user_id].activityHours += computeActivityHours(a);
                }
            }

            // Group by user+date for idle calculation
            const key = `${a.user_id}_${a.activity_date}`;
            if (!userDateActivities[key]) userDateActivities[key] = [];
            userDateActivities[key].push(a);
        });

        // Quran: count total ayat instead of sessions
        quranData.forEach(q => {
            if (!userStats[q.user_id]) return;
            if (!filteredDates.includes(q.read_date)) return;
            const ayatCount = (q.end_ayat && q.start_ayat)
                ? Math.max(q.end_ayat - q.start_ayat + 1, 1)
                : 1;
            userStats[q.user_id].quran_ayat += ayatCount;
        });

        // Calculate total idle hours per user
        Object.keys(userStats).forEach(uid => {
            let totalIdle = 0;
            filteredDates.forEach(date => {
                const key = `${uid}_${date}`;
                const dayActs = userDateActivities[key] || [];
                totalIdle += calcIdleHours(dayActs);
            });
            userStats[uid].idle_hours = Math.round(totalIdle);
            userStats[uid].activityHours = Math.round(userStats[uid].activityHours * 10) / 10;
            userStats[uid].tidur_hours = Math.round(userStats[uid].tidur_hours * 10) / 10;
            userStats[uid].amanah_hours = Math.round(userStats[uid].amanah_hours * 10) / 10;
        });

        let users = Object.values(userStats);
        if (selectedGroup !== 'all') {
            users = users.filter(u => u.user_group === selectedGroup);
        }

        // Calculate productivity scores if needed
        if (rankBy === 'produktif') {
            calculateProductivityScores(users);
        }

        if (filterActivity !== 'all') {
            users.sort((a, b) => b.activityCount - a.activityCount || b.total - a.total);
        } else {
            users.sort((a, b) => {
                if (rankBy === 'produktif') return b.produktif_score - a.produktif_score;
                if (rankBy === 'quran') return b.quran_ayat - a.quran_ayat;
                if (rankBy === 'sholat') return b.sholat - a.sholat;
                if (rankBy === 'sunnah') return b.sunnah - a.sunnah;
                if (rankBy === 'aktivitas') return (b.aktivitas + b.custom) - (a.aktivitas + a.custom);
                if (rankBy === 'amanah') return b.amanah - a.amanah;
                if (rankBy === 'idle') return b.idle_hours - a.idle_hours || a.total - b.total;
                return b.total - a.total;
            });
        }

        return users;
    }, [useRpc, rpcLeaderboardData, profiles, allActivities, quranData, filteredDates, selectedGroup, rankBy, filterActivity, amanahIds, tidurIds, hiburanIds, totalDaysInRange]);

    // Group ranking (aggregated scores)
    const groupRanking = useMemo(() => {
        const groups = {};
        USER_GROUPS.forEach(g => {
            groups[g] = { group: g, members: 0, totalActivities: 0, totalSessions: 0, avgActivities: 0 };
        });

        rankedUsers.forEach(u => {
            if (u.user_group && groups[u.user_group]) {
                groups[u.user_group].members++;
                groups[u.user_group].totalActivities += u.total;
                groups[u.user_group].totalSessions += u.quran_ayat;
            }
        });

        Object.values(groups).forEach(g => {
            g.avgActivities = g.members > 0 ? Math.round(g.totalActivities / g.members) : 0;
        });

        return Object.values(groups).sort((a, b) => b.totalActivities - a.totalActivities);
    }, [rankedUsers]);

    // Helper: rank badge
    const getRankDisplay = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `#${index + 1}`;
    };

    // Label for current filter
    const filterLabel = useMemo(() => {
        if (filterMode === 'day') return `Hari ke-${selectedDay} Ramadhan`;
        if (filterMode === 'week') return `Minggu ke-${selectedWeek} (Hari ${(selectedWeek - 1) * 7 + 1}-${Math.min(selectedWeek * 7, 30)})`;
        return '30 Hari Ramadhan';
    }, [filterMode, selectedDay, selectedWeek]);

    const getSortValue = (user) => {
        if (filterActivity !== 'all') {
            const hrs = user.activityHours || 0;
            if (hrs > 0) {
                // Format hours nicely
                const h = Math.floor(hrs);
                const m = Math.round((hrs - h) * 60);
                const timeStr = m > 0 ? `${h}j${m}m` : `${h}j`;
                return `${user.activityCount}x • ${timeStr}`;
            }
            return `${user.activityCount}x`;
        }
        if (rankBy === 'produktif') return `${user.produktif_score} poin`;
        if (rankBy === 'quran') return `${user.quran_ayat} ayat`;
        if (rankBy === 'sholat') return `${user.sholat}x`;
        if (rankBy === 'sunnah') return `${user.sunnah}x`;
        if (rankBy === 'aktivitas') return `${user.aktivitas + user.custom}x`;
        if (rankBy === 'amanah') return `${user.amanah}x`;
        if (rankBy === 'idle') return `${user.idle_hours} jam`;
        return `${user.total}x`;
    };

    // Pagination
    const leaderboardPagination = usePagination(rankedUsers, 10);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--dark-400)' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
                <p style={{ fontSize: '13px' }}>Memuat data ranking...</p>
            </div>
        );
    }

    return (
        <section className="section">
            <div className="section-header">
                <h2 className="section-title">
                    <span>🏆</span>
                    Ranking Komprehensif
                </h2>
                <button className="section-action" onClick={fetchAllData}>Refresh</button>
            </div>

            {/* Filter Mode Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '10px',
                background: 'var(--dark-700)',
                padding: '4px',
                borderRadius: 'var(--radius-lg)',
            }}>
                {[
                    { id: 'day', label: 'Per Hari' },
                    { id: 'week', label: 'Per Minggu' },
                    { id: 'all', label: '30 Hari' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterMode(tab.id)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: filterMode === tab.id ? 'var(--emerald-600)' : 'transparent',
                            color: filterMode === tab.id ? 'white' : 'var(--dark-400)',
                            fontWeight: '600',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Day Selector */}
            {filterMode === 'day' && (
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    marginBottom: '10px',
                    paddingBottom: '4px',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            style={{
                                minWidth: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                background: selectedDay === day ? 'var(--emerald-600)' : 'var(--dark-700)',
                                color: selectedDay === day ? 'white' : 'var(--dark-400)',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            )}

            {/* Week Selector */}
            {filterMode === 'week' && (
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '10px',
                }}>
                    {[1, 2, 3, 4, 5].map(week => (
                        <button
                            key={week}
                            onClick={() => setSelectedWeek(week)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: selectedWeek === week ? 'var(--emerald-600)' : 'var(--dark-700)',
                                color: selectedWeek === week ? 'white' : 'var(--dark-400)',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            W{week}
                        </button>
                    ))}
                </div>
            )}

            {/* Advanced Filters Row */}
            <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '10px',
                flexWrap: 'wrap',
            }}>
                {/* Rank By Dropdown */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--dark-500)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                        Urutkan
                    </label>
                    <select
                        value={rankBy}
                        onChange={(e) => setRankBy(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--dark-600)',
                            background: 'var(--dark-700)',
                            color: 'var(--dark-100)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            paddingRight: '28px',
                        }}
                    >
                        <option value="produktif">🏅 Paling Produktif</option>
                        <option value="total">🔢 Total Aktivitas</option>
                        <option value="sholat">🕌 Sholat Wajib</option>
                        <option value="sunnah">⭐ Sholat Sunnah</option>
                        <option value="aktivitas">📋 Aktivitas Harian</option>
                        <option value="amanah">🎯 Amanah (Tugas)</option>
                        <option value="quran">📖 Tadarus Quran</option>
                        <option value="idle">⏳ Waktu Kosong</option>
                    </select>
                </div>

                {/* Activity Filter Dropdown */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--dark-500)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                        Filter Aktivitas
                    </label>
                    <select
                        value={filterActivity}
                        onChange={(e) => setFilterActivity(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--dark-600)',
                            background: 'var(--dark-700)',
                            color: 'var(--dark-100)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            paddingRight: '28px',
                        }}
                    >
                        <option value="all">📊 Semua Aktivitas</option>
                        {Object.entries(activityFilterOptions).map(([catKey, group]) => (
                            group.items.length > 0 && (
                                <optgroup key={catKey} label={group.label}>
                                    {group.items.map(act => (
                                        <option key={act.id} value={act.id}>
                                            {act.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )
                        ))}
                    </select>
                </div>

                {/* Group Filter Dropdown */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--dark-500)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                        Grup
                    </label>
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--dark-600)',
                            background: 'var(--dark-700)',
                            color: 'var(--dark-100)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            paddingRight: '28px',
                        }}
                    >
                        <option value="all">👥 Semua Grup</option>
                        {USER_GROUPS.map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active filters indicator */}
            {filterActivity !== 'all' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px',
                }}>
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>
                        🔍 Filter: {(() => {
                            for (const group of Object.values(activityFilterOptions)) {
                                const found = group.items.find(a => a.id === filterActivity);
                                if (found) return found.name;
                            }
                            return filterActivity;
                        })()}
                    </span>
                    <button
                        onClick={() => setFilterActivity('all')}
                        style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: '600',
                        }}
                    >
                        ✕ Hapus
                    </button>
                </div>
            )}

            {/* Current filter info */}
            <div style={{
                padding: '8px 12px',
                background: 'var(--dark-800)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: '12px', color: 'var(--dark-300)' }}>
                    📅 {filterLabel}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                    {rankedUsers.length} anggota
                </span>
            </div>

            {/* Group Ranking Summary (if viewing all groups) */}
            {selectedGroup === 'all' && (
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px',
                    marginBottom: '14px',
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--dark-300)',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        🏅 Peringkat Grup
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groupRanking.map((g, i) => {
                            const colors = GROUP_COLORS[g.group];
                            const maxTotal = groupRanking[0]?.totalActivities || 1;
                            const barWidth = Math.max(4, (g.totalActivities / maxTotal) * 100);

                            return (
                                <div
                                    key={g.group}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <span style={{
                                        width: '22px',
                                        textAlign: 'center',
                                        fontSize: i < 3 ? '14px' : '11px',
                                        color: 'var(--dark-400)',
                                    }}>
                                        {getRankDisplay(i)}
                                    </span>
                                    <span style={{
                                        width: '90px',
                                        fontWeight: '700',
                                        fontSize: '11px',
                                        color: colors.text,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        flexShrink: 0,
                                    }}>
                                        {g.group}
                                    </span>
                                    <div style={{
                                        flex: 1,
                                        height: '16px',
                                        background: 'var(--dark-700)',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}>
                                        <div style={{
                                            width: `${barWidth}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${colors.text}55, ${colors.text})`,
                                            borderRadius: '8px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                        <span style={{
                                            position: 'absolute',
                                            right: '6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            fontSize: '9px',
                                            fontWeight: '700',
                                            color: 'var(--dark-200)',
                                        }}>
                                            {g.totalActivities} akt • {g.totalSessions} ayat
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Individual Ranking */}
            {rankedUsers.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '30px',
                    color: 'var(--dark-400)',
                }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                    <p style={{ fontSize: '13px' }}>Belum ada data untuk filter ini</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {leaderboardPagination.paginatedItems.map((user, index) => {
                            const groupColor = GROUP_COLORS[user.user_group];
                            // Calculate the real rank based on the page offset
                            const realIndex = leaderboardPagination.showAll
                                ? index
                                : (leaderboardPagination.currentPage - 1) * leaderboardPagination.itemsPerPage + index;

                            return (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        background: 'var(--dark-800)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: realIndex < 3
                                            ? '1px solid rgba(251, 191, 36, 0.15)'
                                            : '1px solid transparent',
                                        cursor: 'pointer',
                                        transition: 'var(--transition-fast)',
                                    }}
                                >
                                    {/* Rank */}
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: 'var(--radius-full)',
                                        background: realIndex < 3 ? 'var(--gold-gradient)' : 'var(--dark-700)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: realIndex < 3 ? '14px' : '11px',
                                        fontWeight: '700',
                                        color: realIndex < 3 ? 'var(--dark-900)' : 'var(--dark-400)',
                                        flexShrink: 0,
                                    }}>
                                        {getRankDisplay(realIndex)}
                                    </div>

                                    {/* User info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginBottom: '2px',
                                        }}>
                                            <span style={{
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                color: 'var(--dark-100)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {user.full_name}
                                            </span>
                                            {user.user_group && groupColor && (
                                                <span style={{
                                                    fontSize: '8px',
                                                    background: groupColor.bg,
                                                    color: groupColor.text,
                                                    padding: '1px 5px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontWeight: '700',
                                                    border: `1px solid ${groupColor.border}`,
                                                    flexShrink: 0,
                                                }}>
                                                    {user.user_group}
                                                </span>
                                            )}
                                        </div>
                                        {/* Mini stats */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '6px',
                                            fontSize: '10px',
                                            color: 'var(--dark-400)',
                                            flexWrap: 'wrap',
                                        }}>
                                            {rankBy === 'produktif' ? (
                                                <>
                                                    {/* Positive metrics (green) */}
                                                    <span style={{ color: '#10b981' }} title="Sholat Wajib">🕌{user.sholat}</span>
                                                    <span style={{ color: '#10b981' }} title="Sholat Sunnah">⭐{user.sunnah}</span>
                                                    <span style={{ color: '#10b981' }} title="Aktivitas Ramadhan">📋{user.aktivitas + user.custom}</span>
                                                    <span style={{ color: '#10b981' }} title="Tugas (Amanah)">🎯{user.amanah}({user.amanah_hours}j)</span>
                                                    <span style={{ color: '#10b981' }} title="Tadarus Quran">📖{user.quran_ayat}</span>
                                                    {/* Negative metrics (red) */}
                                                    <span style={{ color: '#ef4444' }} title="Tidur">😴{user.tidur_count}({user.tidur_hours}j)</span>
                                                    <span style={{ color: '#ef4444' }} title="Waktu Kosong">⏳{user.idle_hours}j</span>
                                                    {user.hiburan_count > 0 && (
                                                        <span style={{ color: '#ef4444' }} title="Hiburan">🎮{user.hiburan_count}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <span>🕌{user.sholat}</span>
                                                    <span>⭐{user.sunnah}</span>
                                                    <span>📋{user.aktivitas + user.custom}</span>
                                                    {user.amanah > 0 && <span>🎯{user.amanah}</span>}
                                                    <span>📖{user.quran_ayat} ayat</span>
                                                    {user.idle_hours > 0 && (
                                                        <span style={{ color: '#ef4444' }}>⏳{user.idle_hours}j</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score badge */}
                                    <div style={{
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        background: realIndex < 3
                                            ? 'rgba(251, 191, 36, 0.15)'
                                            : 'var(--dark-700)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: realIndex < 3 ? 'var(--gold-400)' : 'var(--dark-300)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}>
                                        {getSortValue(user)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination controls */}
                    <Pagination
                        currentPage={leaderboardPagination.currentPage}
                        totalPages={leaderboardPagination.totalPages}
                        totalItems={leaderboardPagination.totalItems}
                        itemsPerPage={leaderboardPagination.itemsPerPage}
                        onPageChange={leaderboardPagination.goToPage}
                        onPerPageChange={leaderboardPagination.setPerPage}
                    />
                </>
            )}

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    adminQuranData={quranData}
                    adminActivitiesData={allActivities}
                />
            )}
        </section>
    );
}
