'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserDetailModal from './UserDetailModal';
import Pagination, { usePagination } from './Pagination';
import { GROUP_COLORS } from '../data/userGroups';
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

export default function GroupRekapPage() {
    const { profile } = useAuth();
    const userGroup = profile?.user_group;

    const [profiles, setProfiles] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [quranData, setQuranData] = useState([]);
    const [customActivitiesList, setCustomActivitiesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    // Filters
    const [filterMode, setFilterMode] = useState('all'); // 'day', 'week', 'all'
    const [selectedDay, setSelectedDay] = useState(1);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [rankBy, setRankBy] = useState('total');
    const [searchQuery, setSearchQuery] = useState('');

    // Current Ramadan day
    const today = new Date();
    const isAfterMaghrib = today.getHours() >= 18;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayMidnight = new Date(todayStr + 'T00:00:00');
    const ramadanStart = new Date(RAMADAN_START_STR + 'T00:00:00');
    const daysSinceRamadan = Math.floor((todayMidnight - ramadanStart) / (1000 * 60 * 60 * 24));
    const currentRamadanDay = Math.min(Math.max(daysSinceRamadan + 1 + (isAfterMaghrib ? 1 : 0), 1), 30);

    useEffect(() => {
        fetchGroupData();
    }, [userGroup]);

    const fetchGroupData = async () => {
        if (!isSupabaseConfigured() || !userGroup) return;

        // Clear old data immediately to prevent stale data flash
        setLoading(true);
        setProfiles([]);
        setAllActivities([]);
        setQuranData([]);

        try {
            // Fetch custom activities (for amanah identification)
            const customActRes = await supabase.from('custom_activities').select('id, name, icon, category');
            if (customActRes.data) setCustomActivitiesList(customActRes.data);

            // Step 1: Fetch group members first
            const profilesRes = await supabase
                .from('profiles')
                .select('id, full_name, user_group, role, email')
                .eq('user_group', userGroup);

            const groupProfiles = profilesRes.data || [];

            // Step 2: Fetch only activities & quran data for group members (server-side filter)
            const memberIds = groupProfiles.map(p => p.id);

            if (memberIds.length > 0) {
                const [activitiesRes, quranRes] = await Promise.all([
                    supabase.from('daily_activities')
                        .select('user_id, activity_date, activity_id, completed, start_time, end_time')
                        .in('user_id', memberIds),
                    supabase.from('quran_readings')
                        .select('user_id, read_date, surah_number, start_ayat, end_ayat')
                        .in('user_id', memberIds),
                ]);

                // Set all data at once to avoid partial renders
                setProfiles(groupProfiles);
                if (activitiesRes.data) setAllActivities(activitiesRes.data);
                if (quranRes.data) setQuranData(quranRes.data);
            } else {
                setProfiles(groupProfiles);
                setAllActivities([]);
                setQuranData([]);
            }
        } catch (error) {
            console.error('Error fetching group data:', error);
        } finally {
            setLoading(false);
        }
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
            const dates = [];
            for (let d = 1; d <= 30; d++) {
                dates.push(getDateForRamadanDay(d));
            }
            return dates;
        }
    }, [filterMode, selectedDay, selectedWeek]);

    // Activity IDs
    const SHOLAT_IDS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const SUNNAH_IDS = ['tahajud', 'dhuha', 'tarawih', 'witir'];
    const AKTIVITAS_IDS = ['sahur', 'puasa', 'buka', 'dzikir', 'sedekah', 'tadarus'];

    // Build set of amanah activity IDs
    const amanahIds = useMemo(() => {
        return new Set(customActivitiesList.filter(ca => ca.category === 'amanah').map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Build set of tidur/istirahat activity IDs
    const tidurIds = useMemo(() => {
        return new Set(customActivitiesList
            .filter(ca => ca.category === 'istirahat' || ca.name?.toLowerCase().includes('tidur'))
            .map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Build set of hiburan activity IDs
    const hiburanIds = useMemo(() => {
        return new Set(customActivitiesList
            .filter(ca => ca.category === 'hiburan')
            .map(ca => `custom_${ca.id}`));
    }, [customActivitiesList]);

    // Helper: compute hours for a single activity record
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

    // Productivity score calculator
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

    // Helper: parse "HH:MM" to fractional hours
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const m = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1]) + parseInt(m[2]) / 60;
    };

    // Calculate idle hours for a set of activities on a single day
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

    // Build ranked users
    const rankedUsers = useMemo(() => {
        const relevantActivities = allActivities.filter(a =>
            a.completed && filteredDates.includes(a.activity_date)
        );

        const userStats = {};
        const userDateActivities = {};

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
            if (SHOLAT_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sholat += sc;
            } else if (SUNNAH_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sunnah += sc;
            } else if (AKTIVITAS_IDS.includes(a.activity_id)) {
                userStats[a.user_id].aktivitas += sc;
            } else if (amanahIds.has(a.activity_id)) {
                userStats[a.user_id].amanah += sc;
            } else {
                userStats[a.user_id].custom += sc;
            }
            userStats[a.user_id].total += sc;

            // Track productivity metrics
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

            const key = `${a.user_id}_${a.activity_date}`;
            if (!userDateActivities[key]) userDateActivities[key] = [];
            userDateActivities[key].push(a);
        });

        // Quran: count ayat
        quranData.forEach(q => {
            if (!userStats[q.user_id]) return;
            if (!filteredDates.includes(q.read_date)) return;
            const ayatCount = (q.end_ayat && q.start_ayat)
                ? Math.max(q.end_ayat - q.start_ayat + 1, 1)
                : 1;
            userStats[q.user_id].quran_ayat += ayatCount;
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
            userStats[uid].tidur_hours = Math.round(userStats[uid].tidur_hours * 10) / 10;
            userStats[uid].amanah_hours = Math.round(userStats[uid].amanah_hours * 10) / 10;
        });

        let users = Object.values(userStats);

        // Calculate productivity scores if needed
        if (rankBy === 'produktif') {
            calculateProductivityScores(users);
        }

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
    }, [profiles, allActivities, quranData, filteredDates, rankBy, amanahIds, tidurIds, hiburanIds]);

    // Stats summary
    const groupStats = useMemo(() => {
        const totalMembers = profiles.length;
        const totalActivities = rankedUsers.reduce((s, u) => s + u.total, 0);
        const totalQuranAyat = rankedUsers.reduce((s, u) => s + u.quran_ayat, 0);
        const avgActivities = totalMembers > 0 ? Math.round(totalActivities / totalMembers) : 0;
        return { totalMembers, totalActivities, totalQuranAyat, avgActivities };
    }, [profiles, rankedUsers]);

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

    // Search filter applied on rankedUsers
    const filteredRankedUsers = useMemo(() => {
        if (!searchQuery.trim()) return rankedUsers;
        const q = searchQuery.toLowerCase();
        return rankedUsers.filter(u =>
            u.full_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [rankedUsers, searchQuery]);

    // Pagination
    const pagination = usePagination(filteredRankedUsers);

    const gc = GROUP_COLORS[userGroup] || { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#818cf8' };

    if (!userGroup) {
        return (
            <section className="page-container" style={{ padding: '16px', paddingBottom: '100px' }}>
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dark-400)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⚠️</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Grup belum diatur</div>
                    <div style={{ fontSize: '13px' }}>Silakan atur grup Anda di halaman Pengaturan terlebih dahulu.</div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-container" style={{ padding: '16px', paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>👥</span>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', margin: 0 }}>
                            Rekap Anggota
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{
                                fontSize: '11px', fontWeight: '600', padding: '3px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text,
                            }}>{userGroup}</span>
                            <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                                {groupStats.totalMembers} anggota
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[
                    { label: 'Total Aktivitas', value: groupStats.totalActivities, icon: '📊' },
                    { label: 'Ayat Dibaca', value: groupStats.totalQuranAyat, icon: '📖' },
                    { label: 'Rata-rata/Orang', value: groupStats.avgActivities, icon: '📈' },
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '14px 12px',
                        textAlign: 'center', border: '1px solid var(--dark-700)',
                    }}>
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)' }}>{stat.value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--dark-400)', marginTop: '2px' }}>{stat.label}</div>
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

            {/* Day/Week Selector */}
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
                    { value: 'sholat', label: '🕌 Sholat' },
                    { value: 'sunnah', label: '⭐ Sunnah' },
                    { value: 'aktivitas', label: '📋 Aktivitas' },
                    { value: 'amanah', label: '🎯 Amanah' },
                    { value: 'quran', label: '📖 Quran' },
                    { value: 'idle', label: '⏳ Tidak Ada Aktivitas' },
                ].map(opt => (
                    <button key={opt.value} onClick={() => setRankBy(opt.value)} style={{
                        padding: '6px 12px', whiteSpace: 'nowrap',
                        background: rankBy === opt.value ? 'rgba(16,185,129,0.15)' : 'var(--dark-800)',
                        color: rankBy === opt.value ? '#10b981' : 'var(--dark-400)',
                        border: rankBy === opt.value ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--dark-700)',
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
                        width: '100%',
                        padding: '10px 14px',
                        background: 'var(--dark-800)',
                        border: '1px solid var(--dark-600)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--dark-100)',
                        fontSize: '13px',
                    }}
                />
            </div>

            {/* Period Label */}
            <div style={{ fontSize: '12px', color: 'var(--dark-400)', marginBottom: '12px', fontWeight: '600' }}>
                📅 {filterLabel} • {filteredRankedUsers.length} anggota
                {searchQuery.trim() && ` (dari ${rankedUsers.length})`}
            </div>

            {/* Loading */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dark-400)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    Memuat data anggota...
                </div>
            ) : rankedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dark-500)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>👥</div>
                    Belum ada anggota di grup ini
                </div>
            ) : (
                <>
                    {/* User List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pagination.paginatedItems.map((user, idx) => {
                            const startIndex = pagination.showAll ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage;
                            const globalIndex = startIndex + idx;
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
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--dark-700)';
                                        e.currentTarget.style.borderColor = gc.border;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'var(--dark-800)';
                                        e.currentTarget.style.borderColor = 'var(--dark-700)';
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
                                        }}>
                                            {user.full_name || 'User'}
                                            {user.role === 'group_admin' && (
                                                <span style={{
                                                    fontSize: '9px', marginLeft: '6px', padding: '2px 6px',
                                                    background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                                                    borderRadius: 'var(--radius-full)', fontWeight: '600',
                                                }}>ADMIN</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}>
                                            {rankBy === 'produktif' ? (
                                                <>
                                                    <span style={{ color: '#10b981' }}>🕌{user.sholat}</span>
                                                    <span style={{ color: '#10b981' }}>⭐{user.sunnah}</span>
                                                    <span style={{ color: '#10b981' }}>📋{user.aktivitas + user.custom}</span>
                                                    <span style={{ color: '#10b981' }}>🎯{user.amanah}({user.amanah_hours}j)</span>
                                                    <span style={{ color: '#10b981' }}>📖{user.quran_ayat}</span>
                                                    <span style={{ color: '#ef4444' }}>�{user.tidur_count}({user.tidur_hours}j)</span>
                                                    <span style={{ color: '#ef4444' }}>⏳{user.idle_hours}j</span>
                                                    {user.hiburan_count > 0 && <span style={{ color: '#ef4444' }}>🎮{user.hiburan_count}</span>}
                                                </>
                                            ) : (
                                                <>
                                                    <span>�🕌 {user.sholat}</span>
                                                    <span>• ⭐ {user.sunnah}</span>
                                                    <span>• 📋 {user.aktivitas + user.custom}</span>
                                                    {user.amanah > 0 && <span>• 🎯 {user.amanah}</span>}
                                                    <span>• 📖 {user.quran_ayat} ayat</span>
                                                    {user.idle_hours > 0 && <span style={{ color: '#ef4444' }}>• ⏳{user.idle_hours}j</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
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

                    {/* Pagination */}
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
