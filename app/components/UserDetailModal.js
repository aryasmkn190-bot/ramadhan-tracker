'use client';

import { useState, useMemo } from 'react';

const RAMADAN_START = new Date('2026-02-19');

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
};

const GROUP_COLORS = {
    CHP: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    MR1: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
    MR2: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
    MR3: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a78bfa' },
    MR4: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
    SMD1: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
    SMD2: { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)', text: '#2dd4bf' },
};

// All known default activities
const ALL_ACTIVITIES = {
    subuh: { name: 'Subuh', icon: '🌅', cat: 'sholat' },
    dzuhur: { name: 'Dzuhur', icon: '☀️', cat: 'sholat' },
    ashar: { name: 'Ashar', icon: '🌤️', cat: 'sholat' },
    maghrib: { name: 'Maghrib', icon: '🌅', cat: 'sholat' },
    isya: { name: 'Isya', icon: '🌙', cat: 'sholat' },
    tahajud: { name: 'Tahajud', icon: '🌌', cat: 'sunnah' },
    dhuha: { name: 'Dhuha', icon: '🌞', cat: 'sunnah' },
    tarawih: { name: 'Tarawih', icon: '🕌', cat: 'sunnah' },
    witir: { name: 'Witir', icon: '⭐', cat: 'sunnah' },
    sahur: { name: 'Sahur', icon: '🍽️', cat: 'aktivitas' },
    puasa: { name: 'Puasa', icon: '☪️', cat: 'aktivitas' },
    buka: { name: 'Buka Puasa', icon: '🌙', cat: 'aktivitas' },
    dzikir: { name: 'Dzikir', icon: '📿', cat: 'aktivitas' },
    sedekah: { name: 'Sedekah', icon: '💝', cat: 'aktivitas' },
    tadarus: { name: 'Tadarus', icon: '📖', cat: 'aktivitas' },
};

const SHOLAT_IDS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
const SUNNAH_IDS = ['tahajud', 'dhuha', 'tarawih', 'witir'];
const AKTIVITAS_IDS = ['sahur', 'puasa', 'buka', 'dzikir', 'sedekah', 'tadarus'];

