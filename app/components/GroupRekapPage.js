'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserDetailModal from './UserDetailModal';
import Pagination, { usePagination } from './Pagination';
import { GROUP_COLORS } from '../data/userGroups';

const RAMADAN_START = new Date('2026-02-19');

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
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
    const daysSinceRamadan = Math.ceil((today - RAMADAN_START) / (1000 * 60 * 60 * 24));
    const currentRamadanDay = Math.min(Math.max(daysSinceRamadan + 1, 1), 30);

    useEffect(() => {
        fetchGroupData();
    }, [userGroup]);

    const fetchGroupData = async () => {
        if (!isSupabaseConfigured() || !userGroup) return;
        setLoading(true);

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
            setProfiles(groupProfiles);

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

                if (activitiesRes.data) setAllActivities(activitiesRes.data);
                if (quranRes.data) setQuranData(quranRes.data);
            } else {
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
            };
        });

        relevantActivities.forEach(a => {
            if (!userStats[a.user_id]) return;
            if (SHOLAT_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sholat++;
            } else if (SUNNAH_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sunnah++;
            } else if (AKTIVITAS_IDS.includes(a.activity_id)) {
                userStats[a.user_id].aktivitas++;
            } else if (amanahIds.has(a.activity_id)) {
                userStats[a.user_id].amanah++;
            } else {
                userStats[a.user_id].custom++;
            }
            userStats[a.user_id].total++;

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
        });

        let users = Object.values(userStats);
        users.sort((a, b) => {
            if (rankBy === 'quran') return b.quran_ayat - a.quran_ayat;
            if (rankBy === 'sholat') return b.sholat - a.sholat;
            if (rankBy === 'sunnah') return b.sunnah - a.sunnah;
            if (rankBy === 'aktivitas') return (b.aktivitas + b.custom) - (a.aktivitas + a.custom);
            if (rankBy === 'amanah') return b.amanah - a.amanah;
            if (rankBy === 'idle') return b.idle_hours - a.idle_hours || a.total - b.total;
            return b.total - a.total;
        });

        return users;
    }, [profiles, allActivities, quranData, filteredDates, rankBy, amanahIds]);

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
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                                            🕌 {user.sholat} • ⭐ {user.sunnah} • 📋 {user.aktivitas + user.custom}
                                            {user.amanah > 0 && <> • 🎯 {user.amanah}</>}
                                            {' '}• 📖 {user.quran_ayat} ayat
                                            {user.idle_hours > 0 && <span style={{ color: '#ef4444' }}> • ⏳{user.idle_hours}j</span>}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                                            {rankBy === 'quran' ? user.quran_ayat :
                                                rankBy === 'sholat' ? user.sholat :
                                                    rankBy === 'sunnah' ? user.sunnah :
                                                        rankBy === 'aktivitas' ? user.aktivitas + user.custom :
                                                            rankBy === 'amanah' ? user.amanah :
                                                                rankBy === 'idle' ? user.idle_hours :
                                                                    user.total}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--dark-500)' }}>
                                            {rankBy === 'quran' ? 'ayat' :
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
