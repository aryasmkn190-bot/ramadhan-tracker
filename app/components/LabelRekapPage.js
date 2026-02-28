'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserDetailModal from './UserDetailModal';
import Pagination, { usePagination } from './Pagination';
import { GROUP_COLORS } from '../data/userGroups';
import { getSessionCount } from '../utils/activityHelpers';
import GroupRekapExport from './GroupRekapExport';

const RAMADAN_START_STR = '2026-02-18'; // 1 Ramadhan 1447 H

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START_STR + 'T00:00:00');
    date.setDate(date.getDate() + day - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export default function LabelRekapPage() {
    const { profile } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [quranData, setQuranData] = useState([]);
    const [customActivitiesList, setCustomActivitiesList] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true); // Phase 1: profiles
    const [loadingData, setLoadingData] = useState(false);         // Phase 2: activities per label
    const [selectedUser, setSelectedUser] = useState(null);

    // Label state
    const [availableLabels, setAvailableLabels] = useState([]);
    const [selectedLabel, setSelectedLabel] = useState(null);

    // Cache: store fetched data per label to avoid re-fetching
    const [labelDataCache, setLabelDataCache] = useState({});

    // Filters
    const [filterMode, setFilterMode] = useState('all');
    const [selectedDay, setSelectedDay] = useState(1);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [rankBy, setRankBy] = useState('total');
    const [searchQuery, setSearchQuery] = useState('');

    // Current Ramadan day
    const today = new Date();
    const RAMADAN_MAGHRIB_START = new Date('2026-02-18T18:00:00');
    const msSinceRamadan = today - RAMADAN_MAGHRIB_START;
    const currentRamadanDay = Math.min(Math.max(
        msSinceRamadan >= 0 ? Math.floor(msSinceRamadan / (1000 * 60 * 60 * 24)) + 1 : 0,
        1), 30);

    // ========== PHASE 1: Fetch profiles only (fast) ==========
    useEffect(() => {
        fetchProfiles();
    }, []);

    // Helper: fetch ALL rows with pagination
    const fetchPaginated = async (buildQuery) => {
        const PAGE_SIZE = 1000;
        let allData = [];
        let from = 0;
        let hasMore = true;
        while (hasMore) {
            const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
            if (error || !data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < PAGE_SIZE) hasMore = false;
            from += PAGE_SIZE;
        }
        return allData;
    };

    const fetchProfiles = async () => {
        if (!isSupabaseConfigured()) return;
        setLoadingProfiles(true);
        try {
            // Fetch custom activities + profiles in parallel (both small & fast)
            const [customActRes, profilesRes] = await Promise.all([
                supabase.from('custom_activities').select('id, name, icon, category'),
                supabase.from('profiles').select('id, full_name, user_group, role, email, labels'),
            ]);

            if (customActRes.data) setCustomActivitiesList(customActRes.data);

            const allProfiles = profilesRes.data || [];
            setProfiles(allProfiles);

            // Discover all labels
            const labelSet = new Set();
            allProfiles.forEach(p => {
                if (p.labels && Array.isArray(p.labels)) {
                    p.labels.forEach(l => labelSet.add(l));
                }
            });
            const labels = Array.from(labelSet).sort();
            setAvailableLabels(labels);
            if (labels.length > 0) {
                setSelectedLabel(labels[0]);
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setLoadingProfiles(false);
        }
    };

    // ========== PHASE 2: Fetch activities per label (on-demand) ==========
    useEffect(() => {
        if (selectedLabel && profiles.length > 0) {
            fetchLabelData(selectedLabel);
        }
    }, [selectedLabel, profiles]);

    const fetchLabelData = async (label) => {
        // Check cache first
        if (labelDataCache[label]) {
            setAllActivities(labelDataCache[label].activities);
            setQuranData(labelDataCache[label].quran);
            return;
        }

        // Get member IDs for this label
        const memberIds = profiles
            .filter(p => p.labels && Array.isArray(p.labels) && p.labels.includes(label))
            .map(p => p.id);

        if (memberIds.length === 0) {
            setAllActivities([]);
            setQuranData([]);
            return;
        }

        setLoadingData(true);
        try {
            // Fetch ONLY activities & quran for these specific users
            const [activitiesData, quranDataResult] = await Promise.all([
                fetchPaginated(() =>
                    supabase.from('daily_activities')
                        .select('user_id, activity_date, activity_id, completed, start_time, end_time')
                        .in('user_id', memberIds)
                ),
                fetchPaginated(() =>
                    supabase.from('quran_readings')
                        .select('user_id, read_date, surah_number, start_ayat, end_ayat')
                        .in('user_id', memberIds)
                ),
            ]);

            // Cache the result
            setLabelDataCache(prev => ({
                ...prev,
                [label]: { activities: activitiesData, quran: quranDataResult },
            }));

            setAllActivities(activitiesData);
            setQuranData(quranDataResult);
        } catch (error) {
            console.error('Error fetching label data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    // Members with selected label 
    const labelMembers = useMemo(() => {
        if (!selectedLabel) return [];
        return profiles.filter(p =>
            p.labels && Array.isArray(p.labels) && p.labels.includes(selectedLabel)
        );
    }, [profiles, selectedLabel]);

    // Filter dates based on mode
    const filteredDates = useMemo(() => {
        if (filterMode === 'day') return [getDateForRamadanDay(selectedDay)];
        if (filterMode === 'week') {
            const startDay = (selectedWeek - 1) * 7 + 1;
            const endDay = Math.min(selectedWeek * 7, 30);
            const dates = [];
            for (let d = startDay; d <= endDay; d++) dates.push(getDateForRamadanDay(d));
            return dates;
        }
        const dates = [];
        for (let d = 1; d <= 30; d++) dates.push(getDateForRamadanDay(d));
        return dates;
    }, [filterMode, selectedDay, selectedWeek]);

    // Activity IDs
    const SHOLAT_IDS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const SUNNAH_IDS = ['tahajud', 'dhuha', 'tarawih', 'witir'];
    const AKTIVITAS_IDS = ['sahur', 'puasa', 'buka', 'dzikir', 'sedekah', 'tadarus'];

    const amanahIds = useMemo(() =>
        new Set(customActivitiesList.filter(ca => ca.category === 'amanah').map(ca => `custom_${ca.id}`))
        , [customActivitiesList]);

    const tidurIds = useMemo(() =>
        new Set(customActivitiesList
            .filter(ca => ca.category === 'istirahat' || ca.name?.toLowerCase().includes('tidur'))
            .map(ca => `custom_${ca.id}`))
        , [customActivitiesList]);

    const hiburanIds = useMemo(() =>
        new Set(customActivitiesList.filter(ca => ca.category === 'hiburan').map(ca => `custom_${ca.id}`))
        , [customActivitiesList]);

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

    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const m = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1]) + parseInt(m[2]) / 60;
    };

    const calcIdleHours = (activities) => {
        const intervals = [];
        activities.forEach(a => {
            if (!a.start_time) return;
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
        if (intervals.length === 0) return 24;
        intervals.sort((a, b) => a[0] - b[0]);
        const merged = [];
        intervals.forEach(([s, e]) => {
            if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
                merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
            } else {
                merged.push([s, e]);
            }
        });
        let idle = 0, cursor = 0;
        merged.forEach(([s, e]) => {
            if (s > cursor) idle += (s - cursor);
            cursor = Math.max(cursor, e);
        });
        if (cursor < 24) idle += (24 - cursor);
        return idle;
    };

    const calculateProductivityScores = (users) => {
        if (users.length === 0) return;
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
        const w = { amanah: 20, amanah_hours: 15, sholat: 15, sunnah: 10, aktivitas: 10, quran: 15, tidur_count: 5, tidur_hours: 8, idle: 10, hiburan: 7 };
        users.forEach(u => {
            let score = 0;
            score += (u.amanah / maxAmanah) * w.amanah;
            score += ((u.amanah_hours || 0) / maxAmanahHours) * w.amanah_hours;
            score += (u.sholat / maxSholat) * w.sholat;
            score += (u.sunnah / maxSunnah) * w.sunnah;
            score += (((u.aktivitas || 0) + (u.custom || 0)) / maxAktivitas) * w.aktivitas;
            score += (u.quran_ayat / maxQuran) * w.quran;
            score += (1 - (u.tidur_count || 0) / maxTidurCount) * w.tidur_count;
            score += (1 - (u.tidur_hours || 0) / maxTidurHours) * w.tidur_hours;
            score += (1 - (u.idle_hours || 0) / maxIdle) * w.idle;
            score += (1 - (u.hiburan_count || 0) / maxHiburan) * w.hiburan;
            u.produktif_score = Math.round(score);
        });
    };

    // Build ranked users for label
    const rankedUsers = useMemo(() => {
        const memberIds = new Set(labelMembers.map(p => p.id));
        if (memberIds.size === 0) return [];

        const relevantActivities = allActivities.filter(a =>
            a.completed && filteredDates.includes(a.activity_date) && memberIds.has(a.user_id)
        );

        const userStats = {};
        const userDateActivities = {};

        labelMembers.forEach(p => {
            userStats[p.id] = {
                id: p.id, full_name: p.full_name, user_group: p.user_group,
                email: p.email, role: p.role,
                sholat: 0, sunnah: 0, aktivitas: 0, custom: 0, amanah: 0, total: 0,
                quran_ayat: 0, tidur_count: 0, tidur_hours: 0, amanah_hours: 0,
                hiburan_count: 0, produktif_score: 0, idle_hours: 0,
            };
        });

        relevantActivities.forEach(a => {
            if (!userStats[a.user_id]) return;
            const baseId = a.activity_id.replace('__spillover', '');
            const sc = getSessionCount(a);
            if (SHOLAT_IDS.includes(baseId)) userStats[a.user_id].sholat += sc;
            else if (SUNNAH_IDS.includes(baseId)) userStats[a.user_id].sunnah += sc;
            else if (AKTIVITAS_IDS.includes(baseId)) userStats[a.user_id].aktivitas += sc;
            else if (amanahIds.has(baseId)) userStats[a.user_id].amanah += sc;
            else userStats[a.user_id].custom += sc;
            userStats[a.user_id].total += sc;
            if (tidurIds.has(baseId)) {
                userStats[a.user_id].tidur_count += sc;
                userStats[a.user_id].tidur_hours += computeActivityHours(a);
            }
            if (amanahIds.has(baseId)) userStats[a.user_id].amanah_hours += computeActivityHours(a);
            if (hiburanIds.has(baseId)) userStats[a.user_id].hiburan_count += sc;
            const key = `${a.user_id}_${a.activity_date}`;
            if (!userDateActivities[key]) userDateActivities[key] = [];
            userDateActivities[key].push(a);
        });

        quranData.forEach(q => {
            if (!userStats[q.user_id]) return;
            if (!filteredDates.includes(q.read_date)) return;
            const ayatCount = (q.end_ayat && q.start_ayat) ? Math.max(q.end_ayat - q.start_ayat + 1, 1) : 1;
            userStats[q.user_id].quran_ayat += ayatCount;
        });

        Object.keys(userStats).forEach(uid => {
            let totalIdle = 0;
            filteredDates.forEach(date => {
                const key = `${uid}_${date}`;
                const dayActs = userDateActivities[key] || [];
                totalIdle += calcIdleHours(dayActs);
            });
            userStats[uid].idle_hours = Math.round(totalIdle);
            userStats[uid].tidur_hours = Math.round(userStats[uid].tidur_hours * 10) / 10;
            userStats[uid].amanah_hours = Math.round(userStats[uid].amanah_hours * 10) / 10;
        });

        let users = Object.values(userStats);
        calculateProductivityScores(users);

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

        return users;
    }, [labelMembers, allActivities, quranData, filteredDates, rankBy, amanahIds, tidurIds, hiburanIds]);

    // Stats
    const labelStats = useMemo(() => {
        const totalMembers = labelMembers.length;
        const totalActivities = rankedUsers.reduce((s, u) => s + u.total, 0);
        const totalQuranAyat = rankedUsers.reduce((s, u) => s + u.quran_ayat, 0);
        const avgActivities = totalMembers > 0 ? Math.round(totalActivities / totalMembers) : 0;
        return { totalMembers, totalActivities, totalQuranAyat, avgActivities };
    }, [labelMembers, rankedUsers]);

    const getRankDisplay = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `#${index + 1}`;
    };

    const filterLabel = useMemo(() => {
        if (filterMode === 'day') return `Hari ke-${selectedDay}`;
        if (filterMode === 'week') return `Minggu ${selectedWeek}`;
        return '30 Hari';
    }, [filterMode, selectedDay, selectedWeek]);

    const filteredRankedUsers = useMemo(() => {
        if (!searchQuery.trim()) return rankedUsers;
        const q = searchQuery.toLowerCase();
        return rankedUsers.filter(u =>
            u.full_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [rankedUsers, searchQuery]);

    const pagination = usePagination(filteredRankedUsers);

    if (loadingProfiles) {
        return (
            <section className="main-content" style={{ paddingBottom: '100px' }}>
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dark-400)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>🏷️</div>
                    <div style={{ fontSize: '14px' }}>Memuat data label...</div>
                </div>
            </section>
        );
    }

    if (availableLabels.length === 0) {
        return (
            <section className="main-content" style={{ paddingBottom: '100px' }}>
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dark-400)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🏷️</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Belum ada label</div>
                    <div style={{ fontSize: '13px' }}>
                        Buat label melalui halaman Anggota → Edit → Label
                    </div>
                </div>
            </section>
        );
    }

    const isLoading = loadingData;

    return (
        <section className="main-content" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🏷️</span>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', margin: 0 }}>
                            Rekap Khusus
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{
                                fontSize: '11px', fontWeight: '600', padding: '3px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(251, 191, 36, 0.15)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                color: '#fbbf24',
                            }}>{selectedLabel}</span>
                            <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                                {labelStats.totalMembers} anggota
                            </span>
                        </div>
                    </div>
                    {rankedUsers.length > 0 && (
                        <GroupRekapExport
                            rankedUsers={rankedUsers}
                            groupName={`Label ${selectedLabel}`}
                            filterLabel={filterLabel}
                            rankBy={rankBy}
                            groupStats={labelStats}
                        />
                    )}
                </div>
            </div>

            {/* Label Switcher */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dark-400)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏷️ Pilih Label
                </div>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {availableLabels.map(label => {
                        const isActive = selectedLabel === label;
                        const count = profiles.filter(p => p.labels?.includes(label)).length;
                        return (
                            <button
                                key={label}
                                onClick={() => setSelectedLabel(label)}
                                style={{
                                    padding: '8px 14px',
                                    background: isActive ? 'rgba(251, 191, 36, 0.15)' : 'var(--dark-800)',
                                    border: isActive ? '2px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--dark-700)',
                                    borderRadius: 'var(--radius-full)',
                                    color: isActive ? '#fbbf24' : 'var(--dark-400)',
                                    fontWeight: '600',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {isActive && '✓ '}{label} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                    { label: 'Anggota', value: labelStats.totalMembers, icon: '👥' },
                    { label: 'Aktivitas', value: labelStats.totalActivities, icon: '📊' },
                    { label: 'Ayat', value: labelStats.totalQuranAyat, icon: '📖' },
                    { label: 'Rata-rata', value: labelStats.avgActivities, icon: '📈' },
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '12px 8px',
                        textAlign: 'center', border: '1px solid var(--dark-700)',
                    }}>
                        <div style={{ fontSize: '16px', marginBottom: '2px' }}>{stat.icon}</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dark-100)' }}>{stat.value}</div>
                        <div style={{ fontSize: '9px', color: 'var(--dark-400)', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Time Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                    { value: 'day', label: 'Per Hari' },
                    { value: 'week', label: 'Per Minggu' },
                    { value: 'all', label: '30 Hari' },
                ].map(tab => (
                    <button key={tab.value} onClick={() => setFilterMode(tab.value)} style={{
                        flex: 1, padding: '10px 8px',
                        background: filterMode === tab.value ? 'var(--primary)' : 'var(--dark-800)',
                        color: filterMode === tab.value ? 'white' : 'var(--dark-300)',
                        border: filterMode === tab.value ? 'none' : '1px solid var(--dark-700)',
                        borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}>{tab.label}</button>
                ))}
            </div>

            {/* Day Selector */}
            {filterMode === 'day' && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                            <button key={d} onClick={() => setSelectedDay(d)} style={{
                                minWidth: '36px', height: '36px',
                                background: selectedDay === d ? 'var(--primary)' : d === currentRamadanDay ? 'rgba(16, 185, 129, 0.15)' : 'var(--dark-800)',
                                color: selectedDay === d ? 'white' : d === currentRamadanDay ? '#10b981' : 'var(--dark-300)',
                                border: d === currentRamadanDay && selectedDay !== d ? '1px solid rgba(16, 185, 129, 0.3)' : selectedDay === d ? 'none' : '1px solid var(--dark-700)',
                                borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                            }}>{d}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Week Selector */}
            {filterMode === 'week' && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {[1, 2, 3, 4, 5].map(w => (
                        <button key={w} onClick={() => setSelectedWeek(w)} style={{
                            flex: 1, padding: '10px 8px',
                            background: selectedWeek === w ? 'var(--primary)' : 'var(--dark-800)',
                            color: selectedWeek === w ? 'white' : 'var(--dark-300)',
                            border: selectedWeek === w ? 'none' : '1px solid var(--dark-700)',
                            borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        }}>M{w}</button>
                    ))}
                </div>
            )}

            {/* Sort By */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' }}>
                {[
                    { value: 'produktif', label: '🏅 Produktif' },
                    { value: 'total', label: '🏆 Total' },
                    { value: 'amanah', label: '🎯 Tugas' },
                    { value: 'quran', label: '📖 Quran' },
                    { value: 'idle', label: '⏳ Tidak Beraktivitas' },
                ].map(opt => (
                    <button key={opt.value} onClick={() => setRankBy(opt.value)} style={{
                        padding: '6px 12px', whiteSpace: 'nowrap',
                        background: rankBy === opt.value ? 'rgba(251,191,36,0.15)' : 'var(--dark-800)',
                        color: rankBy === opt.value ? '#fbbf24' : 'var(--dark-400)',
                        border: rankBy === opt.value ? '1px solid rgba(251,191,36,0.3)' : '1px solid var(--dark-700)',
                        borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                    }}>{opt.label}</button>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '12px' }}>
                <input
                    type="text"
                    placeholder="🔍 Cari nama anggota..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 14px',
                        background: 'var(--dark-800)', border: '1px solid var(--dark-600)',
                        borderRadius: 'var(--radius-lg)', color: 'var(--dark-100)', fontSize: '13px',
                    }}
                />
            </div>

            {/* Period info */}
            <div style={{ fontSize: '12px', color: 'var(--dark-400)', marginBottom: '12px', fontWeight: '600' }}>
                📅 {filterLabel} • {filteredRankedUsers.length} anggota
                {searchQuery.trim() && ` (dari ${rankedUsers.length})`}
            </div>

            {/* User List */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dark-400)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
                    <div style={{ fontSize: '13px' }}>Memuat data anggota label...</div>
                </div>
            ) : rankedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dark-500)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>👥</div>
                    Belum ada anggota dengan label ini
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagination.paginatedItems.map((user, idx) => {
                            const startIndex = pagination.showAll ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage;
                            const globalIndex = startIndex + idx;
                            const gc = GROUP_COLORS[user.user_group] || {};
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)',
                                        padding: '14px', cursor: 'pointer',
                                        border: '1px solid var(--dark-700)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {/* Rank */}
                                    <div style={{
                                        width: '32px', textAlign: 'center',
                                        fontSize: globalIndex < 3 ? '20px' : '14px',
                                        fontWeight: '700',
                                        color: globalIndex < 3 ? undefined : 'var(--dark-400)',
                                    }}>
                                        {getRankDisplay(globalIndex)}
                                    </div>

                                    {/* User Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px', fontWeight: '600', color: 'var(--dark-100)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}>
                                            {user.full_name || 'User'}
                                            {user.user_group && gc.text && (
                                                <span style={{
                                                    fontSize: '8px', padding: '1px 5px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: gc.bg, color: gc.text,
                                                    border: `1px solid ${gc.border}`,
                                                    fontWeight: '700', flexShrink: 0,
                                                }}>{user.user_group}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--dark-400)', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '3px 4px' }}>
                                            <span style={{ padding: '1px 5px', background: 'var(--dark-700)', borderRadius: '4px' }}>🕌 Sholat {user.sholat}</span>
                                            <span style={{ padding: '1px 5px', background: 'var(--dark-700)', borderRadius: '4px' }}>⭐ Sunnah {user.sunnah}</span>
                                            <span style={{ padding: '1px 5px', background: 'var(--dark-700)', borderRadius: '4px' }}>📋 Aktivitas {user.aktivitas + user.custom}</span>
                                            <span style={{ padding: '1px 5px', background: 'var(--dark-700)', borderRadius: '4px' }}>📖 Quran {user.quran_ayat} ayat</span>
                                            {user.amanah > 0 && <span style={{ padding: '1px 5px', background: 'var(--dark-700)', borderRadius: '4px' }}>🎯 Tugas {user.amanah}</span>}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24' }}>
                                            {rankBy === 'produktif' ? user.produktif_score :
                                                rankBy === 'quran' ? user.quran_ayat :
                                                    rankBy === 'sholat' ? user.sholat :
                                                        rankBy === 'sunnah' ? user.sunnah :
                                                            rankBy === 'aktivitas' ? user.aktivitas + user.custom :
                                                                rankBy === 'amanah' ? user.amanah :
                                                                    rankBy === 'idle' ? user.idle_hours :
                                                                        user.total}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--dark-500)' }}>
                                            {rankBy === 'produktif' ? 'poin' :
                                                rankBy === 'quran' ? 'ayat' :
                                                    rankBy === 'idle' ? 'jam' :
                                                        rankBy === 'amanah' ? 'amanah' : 'aktivitas'}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div style={{ color: 'var(--dark-500)', fontSize: '16px' }}>›</div>
                                </div>
                            );
                        })}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={pagination.goToPage}
                        totalItems={pagination.totalItems}
                        itemsPerPage={pagination.itemsPerPage}
                        onPerPageChange={pagination.setPerPage}
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