export default function UserDetailModal({ user, allActivities, quranData, customActivitiesList = [], onClose }) {
    const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'all'
    const [selectedDay, setSelectedDay] = useState(1);
    const [selectedWeek, setSelectedWeek] = useState(1);

    if (!user) return null;

    // Build lookup map for custom activity names: custom_{uuid} -> { name, icon }
    const customNameMap = useMemo(() => {
        const map = {};
        customActivitiesList.forEach(act => {
            map[`custom_${act.id}`] = { name: act.name, icon: act.icon || '📌' };
        });
        return map;
    }, [customActivitiesList]);

    // Helper to resolve any activity_id to a display name
    const getActivityName = (activityId) => {
        if (ALL_ACTIVITIES[activityId]) return ALL_ACTIVITIES[activityId].name;
        if (customNameMap[activityId]) return customNameMap[activityId].name;
        // Fallback: clean up the id
        return activityId.replace(/^custom_/, '').substring(0, 12) + '...';
    };

    const getCustomIcon = (activityId) => {
        if (customNameMap[activityId]) return customNameMap[activityId].icon;
        return '📌';
    };

    // Filter user's activities
    const userActivities = useMemo(() => {
        return allActivities.filter(a => a.user_id === user.id && a.completed);
    }, [allActivities, user.id]);

    // Get Quran reading count for user
    const userQuranSessions = useMemo(() => {
        return quranData.filter(q => q.user_id === user.id).length;
    }, [quranData, user.id]);

    // Get dates based on view mode
    const activeDates = useMemo(() => {
        if (viewMode === 'day') {
            return [getDateForRamadanDay(selectedDay)];
        } else if (viewMode === 'week') {
            const start = (selectedWeek - 1) * 7 + 1;
            const end = Math.min(selectedWeek * 7, 30);
            return Array.from({ length: end - start + 1 }, (_, i) => getDateForRamadanDay(start + i));
        }
        return Array.from({ length: 30 }, (_, i) => getDateForRamadanDay(i + 1));
    }, [viewMode, selectedDay, selectedWeek]);

    // Activities in active date range
    const filteredActivities = useMemo(() => {
        return userActivities.filter(a => activeDates.includes(a.activity_date));
    }, [userActivities, activeDates]);

    // Stats summary
    const stats = useMemo(() => {
        let sholat = 0, sunnah = 0, aktivitas = 0, custom = 0;
        filteredActivities.forEach(a => {
            if (SHOLAT_IDS.includes(a.activity_id)) sholat++;
            else if (SUNNAH_IDS.includes(a.activity_id)) sunnah++;
            else if (AKTIVITAS_IDS.includes(a.activity_id)) aktivitas++;
            else custom++;
        });
        return { sholat, sunnah, aktivitas, custom, total: sholat + sunnah + aktivitas + custom };
    }, [filteredActivities]);

    // Per-day breakdown for the active dates
    const perDay = useMemo(() => {
        const map = {};
        activeDates.forEach(date => { map[date] = []; });
        filteredActivities.forEach(a => {
            if (map[a.activity_date]) {
                map[a.activity_date].push(a.activity_id);
            }
        });
        return map;
    }, [activeDates, filteredActivities]);

    // Activity heatmap across 30 days
    const heatmap = useMemo(() => {
        const counts = {};
        for (let d = 1; d <= 30; d++) {
            const date = getDateForRamadanDay(d);
            counts[d] = userActivities.filter(a => a.activity_date === date).length;
        }
        return counts;
    }, [userActivities]);

    const maxHeat = Math.max(...Object.values(heatmap), 1);

    const groupColor = GROUP_COLORS[user.user_group];

    const filterLabel = useMemo(() => {
        if (viewMode === 'day') return `Hari ke-${selectedDay} Ramadhan`;
        if (viewMode === 'week') return `Minggu ke-${selectedWeek} (Hari ${(selectedWeek - 1) * 7 + 1}-${Math.min(selectedWeek * 7, 30)})`;
        return '30 Hari Ramadhan';
    }, [viewMode, selectedDay, selectedWeek]);

    // Days that have activities
    const activeDayCount = useMemo(() => {
        const days = new Set();
        userActivities.forEach(a => days.add(a.activity_date));
        return days.size;
    }, [userActivities]);

    // Get ramadhan day number from date
    const getDayFromDate = (dateStr) => {
        const diff = (new Date(dateStr) - RAMADAN_START) / (1000 * 60 * 60 * 24);
        return Math.round(diff) + 1;
    };

    return (
        <div
            className="modal-overlay active"
            onClick={onClose}
            style={{ zIndex: 9999 }}
        >
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div className="modal-handle"></div>

                {/* User Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--dark-700)',
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--emerald-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'white',
                        flexShrink: 0,
                    }}>
                        {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '2px',
                        }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--dark-100)' }}>
                                {user.full_name}
                            </span>
                            {user.user_group && groupColor && (
                                <span style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-full)',
                                    background: groupColor.bg,
                                    color: groupColor.text,
                                    border: `1px solid ${groupColor.border}`,
                                    fontWeight: '700',
                                }}>
                                    {user.user_group}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                            {user.email}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--dark-700)',
                            border: 'none',
                            color: 'var(--dark-300)',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >✕</button>
                </div>

                {/* Overall Summary (always visible) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    marginBottom: '14px',
                }}>
                    {[
                        { value: activeDayCount, label: 'Hari Aktif', color: '#10b981' },
                        { value: userActivities.length, label: 'Total Aktivitas', color: '#60a5fa' },
                        { value: `${userQuranSessions} sesi`, label: 'Tadarus', color: '#fbbf24' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: 'var(--dark-800)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 6px',
                            textAlign: 'center',
                            border: '1px solid var(--dark-700)',
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>
                                {item.value}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--dark-400)', fontWeight: '600', textTransform: 'uppercase' }}>
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 30-Day Heatmap */}
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    marginBottom: '14px',
                    border: '1px solid var(--dark-700)',
                }}>
                    <div style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: 'var(--dark-400)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px',
                    }}>
                        📊 Aktivitas Harian (30 Hari)
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: '3px',
                    }}>
                        {Array.from({ length: 30 }, (_, i) => {
                            const day = i + 1;
                            const count = heatmap[day] || 0;
                            const intensity = count / maxHeat;
                            const isActive = viewMode === 'day' && selectedDay === day;
                            return (
                                <button
                                    key={day}
                                    onClick={() => { setViewMode('day'); setSelectedDay(day); }}
                                    title={`Hari ${day}: ${count} aktivitas`}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        borderRadius: '4px',
                                        border: isActive ? '2px solid var(--emerald-500)' : '1px solid transparent',
                                        background: count === 0
                                            ? 'var(--dark-700)'
                                            : `rgba(16, 185, 129, ${0.15 + intensity * 0.7})`,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '8px',
                                        fontWeight: '700',
                                        color: count > 0 ? 'white' : 'var(--dark-500)',
                                        padding: 0,
                                    }}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        fontSize: '8px',
                        color: 'var(--dark-500)',
                    }}>
                        <span>Klik untuk detail hari</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Kurang</span>
                            {[0, 0.25, 0.5, 0.75, 1].map((opacity, i) => (
                                <span key={i} style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '2px',
                                    background: opacity === 0 ? 'var(--dark-700)' : `rgba(16, 185, 129, ${0.15 + opacity * 0.7})`,
                                    display: 'inline-block',
                                }} />
                            ))}
                            <span>Banyak</span>
                        </span>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '10px',
                    background: 'var(--dark-700)',
                    padding: '3px',
                    borderRadius: 'var(--radius-lg)',
                }}>
                    {[
                        { id: 'day', label: 'Per Hari' },
                        { id: 'week', label: 'Per Minggu' },
                        { id: 'all', label: '30 Hari' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            style={{
                                flex: 1,
                                padding: '7px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: viewMode === tab.id ? 'var(--emerald-600)' : 'transparent',
                                color: viewMode === tab.id ? 'white' : 'var(--dark-400)',
                                fontWeight: '600',
                                fontSize: '11px',
                                cursor: 'pointer',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Day Picker */}
                {viewMode === 'day' && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
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
                                    minWidth: '30px',
                                    height: '30px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: selectedDay === day ? 'var(--emerald-600)' : 'var(--dark-700)',
                                    color: selectedDay === day ? 'white' : 'var(--dark-400)',
                                    fontSize: '11px',
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

                {/* Week Picker */}
                {viewMode === 'week' && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        marginBottom: '10px',
                    }}>
                        {[1, 2, 3, 4, 5].map(week => (
                            <button
                                key={week}
                                onClick={() => setSelectedWeek(week)}
                                style={{
                                    flex: 1,
                                    padding: '7px',
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

                {/* Filter Label */}
                <div style={{
                    padding: '6px 10px',
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--dark-300)' }}>📅 {filterLabel}</span>
                    <span style={{ fontSize: '11px', color: 'var(--dark-400)' }}>{stats.total} aktivitas</span>
                </div>

                {/* Category Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    marginBottom: '14px',
                }}>
                    {[
                        { icon: '🕌', label: 'Sholat', value: stats.sholat, max: SHOLAT_IDS.length * activeDates.length, color: '#3b82f6' },
                        { icon: '⭐', label: 'Sunnah', value: stats.sunnah, max: SUNNAH_IDS.length * activeDates.length, color: '#a78bfa' },
                        { icon: '📋', label: 'Aktivitas', value: stats.aktivitas, max: AKTIVITAS_IDS.length * activeDates.length, color: '#f59e0b' },
                        { icon: '🎯', label: 'Custom', value: stats.custom, max: 0, color: '#ec4899' },
                    ].map((cat, i) => {
                        const pct = cat.max > 0 ? Math.round((cat.value / cat.max) * 100) : 0;
                        return (
                            <div key={i} style={{
                                background: 'var(--dark-800)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 4px',
                                textAlign: 'center',
                                border: '1px solid var(--dark-700)',
                            }}>
                                <div style={{ fontSize: '14px', marginBottom: '2px' }}>{cat.icon}</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: cat.color }}>
                                    {cat.value}
                                </div>
                                <div style={{ fontSize: '8px', color: 'var(--dark-500)', fontWeight: '600' }}>
                                    {cat.label}
                                </div>
                                {cat.max > 0 && (
                                    <div style={{
                                        marginTop: '4px',
                                        height: '3px',
                                        background: 'var(--dark-700)',
                                        borderRadius: '2px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            background: cat.color,
                                            borderRadius: '2px',
                                        }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Detailed Day-by-Day Breakdown */}
                <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--dark-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    paddingLeft: '2px',
                }}>
                    📋 Detail Aktivitas
                </div>

                {activeDates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--dark-400)', fontSize: '12px' }}>
                        Tidak ada data
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                        {activeDates.map(date => {
                            const day = getDayFromDate(date);
                            const acts = perDay[date] || [];
                            const sholatDone = acts.filter(id => SHOLAT_IDS.includes(id));
                            const sunnahDone = acts.filter(id => SUNNAH_IDS.includes(id));
                            const aktDone = acts.filter(id => AKTIVITAS_IDS.includes(id));
                            const customDone = acts.filter(id => !SHOLAT_IDS.includes(id) && !SUNNAH_IDS.includes(id) && !AKTIVITAS_IDS.includes(id));

                            return (
                                <div key={date} style={{
                                    background: 'var(--dark-800)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px',
                                    border: '1px solid var(--dark-700)',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: acts.length > 0 ? '8px' : '0',
                                    }}>
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: 'var(--dark-200)',
                                        }}>
                                            Hari {day}
                                        </span>
                                        <span style={{
                                            fontSize: '10px',
                                            color: acts.length > 0 ? 'var(--emerald-400)' : 'var(--dark-500)',
                                            fontWeight: '600',
                                        }}>
                                            {acts.length > 0 ? `${acts.length} aktivitas ✓` : 'Belum ada aktivitas'}
                                        </span>
                                    </div>

                                    {acts.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {/* Sholat Row */}
                                            {sholatDone.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '9px', color: '#3b82f6', fontWeight: '700', marginRight: '2px' }}>🕌</span>
                                                    {SHOLAT_IDS.map(id => {
                                                        const done = sholatDone.includes(id);
                                                        return (
                                                            <span key={id} style={{
                                                                fontSize: '9px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                background: done ? 'rgba(59, 130, 246, 0.15)' : 'var(--dark-700)',
                                                                color: done ? '#60a5fa' : 'var(--dark-600)',
                                                                fontWeight: '600',
                                                                textDecoration: done ? 'none' : 'line-through',
                                                            }}>
                                                                {ALL_ACTIVITIES[id]?.name || id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Sunnah Row */}
                                            {sunnahDone.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '9px', color: '#a78bfa', fontWeight: '700', marginRight: '2px' }}>⭐</span>
                                                    {SUNNAH_IDS.map(id => {
                                                        const done = sunnahDone.includes(id);
                                                        return (
                                                            <span key={id} style={{
                                                                fontSize: '9px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                background: done ? 'rgba(168, 85, 247, 0.15)' : 'var(--dark-700)',
                                                                color: done ? '#a78bfa' : 'var(--dark-600)',
                                                                fontWeight: '600',
                                                                textDecoration: done ? 'none' : 'line-through',
                                                            }}>
                                                                {ALL_ACTIVITIES[id]?.name || id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Aktivitas Row */}
                                            {aktDone.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: '700', marginRight: '2px' }}>📋</span>
                                                    {AKTIVITAS_IDS.map(id => {
                                                        const done = aktDone.includes(id);
                                                        return (
                                                            <span key={id} style={{
                                                                fontSize: '9px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                background: done ? 'rgba(245, 158, 11, 0.15)' : 'var(--dark-700)',
                                                                color: done ? '#fbbf24' : 'var(--dark-600)',
                                                                fontWeight: '600',
                                                                textDecoration: done ? 'none' : 'line-through',
                                                            }}>
                                                                {ALL_ACTIVITIES[id]?.name || id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Custom Row */}
                                            {customDone.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '9px', color: '#ec4899', fontWeight: '700', marginRight: '2px' }}>🎯</span>
                                                    {customDone.map(id => (
                                                        <span key={id} style={{
                                                            fontSize: '9px',
                                                            padding: '2px 5px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(236, 72, 153, 0.15)',
                                                            color: '#f472b6',
                                                            fontWeight: '600',
                                                        }}>
                                                            {getCustomIcon(id)} {getActivityName(id)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
