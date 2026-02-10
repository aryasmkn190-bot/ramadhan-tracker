'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserDetailModal from './UserDetailModal';
import Pagination, { usePagination } from './Pagination';

const USER_GROUPS = ['CHP', 'MR1', 'MR2', 'MR3', 'MR4', 'SMD1', 'SMD2'];

const GROUP_COLORS = {
    CHP: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    MR1: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
    MR2: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
    MR3: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a78bfa' },
    MR4: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
    SMD1: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
    SMD2: { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)', text: '#2dd4bf' },
};

const RAMADAN_START = new Date('2026-02-19');

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
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
    const [selectedUser, setSelectedUser] = useState(null);

    // Current Ramadan day
    const today = new Date();
    const daysSinceRamadan = Math.ceil((today - RAMADAN_START) / (1000 * 60 * 60 * 24));
    const currentRamadanDay = Math.min(Math.max(daysSinceRamadan + 1, 1), 30);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        if (!isSupabaseConfigured()) return;
        setLoading(true);

        try {
            const [profilesRes, activitiesRes, quranRes, customActRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, user_group, role, email'),
                supabase.from('daily_activities').select('user_id, activity_date, activity_id, completed'),
                supabase.from('quran_progress').select('user_id, current_juz, pages_read'),
                supabase.from('custom_activities').select('id, name, icon, category'),
            ]);

            if (profilesRes.data) setProfiles(profilesRes.data);
            if (activitiesRes.data) setAllActivities(activitiesRes.data);
            if (quranRes.data) setQuranData(quranRes.data);
            if (customActRes.data) setCustomActivitiesList(customActRes.data);
        } catch (error) {
            console.error('Error fetching admin leaderboard data:', error);
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
            // all 30 days
            const dates = [];
            for (let d = 1; d <= 30; d++) {
                dates.push(getDateForRamadanDay(d));
            }
            return dates;
        }
    }, [filterMode, selectedDay, selectedWeek]);

    // Define activity categories
    const SHOLAT_IDS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const SUNNAH_IDS = ['tahajud', 'dhuha', 'tarawih', 'witir'];
    const AKTIVITAS_IDS = ['sahur', 'puasa', 'buka', 'dzikir', 'sedekah', 'tadarus'];

    // Build ranked users
    const rankedUsers = useMemo(() => {
        // Filter activities by date range
        const relevantActivities = allActivities.filter(a =>
            a.completed && filteredDates.includes(a.activity_date)
        );

        // Group by user
        const userStats = {};
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
                total: 0,
                pages_read: 0,
                current_juz: 1,
            };
        });

        // Count activities
        relevantActivities.forEach(a => {
            if (!userStats[a.user_id]) return;

            if (SHOLAT_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sholat++;
            } else if (SUNNAH_IDS.includes(a.activity_id)) {
                userStats[a.user_id].sunnah++;
            } else if (AKTIVITAS_IDS.includes(a.activity_id)) {
                userStats[a.user_id].aktivitas++;
            } else {
                userStats[a.user_id].custom++;
            }
            userStats[a.user_id].total++;
        });

        // Add quran data
        quranData.forEach(q => {
            if (userStats[q.user_id]) {
                userStats[q.user_id].pages_read = q.pages_read || 0;
                userStats[q.user_id].current_juz = q.current_juz || 1;
            }
        });

        // Filter by group
        let users = Object.values(userStats);
        if (selectedGroup !== 'all') {
            users = users.filter(u => u.user_group === selectedGroup);
        }

        // Sort
        users.sort((a, b) => {
            if (rankBy === 'quran') return b.pages_read - a.pages_read;
            if (rankBy === 'sholat') return b.sholat - a.sholat;
            if (rankBy === 'sunnah') return b.sunnah - a.sunnah;
            if (rankBy === 'aktivitas') return (b.aktivitas + b.custom) - (a.aktivitas + a.custom);
            return b.total - a.total; // 'total'
        });

        return users;
    }, [profiles, allActivities, quranData, filteredDates, selectedGroup, rankBy]);

    // Group ranking (aggregated scores)
    const groupRanking = useMemo(() => {
        const groups = {};
        USER_GROUPS.forEach(g => {
            groups[g] = { group: g, members: 0, totalActivities: 0, totalPages: 0, avgActivities: 0 };
        });

        rankedUsers.forEach(u => {
            if (u.user_group && groups[u.user_group]) {
                groups[u.user_group].members++;
                groups[u.user_group].totalActivities += u.total;
                groups[u.user_group].totalPages += u.pages_read;
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
        if (rankBy === 'quran') return `${user.pages_read} hal`;
        if (rankBy === 'sholat') return `${user.sholat}x`;
        if (rankBy === 'sunnah') return `${user.sunnah}x`;
        if (rankBy === 'aktivitas') return `${user.aktivitas + user.custom}x`;
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

            {/* Rank By selector */}
            <div style={{
                display: 'flex',
                gap: '5px',
                overflowX: 'auto',
                marginBottom: '10px',
                paddingBottom: '4px',
            }}>
                {[
                    { id: 'total', label: '🔢 Total', color: '#10b981' },
                    { id: 'sholat', label: '🕌 Sholat', color: '#3b82f6' },
                    { id: 'sunnah', label: '⭐ Sunnah', color: '#a78bfa' },
                    { id: 'aktivitas', label: '📋 Aktivitas', color: '#f59e0b' },
                    { id: 'quran', label: '📖 Quran', color: '#fbbf24' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setRankBy(item.id)}
                        style={{
                            padding: '5px 10px',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: rankBy === item.id
                                ? `${item.color}22`
                                : 'var(--dark-700)',
                            color: rankBy === item.id ? item.color : 'var(--dark-400)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Group filter */}
            <div style={{
                display: 'flex',
                gap: '5px',
                overflowX: 'auto',
                marginBottom: '14px',
                paddingBottom: '4px',
            }}>
                <button
                    onClick={() => setSelectedGroup('all')}
                    style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        background: selectedGroup === 'all' ? 'var(--emerald-600)' : 'var(--dark-700)',
                        color: selectedGroup === 'all' ? 'white' : 'var(--dark-400)',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    Semua Grup
                </button>
                {USER_GROUPS.map(group => {
                    const colors = GROUP_COLORS[group];
                    return (
                        <button
                            key={group}
                            onClick={() => setSelectedGroup(group)}
                            style={{
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                background: selectedGroup === group ? colors.bg : 'var(--dark-700)',
                                color: selectedGroup === group ? colors.text : 'var(--dark-400)',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {group}
                        </button>
                    );
                })}
            </div>

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
                                        width: '40px',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        color: colors.text,
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
                                            {g.totalActivities} akt • {g.totalPages} hal
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
                                        }}>
                                            <span>🕌{user.sholat}</span>
                                            <span>⭐{user.sunnah}</span>
                                            <span>📋{user.aktivitas + user.custom}</span>
                                            <span>📖{user.pages_read}h</span>
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
                    allActivities={allActivities}
                    quranData={quranData}
                    customActivitiesList={customActivitiesList}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </section>
    );
}
