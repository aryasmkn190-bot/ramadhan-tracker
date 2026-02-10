'use client';

import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#ef4444', '#06b6d4', '#a78bfa', '#fb923c', '#34d399'];
const RANK_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function RekapPage() {
    const {
        activities,
        getDateForRamadanDay,
        currentRamadanDay,
        DEFAULT_PRAYERS,
        DEFAULT_SUNNAH,
        DEFAULT_ACTIVITIES,
        customActivities,
        quranProgress,
    } = useApp();

    // Filter mode: 'day' = single day, '7days' = 7 hari, '30days' = 30 hari
    const [filterMode, setFilterMode] = useState('day');
    const [selectedDay, setSelectedDay] = useState(() => Math.min(Math.max(currentRamadanDay, 1), 30));

    // Calculate which days to include based on filter
    const daysToInclude = useMemo(() => {
        if (filterMode === 'day') {
            return [selectedDay];
        } else if (filterMode === '7days') {
            const endDay = Math.min(selectedDay, 30);
            const startDay = Math.max(1, endDay - 6);
            const days = [];
            for (let d = startDay; d <= endDay; d++) days.push(d);
            return days;
        } else {
            // 30 days
            const days = [];
            for (let d = 1; d <= 30; d++) days.push(d);
            return days;
        }
    }, [filterMode, selectedDay]);

    // All activities definitions
    const allActivityDefs = useMemo(() => {
        return [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
    }, [DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES, customActivities]);

    // Daily completion data
    const dailyData = useMemo(() => {
        return daysToInclude.map(day => {
            const dateStr = getDateForRamadanDay(day);
            const dayActs = activities[dateStr] || {};

            const prayersCompleted = DEFAULT_PRAYERS.filter(p => dayActs[p.id]?.completed).length;
            const sunnahCompleted = DEFAULT_SUNNAH.filter(s => dayActs[s.id]?.completed).length;
            const activitiesCompleted = DEFAULT_ACTIVITIES.filter(a => dayActs[a.id]?.completed).length;
            const customCompleted = customActivities.filter(c => dayActs[c.id]?.completed).length;

            const total = prayersCompleted + sunnahCompleted + activitiesCompleted + customCompleted;
            const maxTotal = allActivityDefs.length;

            return {
                day: `H${day}`,
                dayNum: day,
                sholat: prayersCompleted,
                sunnah: sunnahCompleted,
                aktivitas: activitiesCompleted,
                custom: customCompleted,
                total,
                percentage: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0,
            };
        });
    }, [daysToInclude, activities, getDateForRamadanDay, DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES, customActivities, allActivityDefs]);

    // Category summary for pie chart — each custom activity is individual
    const categorySummary = useMemo(() => {
        let sholat = 0, sunnah = 0, aktivitas = 0;
        const customCounts = {};

        daysToInclude.forEach(day => {
            const dateStr = getDateForRamadanDay(day);
            const dayActs = activities[dateStr] || {};

            sholat += DEFAULT_PRAYERS.filter(p => dayActs[p.id]?.completed).length;
            sunnah += DEFAULT_SUNNAH.filter(s => dayActs[s.id]?.completed).length;
            aktivitas += DEFAULT_ACTIVITIES.filter(a => dayActs[a.id]?.completed).length;

            // Count each custom activity individually
            customActivities.forEach(ca => {
                if (dayActs[ca.id]?.completed) {
                    if (!customCounts[ca.id]) {
                        customCounts[ca.id] = { name: `${ca.icon} ${ca.name}`, value: 0 };
                    }
                    customCounts[ca.id].value++;
                }
            });
        });

        const result = [
            { name: 'Sholat Wajib', value: sholat },
            { name: 'Sholat Sunnah', value: sunnah },
            { name: 'Aktivitas Ramadhan', value: aktivitas },
            ...Object.values(customCounts),
        ].filter(item => item.value > 0);

        // Assign colors
        return result.map((item, i) => ({
            ...item,
            color: PIE_COLORS[i % PIE_COLORS.length],
        }));
    }, [daysToInclude, activities, getDateForRamadanDay, DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES, customActivities]);

    // Activity ranking
    const activityRanking = useMemo(() => {
        const counts = {};

        daysToInclude.forEach(day => {
            const dateStr = getDateForRamadanDay(day);
            const dayActs = activities[dateStr] || {};

            allActivityDefs.forEach(act => {
                if (dayActs[act.id]?.completed) {
                    if (!counts[act.id]) {
                        counts[act.id] = { ...act, count: 0 };
                    }
                    counts[act.id].count++;
                }
            });
        });

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [daysToInclude, activities, getDateForRamadanDay, allActivityDefs]);

    // Statistics
    const stats = useMemo(() => {
        const totalPossible = daysToInclude.length * allActivityDefs.length;
        const totalCompleted = dailyData.reduce((sum, d) => sum + d.total, 0);
        const avgPerDay = daysToInclude.length > 0 ? Math.round(totalCompleted / daysToInclude.length * 10) / 10 : 0;
        const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        const bestDay = dailyData.reduce((best, d) => d.total > best.total ? d : best, { total: 0, dayNum: 0 });

        return {
            totalCompleted,
            avgPerDay,
            completionRate,
            bestDay: bestDay.dayNum,
            daysTracked: daysToInclude.length,
        };
    }, [dailyData, daysToInclude, allActivityDefs]);

    // Single day detail: list all activities with status
    const singleDayDetail = useMemo(() => {
        if (filterMode !== 'day') return null;
        const dateStr = getDateForRamadanDay(selectedDay);
        const dayActs = activities[dateStr] || {};

        // Default activities always show
        const defaults = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];
        // Custom activities only show if they were added for this day
        const addedCustom = customActivities.filter(ca => dayActs[ca.id]?.added);
        const allForDay = [...defaults, ...addedCustom];

        return allForDay.map(act => ({
            ...act,
            completed: dayActs[act.id]?.completed || false,
        }));
    }, [filterMode, selectedDay, activities, getDateForRamadanDay, DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES, customActivities]);

    // Tooltip style
    const tooltipStyle = {
        contentStyle: {
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
        },
        labelStyle: { color: '#fff' },
    };

    return (
        <main className="main-content" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '16px' }}>
                📊 Rekap Aktivitas
            </h1>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
            }}>
                {[
                    { value: 'day', label: 'Per Hari' },
                    { value: '7days', label: '7 Hari' },
                    { value: '30days', label: '30 Hari' },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilterMode(tab.value)}
                        style={{
                            flex: 1,
                            padding: '10px 8px',
                            background: filterMode === tab.value ? 'var(--primary)' : 'var(--dark-800)',
                            color: filterMode === tab.value ? 'white' : 'var(--dark-300)',
                            border: filterMode === tab.value ? 'none' : '1px solid var(--dark-700)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Day Picker (visible in 'day' and '7days' mode) */}
            {(filterMode === 'day' || filterMode === '7days') && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '10px',
                    }}>
                        <button
                            onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                            disabled={selectedDay <= 1}
                            style={{
                                width: '36px',
                                height: '36px',
                                background: 'var(--dark-700)',
                                border: '1px solid var(--dark-600)',
                                borderRadius: 'var(--radius-md)',
                                color: selectedDay <= 1 ? 'var(--dark-600)' : 'white',
                                fontSize: '16px',
                                cursor: selectedDay <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ◀
                        </button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--dark-100)' }}>
                                {filterMode === 'day'
                                    ? `Ramadhan Hari ke-${selectedDay}`
                                    : `Hari ${Math.max(1, selectedDay - 6)} – ${selectedDay}`
                                }
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                                {filterMode === 'day'
                                    ? getDateForRamadanDay(selectedDay)
                                    : `${daysToInclude.length} hari`
                                }
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDay(d => Math.min(30, d + 1))}
                            disabled={selectedDay >= 30}
                            style={{
                                width: '36px',
                                height: '36px',
                                background: 'var(--dark-700)',
                                border: '1px solid var(--dark-600)',
                                borderRadius: 'var(--radius-md)',
                                color: selectedDay >= 30 ? 'var(--dark-600)' : 'white',
                                fontSize: '16px',
                                cursor: selectedDay >= 30 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ▶
                        </button>
                    </div>

                    {/* Quick Day Selector (scrollable pills) */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none',
                    }}>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    minWidth: '36px',
                                    height: '32px',
                                    background: selectedDay === day
                                        ? 'var(--primary)'
                                        : (filterMode === '7days' && daysToInclude.includes(day))
                                            ? 'rgba(59, 130, 246, 0.2)'
                                            : 'var(--dark-800)',
                                    color: selectedDay === day
                                        ? 'white'
                                        : (filterMode === '7days' && daysToInclude.includes(day))
                                            ? 'var(--primary)'
                                            : 'var(--dark-400)',
                                    border: selectedDay === day
                                        ? 'none'
                                        : '1px solid var(--dark-700)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '12px',
                                    fontWeight: selectedDay === day ? '700' : '500',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                }}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '20px',
            }}>
                <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>
                        {stats.totalCompleted}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Total Selesai</div>
                </div>
                <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '26px', fontWeight: '700', color: '#f59e0b' }}>
                        {stats.completionRate}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Pencapaian</div>
                </div>
                {filterMode !== 'day' && (
                    <>
                        <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: '26px', fontWeight: '700', color: '#3b82f6' }}>
                                {stats.avgPerDay}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Rata-rata/Hari</div>
                        </div>
                        <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: '26px', fontWeight: '700', color: '#ec4899' }}>
                                {stats.bestDay > 0 ? `H${stats.bestDay}` : '-'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Hari Terbaik</div>
                        </div>
                    </>
                )}
            </div>

            {/* SINGLE DAY VIEW: Activity List */}
            {filterMode === 'day' && singleDayDetail && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        📝 Detail Aktivitas Hari ke-{selectedDay}
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px',
                    }}>
                        {[
                            { label: '🕌 Sholat Wajib', items: singleDayDetail.filter(a => DEFAULT_PRAYERS.some(p => p.id === a.id)) },
                            { label: '⭐ Sholat Sunnah', items: singleDayDetail.filter(a => DEFAULT_SUNNAH.some(s => s.id === a.id)) },
                            { label: '☪️ Aktivitas Ramadhan', items: singleDayDetail.filter(a => DEFAULT_ACTIVITIES.some(act => act.id === a.id)) },
                            { label: '📋 Lainnya', items: singleDayDetail.filter(a => a.isCustom) },
                        ].filter(group => group.items.length > 0).map(group => (
                            <div key={group.label} style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '8px' }}>
                                    {group.label}
                                </div>
                                {group.items.map(act => (
                                    <div
                                        key={act.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            marginBottom: '4px',
                                            background: act.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--dark-700)',
                                            borderRadius: 'var(--radius-md)',
                                            borderLeft: `3px solid ${act.completed ? '#10b981' : 'var(--dark-600)'}`,
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>{act.icon}</span>
                                        <span style={{
                                            flex: 1,
                                            fontSize: '13px',
                                            color: act.completed ? '#10b981' : 'var(--dark-200)',
                                            fontWeight: '500',
                                        }}>
                                            {act.name}
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                        }}>
                                            {act.completed ? '✅' : '⬜'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SINGLE DAY VIEW: Category Pie Chart */}
            {filterMode === 'day' && categorySummary.length > 0 && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        🥧 Distribusi Aktivitas
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                    }}>
                        <div style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categorySummary}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categorySummary.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        {...tooltipStyle}
                                        formatter={(value, name) => [`${value}x`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom legend */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px 14px',
                            justifyContent: 'center',
                            marginTop: '12px',
                        }}>
                            {categorySummary.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '11px',
                                    color: 'var(--dark-300)',
                                }}>
                                    <span style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '3px',
                                        background: item.color,
                                        flexShrink: 0,
                                    }} />
                                    {item.name} ({item.value})
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* MULTI-DAY VIEW: Progress Chart */}
            {filterMode !== 'day' && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        📈 Tren Progress
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                        height: '240px',
                    }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} unit="%" />
                                <Tooltip
                                    {...tooltipStyle}
                                    formatter={(value) => [`${value}%`, 'Pencapaian']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="percentage"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorProgress)"
                                    name="Pencapaian"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {/* MULTI-DAY VIEW: Stacked Bar Chart */}
            {filterMode !== 'day' && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        📊 Breakdown per Hari
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                        height: '280px',
                    }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="sholat" stackId="a" fill="#10b981" name="Sholat Wajib" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="sunnah" stackId="a" fill="#f59e0b" name="Sunnah" />
                                <Bar dataKey="aktivitas" stackId="a" fill="#3b82f6" name="Aktivitas" />
                                <Bar dataKey="custom" stackId="a" fill="#8b5cf6" name="Lainnya" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {/* MULTI-DAY VIEW: Category Pie Chart */}
            {filterMode !== 'day' && categorySummary.length > 0 && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        🥧 Distribusi Kategori
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                    }}>
                        <div style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categorySummary}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categorySummary.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        {...tooltipStyle}
                                        formatter={(value, name) => [`${value}x`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom legend */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px 14px',
                            justifyContent: 'center',
                            marginTop: '12px',
                        }}>
                            {categorySummary.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '11px',
                                    color: 'var(--dark-300)',
                                }}>
                                    <span style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '3px',
                                        background: item.color,
                                        flexShrink: 0,
                                    }} />
                                    {item.name} ({item.value})
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Activity Ranking */}
            <section style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                    🏆 Aktivitas {filterMode === 'day' ? 'Tercatat' : 'Terbanyak'}
                </h2>
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px',
                }}>
                    {activityRanking.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activityRanking.map((act, index) => {
                                const maxCount = activityRanking[0]?.count || 1;
                                const barWidth = (act.count / maxCount) * 100;

                                return (
                                    <div
                                        key={act.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: 'var(--dark-700)',
                                            borderRadius: 'var(--radius-md)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* Background bar */}
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${barWidth}%`,
                                            background: `${RANK_COLORS[index % RANK_COLORS.length]}15`,
                                            transition: 'width 0.5s ease',
                                        }} />
                                        <span style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: 'var(--radius-full)',
                                            background: index < 3 ? RANK_COLORS[index] : 'var(--dark-600)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: 'white',
                                            position: 'relative',
                                            zIndex: 1,
                                            flexShrink: 0,
                                        }}>
                                            {index + 1}
                                        </span>
                                        <span style={{ fontSize: '18px', position: 'relative', zIndex: 1 }}>{act.icon}</span>
                                        <span style={{ flex: 1, color: 'var(--dark-100)', fontSize: '13px', position: 'relative', zIndex: 1 }}>
                                            {act.name}
                                        </span>
                                        <span style={{
                                            padding: '3px 8px',
                                            background: 'var(--dark-600)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '11px',
                                            color: RANK_COLORS[index % RANK_COLORS.length],
                                            fontWeight: '600',
                                            position: 'relative',
                                            zIndex: 1,
                                        }}>
                                            {act.count}×
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '24px',
                            color: 'var(--dark-400)',
                            fontSize: '13px',
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                            Belum ada aktivitas tercatat
                        </div>
                    )}
                </div>
            </section>

            {/* Quran Progress */}
            <section>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                    📖 Progress Tadarus
                </h2>
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📖</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
                        Juz {quranProgress.currentJuz}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--dark-400)', marginTop: '4px' }}>
                        {quranProgress.pagesRead} halaman dibaca
                    </div>
                    <div style={{
                        marginTop: '14px',
                        height: '8px',
                        background: 'var(--dark-600)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${(quranProgress.currentJuz / 30) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '6px' }}>
                        {Math.round((quranProgress.currentJuz / 30) * 100)}% dari 30 Juz
                    </div>
                </div>
            </section>
        </main>
    );
}
