'use client';

import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import QURAN_SURAHS from '../data/quranSurahs';
import DailyClockChart from './DailyClockChart';
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
import DailyClockChart from './DailyClockChart';

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
        quranGlobalProgress,
        quranReadings,
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

    // Per-activity total hours for multi-day view
    const activityHoursSummary = useMemo(() => {
        if (filterMode === 'day') return [];

        const parseTimeToMin = (t) => {
            if (!t) return null;
            const m = t.match(/(\d{1,2}):(\d{2})/);
            if (!m) return null;
            return parseInt(m[1]) * 60 + parseInt(m[2]);
        };

        const calcSessionMinutes = (start, end) => {
            const sm = parseTimeToMin(start);
            const em = parseTimeToMin(end);
            if (sm === null || em === null) return 0;
            // Handle overnight
            return em >= sm ? em - sm : (24 * 60 - sm) + em;
        };

        const hourMap = {}; // { actId: { name, icon, totalMinutes, dayCount } }

        daysToInclude.forEach(day => {
            const dateStr = getDateForRamadanDay(day);
            const dayActs = activities[dateStr] || {};

            Object.entries(dayActs).forEach(([actId, data]) => {
                if (!data?.completed || !data.startTime) return;

                let minutes = 0;
                if (data.endTime === '__multi__') {
                    try {
                        const sessions = JSON.parse(data.startTime);
                        sessions.forEach(s => {
                            if (s.start && s.end) minutes += calcSessionMinutes(s.start, s.end);
                        });
                    } catch { /* skip */ }
                } else if (data.endTime) {
                    minutes = calcSessionMinutes(data.startTime, data.endTime);
                }

                if (minutes <= 0) return;

                // Merge spillover into parent activity
                const baseId = actId.endsWith('__spillover')
                    ? actId.replace('__spillover', '')
                    : actId;

                const allDefs = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
                const actDef = allDefs.find(a => a.id === baseId);

                let displayName = actDef?.name;
                if (!displayName) {
                    if (data.name) {
                        displayName = data.name.replace(' (lanjutan)', '');
                    } else {
                        displayName = baseId;
                    }
                }
                const icon = actDef?.icon || '📌';

                if (!hourMap[baseId]) {
                    hourMap[baseId] = { name: displayName, icon, totalMinutes: 0, dayCount: 0 };
                }
                hourMap[baseId].totalMinutes += minutes;
                if (!actId.endsWith('__spillover')) {
                    hourMap[baseId].dayCount++;
                }
            });
        });

        return Object.values(hourMap)
            .sort((a, b) => b.totalMinutes - a.totalMinutes)
            .map(item => ({
                ...item,
                totalHours: item.totalMinutes / 60,
            }));
    }, [filterMode, daysToInclude, activities, getDateForRamadanDay, DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES, customActivities]);

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

        const result = allForDay.map(act => ({
            ...act,
            completed: dayActs[act.id]?.completed || false,
            timeData: dayActs[act.id] ? {
                startTime: dayActs[act.id].startTime || null,
                endTime: dayActs[act.id].endTime || null,
            } : null,
        }));

        // Add spillover activities (overnight from previous day)
        Object.entries(dayActs).forEach(([key, data]) => {
            if (key.endsWith('__spillover') && data?.completed) {
                const originalId = key.replace('__spillover', '');
                const allDefault = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
                const original = allDefault.find(a => a.id === originalId);
                result.push({
                    id: key,
                    name: `${original?.name || originalId} (lanjutan)`,
                    icon: original?.icon || '🔄',
                    category: original?.category || 'other',
                    completed: true,
                    timeData: {
                        startTime: data.startTime || null,
                        endTime: data.endTime || null,
                    },
                    isSpillover: true,
                });
            }
        });

        return result;
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




            {/* SINGLE DAY VIEW: 24-Hour Clock Chart */}
            {filterMode === 'day' && singleDayDetail && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        🕐 Distribusi Aktivitas 24 Jam
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                    }}>
                        <DailyClockChart dayActivities={singleDayDetail} />
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

            {/* MULTI-DAY VIEW: Per-Activity Duration Summary */}
            {filterMode !== 'day' && activityHoursSummary.length > 0 && (
                <section style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                        ⏱️ Rekap Durasi per Aktivitas
                    </h2>
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                    }}>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--dark-400)',
                            marginBottom: '14px',
                            textAlign: 'center',
                        }}>
                            Total durasi aktivitas yang tercatat selama {daysToInclude.length} hari
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activityHoursSummary.map((item, i) => {
                                const maxHours = activityHoursSummary[0]?.totalHours || 1;
                                const barWidth = Math.max((item.totalHours / maxHours) * 100, 8);
                                const hours = Math.floor(item.totalHours);
                                const mins = Math.round((item.totalHours - hours) * 60);
                                const durationStr = hours > 0 && mins > 0
                                    ? `${hours}j ${mins}m`
                                    : hours > 0 ? `${hours}j` : `${mins}m`;
                                const barColors = [
                                    '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899',
                                    '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6',
                                    '#a855f7', '#e879f9', '#22d3ee', '#facc15', '#fb923c',
                                ];
                                const color = barColors[i % barColors.length];

                                return (
                                    <div key={item.name + i}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '4px',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: 'var(--dark-100)',
                                            }}>
                                                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                                {item.name}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                fontSize: '12px',
                                            }}>
                                                <span style={{
                                                    color: 'var(--dark-400)',
                                                    fontSize: '11px',
                                                }}>
                                                    {item.dayCount} hari
                                                </span>
                                                <span style={{
                                                    fontWeight: '700',
                                                    color: color,
                                                    fontFamily: 'monospace',
                                                    fontSize: '13px',
                                                }}>
                                                    {durationStr}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            height: '6px',
                                            background: 'var(--dark-600)',
                                            borderRadius: 'var(--radius-full)',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${barWidth}%`,
                                                height: '100%',
                                                background: `linear-gradient(90deg, ${color}, ${color}99)`,
                                                borderRadius: 'var(--radius-full)',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}




            {/* Quran Progress */}
            {(() => {
                // Filter quran readings by selected dates
                const selectedDates = daysToInclude.map(d => getDateForRamadanDay(d));
                const filteredReadings = quranReadings.filter(r => selectedDates.includes(r.readDate));

                // Group readings by surah
                const surahMap = {};
                filteredReadings.forEach(r => {
                    if (!surahMap[r.surahNumber]) {
                        const surahInfo = QURAN_SURAHS.find(s => s.number === r.surahNumber);
                        surahMap[r.surahNumber] = {
                            number: r.surahNumber,
                            name: surahInfo?.name || `Surat ${r.surahNumber}`,
                            totalAyat: surahInfo?.totalAyat || 0,
                            ranges: [],
                        };
                    }
                    surahMap[r.surahNumber].ranges.push({
                        start: r.startAyat,
                        end: r.endAyat,
                        date: r.readDate,
                    });
                });

                // Sort by surah number
                const surahList = Object.values(surahMap).sort((a, b) => a.number - b.number);

                // Count unique ayat read in this period
                const periodAyatSet = new Set();
                filteredReadings.forEach(r => {
                    for (let a = r.startAyat; a <= r.endAyat; a++) {
                        periodAyatSet.add(`${r.surahNumber}:${a}`);
                    }
                });
                const periodAyatCount = periodAyatSet.size;

                const periodLabel = filterMode === 'day'
                    ? `Hari ke-${selectedDay}`
                    : filterMode === '7days'
                        ? `7 Hari (Hari ${daysToInclude[0]}-${daysToInclude[daysToInclude.length - 1]})`
                        : '30 Hari';

                return (
                    <section>
                        <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>
                            📖 Progress Tadarus
                        </h2>

                        {/* Global Progress Card */}
                        <div style={{
                            background: 'var(--dark-800)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px',
                            marginBottom: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Progress Keseluruhan
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                                        {quranGlobalProgress.percentage}%
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                        {quranGlobalProgress.totalRead.toLocaleString()} / {quranGlobalProgress.totalAyat.toLocaleString()} ayat
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '2px' }}>
                                        {quranGlobalProgress.completedSurahs}/114 surat selesai
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                height: '6px',
                                background: 'var(--dark-600)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${Math.min(quranGlobalProgress.percentage, 100)}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>

                        {/* Period Detail Card */}
                        <div style={{
                            background: 'var(--dark-800)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: surahList.length > 0 ? '14px' : '0',
                                paddingBottom: surahList.length > 0 ? '12px' : '0',
                                borderBottom: surahList.length > 0 ? '1px solid var(--dark-700)' : 'none',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>📅</span>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-200)' }}>
                                            Bacaan {periodLabel}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                            {filteredReadings.length} sesi • {periodAyatCount} ayat unik
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {surahList.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px 0',
                                    color: 'var(--dark-500)',
                                    fontSize: '12px',
                                }}>
                                    <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>📖</div>
                                    Belum ada bacaan pada periode ini
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {surahList.map(surah => {
                                        // Get surah progress from global
                                        const globalSurahProg = quranGlobalProgress.surahProgress.find(s => s.number === surah.number);
                                        const surahPct = globalSurahProg?.percentage || 0;

                                        // Merge overlapping ranges for display
                                        const sorted = [...surah.ranges].sort((a, b) => a.start - b.start);
                                        const merged = [];
                                        sorted.forEach(range => {
                                            const last = merged[merged.length - 1];
                                            if (last && range.start <= last.end + 1) {
                                                last.end = Math.max(last.end, range.end);
                                            } else {
                                                merged.push({ start: range.start, end: range.end });
                                            }
                                        });

                                        return (
                                            <div key={surah.number} style={{
                                                background: 'var(--dark-750, rgba(255,255,255,0.03))',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '12px',
                                                border: '1px solid var(--dark-700)',
                                            }}>
                                                {/* Surah Header */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '8px',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: 'var(--radius-full)',
                                                            background: surahPct === 100
                                                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                                                : 'var(--dark-700)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            color: surahPct === 100 ? 'white' : 'var(--dark-300)',
                                                        }}>
                                                            {surahPct === 100 ? '✓' : surah.number}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-100)' }}>
                                                                {surah.name}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: 'var(--dark-400)' }}>
                                                                {surah.totalAyat} ayat
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        color: surahPct === 100 ? '#10b981' : '#3b82f6',
                                                        background: surahPct === 100
                                                            ? 'rgba(16, 185, 129, 0.1)'
                                                            : 'rgba(59, 130, 246, 0.1)',
                                                        padding: '3px 8px',
                                                        borderRadius: 'var(--radius-full)',
                                                    }}>
                                                        {surahPct}%
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div style={{
                                                    height: '4px',
                                                    background: 'var(--dark-600)',
                                                    borderRadius: '2px',
                                                    overflow: 'hidden',
                                                    marginBottom: '8px',
                                                }}>
                                                    <div style={{
                                                        width: `${surahPct}%`,
                                                        height: '100%',
                                                        background: surahPct === 100
                                                            ? 'linear-gradient(90deg, #10b981, #059669)'
                                                            : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                                        borderRadius: '2px',
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>

                                                {/* Ayat ranges */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {merged.map((range, idx) => (
                                                        <span key={idx} style={{
                                                            fontSize: '10px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: 'var(--radius-full)',
                                                            background: 'rgba(99, 102, 241, 0.1)',
                                                            color: '#818cf8',
                                                            border: '1px solid rgba(99, 102, 241, 0.15)',
                                                        }}>
                                                            {range.start === range.end
                                                                ? `Ayat ${range.start}`
                                                                : `Ayat ${range.start}-${range.end}`
                                                            }
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                );
            })()}
        </main>
    );
}
