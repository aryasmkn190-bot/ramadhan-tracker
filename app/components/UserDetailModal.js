'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import QURAN_SURAHS, { TOTAL_AYAT } from '../data/quranSurahs';
import DailyClockChart from './DailyClockChart';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { GROUP_COLORS } from '../data/userGroups';

const RAMADAN_START = new Date('2026-02-19');
const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#ef4444', '#06b6d4', '#a78bfa', '#fb923c', '#34d399', '#84cc16', '#22d3ee', '#e879f9', '#facc15', '#2dd4bf', '#818cf8', '#f472b6', '#c084fc'];

const DEFAULT_PRAYERS = [
    { id: 'subuh', name: 'Sholat Subuh', icon: '🌅', category: 'wajib' },
    { id: 'dzuhur', name: 'Sholat Dzuhur', icon: '☀️', category: 'wajib' },
    { id: 'ashar', name: 'Sholat Ashar', icon: '🌤️', category: 'wajib' },
    { id: 'maghrib', name: 'Sholat Maghrib', icon: '🌅', category: 'wajib' },
    { id: 'isya', name: 'Sholat Isya', icon: '🌙', category: 'wajib' },
];
const DEFAULT_SUNNAH = [
    { id: 'tahajud', name: 'Sholat Tahajud', icon: '🌌', category: 'sunnah' },
    { id: 'dhuha', name: 'Sholat Dhuha', icon: '🌞', category: 'sunnah' },
    { id: 'tarawih', name: 'Sholat Tarawih', icon: '🕌', category: 'sunnah' },
    { id: 'witir', name: 'Sholat Witir', icon: '⭐', category: 'sunnah' },
];
const DEFAULT_ACTIVITIES = [
    { id: 'sahur', name: 'Sahur', icon: '🍽️', category: 'puasa' },
    { id: 'puasa', name: 'Puasa', icon: '☪️', category: 'puasa' },
    { id: 'buka', name: 'Buka Puasa', icon: '🌙', category: 'puasa' },
    { id: 'dzikir', name: 'Dzikir Pagi/Petang', icon: '📿', category: 'amal' },
    { id: 'sedekah', name: 'Sedekah', icon: '💝', category: 'amal' },
    { id: 'tadarus', name: 'Tadarus Al-Quran', icon: '📖', category: 'quran' },
];

const getDateForRamadanDay = (day) => {
    const date = new Date(RAMADAN_START);
    date.setDate(date.getDate() + day - 1);
    return date.toISOString().split('T')[0];
};

export default function UserDetailModal({ user, onClose, adminQuranData, adminActivitiesData }) {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState({});
    const [quranReadings, setQuranReadings] = useState([]);
    const [customActivities, setCustomActivities] = useState([]);
    const [filterMode, setFilterMode] = useState('day');
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date();
        const ds = Math.ceil((today - RAMADAN_START) / (1000 * 60 * 60 * 24));
        return Math.min(Math.max(ds + 1, 1), 30);
    });

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            setLoading(true);
            try {
                // If admin data is passed in, use it directly (avoids extra requests)
                if (adminQuranData && adminActivitiesData) {
                    // Process activities from admin data (filtered by user)
                    // Admin activities only have limited fields, so fetch full data for time details
                    // But we can use the quran data directly
                    const [actRes, cRes] = await Promise.all([
                        supabase.from('daily_activities').select('*').eq('user_id', user.id),
                        supabase.from('custom_activities').select('*').eq('is_active', true),
                    ]);

                    if (actRes.data) {
                        const byDate = {};
                        actRes.data.forEach(a => {
                            if (!byDate[a.activity_date]) byDate[a.activity_date] = {};
                            byDate[a.activity_date][a.activity_id] = {
                                completed: a.completed, startTime: a.start_time, endTime: a.end_time,
                                completedAt: a.completed_at, added: a.added || false,
                                name: a.activity_name, category: a.activity_category,
                            };
                        });
                        setActivities(byDate);
                    }

                    // Use admin quran data filtered by user
                    const userQuran = adminQuranData.filter(q => q.user_id === user.id);
                    setQuranReadings(userQuran.map(r => ({
                        id: r.id || `${r.surah_number}_${r.start_ayat}_${r.end_ayat}`,
                        readDate: r.read_date,
                        surahNumber: r.surah_number,
                        startAyat: r.start_ayat,
                        endAyat: r.end_ayat,
                    })));

                    if (cRes.data) {
                        const ug = user.user_group;
                        const filtered = cRes.data.filter(i => {
                            if (!i.target_groups || i.target_groups.length === 0) return true;
                            return ug && i.target_groups.includes(ug);
                        });
                        setCustomActivities(filtered.map(i => ({
                            id: `custom_${i.id}`, name: i.name, icon: i.icon || '📌', category: i.category, isCustom: true,
                        })));
                    }
                } else {
                    // Self-fetch mode (standalone usage)
                    const [actRes, qRes, cRes] = await Promise.all([
                        supabase.from('daily_activities').select('*').eq('user_id', user.id),
                        supabase.from('quran_readings').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
                        supabase.from('custom_activities').select('*').eq('is_active', true),
                    ]);

                    if (actRes.data) {
                        const byDate = {};
                        actRes.data.forEach(a => {
                            if (!byDate[a.activity_date]) byDate[a.activity_date] = {};
                            byDate[a.activity_date][a.activity_id] = {
                                completed: a.completed, startTime: a.start_time, endTime: a.end_time,
                                completedAt: a.completed_at, added: a.added || false,
                                name: a.activity_name, category: a.activity_category,
                            };
                        });
                        setActivities(byDate);
                    }

                    if (qRes.data) {
                        setQuranReadings(qRes.data.map(r => ({
                            id: r.id, readDate: r.read_date, surahNumber: r.surah_number,
                            startAyat: r.start_ayat, endAyat: r.end_ayat,
                        })));
                    }

                    if (cRes.data) {
                        const ug = user.user_group;
                        const filtered = cRes.data.filter(i => {
                            if (!i.target_groups || i.target_groups.length === 0) return true;
                            return ug && i.target_groups.includes(ug);
                        });
                        setCustomActivities(filtered.map(i => ({
                            id: `custom_${i.id}`, name: i.name, icon: i.icon || '📌', category: i.category, isCustom: true,
                        })));
                    }
                }
            } catch (e) { console.error('Error fetching user data:', e); }
            finally { setLoading(false); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Days to include
    const daysToInclude = useMemo(() => {
        if (filterMode === 'day') return [selectedDay];
        if (filterMode === '7days') {
            const end = Math.min(selectedDay, 30);
            const start = Math.max(1, end - 6);
            const d = []; for (let i = start; i <= end; i++) d.push(i); return d;
        }
        const d = []; for (let i = 1; i <= 30; i++) d.push(i); return d;
    }, [filterMode, selectedDay]);

    const allActivityDefs = useMemo(() =>
        [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities],
        [customActivities]
    );

    // Daily data
    const dailyData = useMemo(() => daysToInclude.map(day => {
        const dateStr = getDateForRamadanDay(day);
        const dayActs = activities[dateStr] || {};
        const pc = DEFAULT_PRAYERS.filter(p => dayActs[p.id]?.completed).length;
        const sc = DEFAULT_SUNNAH.filter(s => dayActs[s.id]?.completed).length;
        const ac = DEFAULT_ACTIVITIES.filter(a => dayActs[a.id]?.completed).length;
        const cc = customActivities.filter(c => dayActs[c.id]?.completed).length;
        const total = pc + sc + ac + cc;
        const max = allActivityDefs.length;
        return { day: `H${day}`, dayNum: day, sholat: pc, sunnah: sc, aktivitas: ac, custom: cc, total, percentage: max > 0 ? Math.round((total / max) * 100) : 0 };
    }), [daysToInclude, activities, allActivityDefs, customActivities]);

    // Category summary for pie
    const categorySummary = useMemo(() => {
        const counts = {};
        daysToInclude.forEach(day => {
            const dayActs = activities[getDateForRamadanDay(day)] || {};
            allActivityDefs.forEach(act => {
                if (dayActs[act.id]?.completed) {
                    if (!counts[act.id]) counts[act.id] = { name: `${act.icon} ${act.name}`, value: 0 };
                    counts[act.id].value++;
                }
            });
        });
        return Object.values(counts).filter(i => i.value > 0).sort((a, b) => b.value - a.value)
            .map((item, i) => ({ ...item, color: PIE_COLORS[i % PIE_COLORS.length] }));
    }, [daysToInclude, activities, allActivityDefs]);

    // Stats
    const stats = useMemo(() => {
        const totalPossible = daysToInclude.length * allActivityDefs.length;
        const totalCompleted = dailyData.reduce((s, d) => s + d.total, 0);
        const avg = daysToInclude.length > 0 ? Math.round(totalCompleted / daysToInclude.length * 10) / 10 : 0;
        const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        const best = dailyData.reduce((b, d) => d.total > b.total ? d : b, { total: 0, dayNum: 0 });
        return { totalCompleted, avgPerDay: avg, completionRate: rate, bestDay: best.dayNum };
    }, [dailyData, daysToInclude, allActivityDefs]);

    // Single day detail for clock chart
    const singleDayDetail = useMemo(() => {
        if (filterMode !== 'day') return null;
        const dateStr = getDateForRamadanDay(selectedDay);
        const dayActs = activities[dateStr] || {};
        const defaults = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES];
        const addedCustom = customActivities.filter(ca => dayActs[ca.id]?.added);
        const allForDay = [...defaults, ...addedCustom];
        const result = allForDay.map(act => ({
            ...act, completed: dayActs[act.id]?.completed || false,
            timeData: dayActs[act.id] ? { startTime: dayActs[act.id].startTime || null, endTime: dayActs[act.id].endTime || null } : null,
        }));
        Object.entries(dayActs).forEach(([key, data]) => {
            if (key.endsWith('__spillover') && data?.completed) {
                const origId = key.replace('__spillover', '');
                const allDef = [...DEFAULT_PRAYERS, ...DEFAULT_SUNNAH, ...DEFAULT_ACTIVITIES, ...customActivities];
                const orig = allDef.find(a => a.id === origId);
                result.push({
                    id: key, name: `${orig?.name || origId} (lanjutan)`, icon: orig?.icon || '🔄',
                    category: orig?.category || 'other', completed: true,
                    timeData: { startTime: data.startTime || null, endTime: data.endTime || null }, isSpillover: true,
                });
            }
        });
        return result;
    }, [filterMode, selectedDay, activities, customActivities]);

    // Duration summary for multi-day
    const activityHoursSummary = useMemo(() => {
        if (filterMode === 'day') return [];
        const parseT = t => { if (!t) return null; const m = t.match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null; };
        const calcM = (s, e) => { const sm = parseT(s), em = parseT(e); if (sm === null || em === null) return 0; return em >= sm ? em - sm : (1440 - sm) + em; };
        const hm = {};
        daysToInclude.forEach(day => {
            const dayActs = activities[getDateForRamadanDay(day)] || {};
            Object.entries(dayActs).forEach(([actId, data]) => {
                if (!data?.completed || !data.startTime) return;
                let mins = 0;
                if (data.endTime === '__multi__') {
                    try { JSON.parse(data.startTime).forEach(s => { if (s.start && s.end) mins += calcM(s.start, s.end); }); } catch { }
                } else if (data.endTime) { mins = calcM(data.startTime, data.endTime); }
                if (mins <= 0) return;
                const baseId = actId.endsWith('__spillover') ? actId.replace('__spillover', '') : actId;
                const def = allActivityDefs.find(a => a.id === baseId);
                let name = def?.name || data.name?.replace(' (lanjutan)', '') || baseId;
                const icon = def?.icon || '📌';
                if (!hm[baseId]) hm[baseId] = { name, icon, totalMinutes: 0, dayCount: 0 };
                hm[baseId].totalMinutes += mins;
                if (!actId.endsWith('__spillover')) hm[baseId].dayCount++;
            });
        });
        return Object.values(hm).sort((a, b) => b.totalMinutes - a.totalMinutes).map(i => ({ ...i, totalHours: i.totalMinutes / 60 }));
    }, [filterMode, daysToInclude, activities, allActivityDefs]);

    // Quran progress
    const quranGlobalProgress = useMemo(() => {
        const readSet = new Set();
        quranReadings.forEach(r => { for (let a = r.startAyat; a <= r.endAyat; a++) readSet.add(`${r.surahNumber}:${a}`); });
        const totalRead = readSet.size;
        const surahProgress = QURAN_SURAHS.map(s => {
            let read = 0;
            for (let a = 1; a <= s.totalAyat; a++) { if (readSet.has(`${s.number}:${a}`)) read++; }
            return { number: s.number, name: s.name, totalAyat: s.totalAyat, readAyat: read, percentage: Math.round((read / s.totalAyat) * 100) };
        });
        const completedSurahs = surahProgress.filter(s => s.percentage === 100).length;
        return { totalRead, totalAyat: TOTAL_AYAT, percentage: Math.round((totalRead / TOTAL_AYAT) * 100), completedSurahs, surahProgress };
    }, [quranReadings]);

    const tooltipStyle = {
        contentStyle: { background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' },
        labelStyle: { color: '#f3f4f6', fontWeight: 600, marginBottom: '4px' },
        itemStyle: { color: '#f3f4f6' },
        cursor: { fill: 'rgba(255, 255, 255, 0.05)' },
    };

    const gc = GROUP_COLORS[user.user_group];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)' }}>
            <div style={{ width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column', background: 'var(--dark-900, #0f1117)', position: 'relative' }}>
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dark-700)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <button onClick={onClose} style={{ width: '36px', height: '36px', background: 'var(--dark-700)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--dark-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || 'User'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            {gc && <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text }}>{user.user_group}</span>}
                            <span style={{ fontSize: '11px', color: 'var(--dark-400)' }}>{user.email}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dark-400)' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                            Memuat data...
                        </div>
                    ) : (
                        <>
                            {/* Filter Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                {[{ value: 'day', label: 'Per Hari' }, { value: '7days', label: '7 Hari' }, { value: '30days', label: '30 Hari' }].map(tab => (
                                    <button key={tab.value} onClick={() => setFilterMode(tab.value)} style={{
                                        flex: 1, padding: '10px 8px', background: filterMode === tab.value ? 'var(--primary)' : 'var(--dark-800)',
                                        color: filterMode === tab.value ? 'white' : 'var(--dark-300)', border: filterMode === tab.value ? 'none' : '1px solid var(--dark-700)',
                                        borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                                    }}>{tab.label}</button>
                                ))}
                            </div>

                            {/* Day Picker */}
                            {(filterMode === 'day' || filterMode === '7days') && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <button onClick={() => setSelectedDay(d => Math.max(1, d - 1))} disabled={selectedDay <= 1}
                                            style={{ width: '36px', height: '36px', background: 'var(--dark-700)', border: '1px solid var(--dark-600)', borderRadius: 'var(--radius-md)', color: selectedDay <= 1 ? 'var(--dark-600)' : 'white', fontSize: '16px', cursor: selectedDay <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--dark-100)' }}>
                                                {filterMode === 'day' ? `Ramadhan Hari ke-${selectedDay}` : `Hari ${Math.max(1, selectedDay - 6)} – ${selectedDay}`}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                                                {filterMode === 'day' ? getDateForRamadanDay(selectedDay) : `${daysToInclude.length} hari`}
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedDay(d => Math.min(30, d + 1))} disabled={selectedDay >= 30}
                                            style={{ width: '36px', height: '36px', background: 'var(--dark-700)', border: '1px solid var(--dark-600)', borderRadius: 'var(--radius-md)', color: selectedDay >= 30 ? 'var(--dark-600)' : 'white', fontSize: '16px', cursor: selectedDay >= 30 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                                            <button key={day} onClick={() => setSelectedDay(day)} style={{
                                                minWidth: '36px', height: '32px',
                                                background: selectedDay === day ? 'var(--primary)' : (filterMode === '7days' && daysToInclude.includes(day)) ? 'rgba(59, 130, 246, 0.2)' : 'var(--dark-800)',
                                                color: selectedDay === day ? 'white' : (filterMode === '7days' && daysToInclude.includes(day)) ? 'var(--primary)' : 'var(--dark-400)',
                                                border: selectedDay === day ? 'none' : '1px solid var(--dark-700)', borderRadius: 'var(--radius-full)',
                                                fontSize: '12px', fontWeight: selectedDay === day ? '700' : '500', cursor: 'pointer', flexShrink: 0,
                                            }}>{day}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{stats.totalCompleted}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Total Selesai</div>
                                </div>
                                <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ fontSize: '26px', fontWeight: '700', color: '#f59e0b' }}>{stats.completionRate}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Pencapaian</div>
                                </div>
                                {filterMode !== 'day' && (<>
                                    <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ fontSize: '26px', fontWeight: '700', color: '#3b82f6' }}>{stats.avgPerDay}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Rata-rata/Hari</div>
                                    </div>
                                    <div style={{ background: 'var(--dark-800)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ fontSize: '26px', fontWeight: '700', color: '#ec4899' }}>{stats.bestDay > 0 ? `H${stats.bestDay}` : '-'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>Hari Terbaik</div>
                                    </div>
                                </>)}
                            </div>

                            {/* SINGLE DAY: Clock Chart */}
                            {filterMode === 'day' && singleDayDetail && (
                                <Section title="🕐 Distribusi Aktivitas 24 Jam">
                                    <DailyClockChart dayActivities={singleDayDetail} />
                                </Section>
                            )}

                            {/* MULTI-DAY: Progress Trend */}
                            {filterMode !== 'day' && (
                                <section style={{ marginBottom: '20px' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>📈 Tren Progress</h2>
                                    <div style={{ background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '16px', height: '240px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyData}>
                                                <defs>
                                                    <linearGradient id="udmColorProgress" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} unit="%" />
                                                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Pencapaian']} />
                                                <Area type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#udmColorProgress)" name="Pencapaian" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            )}

                            {/* MULTI-DAY: Pie Chart */}
                            {filterMode !== 'day' && categorySummary.length > 0 && (
                                <Section title="🥧 Distribusi Aktivitas">
                                    <div style={{ height: '220px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categorySummary} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                                                    {categorySummary.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                </Pie>
                                                <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v}x`, n]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', justifyContent: 'center', marginTop: '12px' }}>
                                        {categorySummary.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: item.color }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, flexShrink: 0 }} />
                                                {item.name} ({item.value})
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* MULTI-DAY: Duration Summary */}
                            {filterMode !== 'day' && activityHoursSummary.length > 0 && (
                                <Section title="⏱️ Rekap Durasi per Aktivitas">
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginBottom: '14px', textAlign: 'center' }}>
                                        Total durasi aktivitas yang tercatat selama {daysToInclude.length} hari
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {activityHoursSummary.map((item, i) => {
                                            const maxH = activityHoursSummary[0]?.totalHours || 1;
                                            const barW = Math.max((item.totalHours / maxH) * 100, 8);
                                            const h = Math.floor(item.totalHours), m = Math.round((item.totalHours - h) * 60);
                                            const dur = h > 0 && m > 0 ? `${h}j ${m}m` : h > 0 ? `${h}j` : `${m}m`;
                                            const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#e879f9', '#22d3ee', '#facc15', '#fb923c'];
                                            const c = colors[i % colors.length];
                                            return (
                                                <div key={i}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--dark-100)' }}>
                                                            <span style={{ fontSize: '16px' }}>{item.icon}</span>{item.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                                                            <span style={{ color: 'var(--dark-400)', fontSize: '11px' }}>{item.dayCount} hari</span>
                                                            <span style={{ fontWeight: '700', color: c, fontFamily: 'monospace', fontSize: '13px' }}>{dur}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'var(--dark-600)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                                        <div style={{ width: `${barW}%`, height: '100%', background: `linear-gradient(90deg, ${c}, ${c}99)`, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>
                            )}


                            {/* Quran Progress */}
                            <QuranSection quranGlobalProgress={quranGlobalProgress} quranReadings={quranReadings} daysToInclude={daysToInclude} filterMode={filterMode} selectedDay={selectedDay} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Reusable section wrapper
function Section({ title, children }) {
    return (
        <section style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>{title}</h2>
            <div style={{ background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>{children}</div>
        </section>
    );
}

// Quran Progress Section
function QuranSection({ quranGlobalProgress, quranReadings, daysToInclude, filterMode, selectedDay }) {
    const selectedDates = daysToInclude.map(d => getDateForRamadanDay(d));
    const filteredReadings = quranReadings.filter(r => selectedDates.includes(r.readDate));

    const surahMap = {};
    filteredReadings.forEach(r => {
        if (!surahMap[r.surahNumber]) {
            const info = QURAN_SURAHS.find(s => s.number === r.surahNumber);
            surahMap[r.surahNumber] = { number: r.surahNumber, name: info?.name || `Surat ${r.surahNumber}`, totalAyat: info?.totalAyat || 0, ranges: [] };
        }
        surahMap[r.surahNumber].ranges.push({ start: r.startAyat, end: r.endAyat });
    });
    const surahList = Object.values(surahMap).sort((a, b) => a.number - b.number);

    const periodAyatSet = new Set();
    filteredReadings.forEach(r => { for (let a = r.startAyat; a <= r.endAyat; a++) periodAyatSet.add(`${r.surahNumber}:${a}`); });

    const periodLabel = filterMode === 'day' ? `Hari ke-${selectedDay}` : filterMode === '7days' ? `7 Hari (Hari ${daysToInclude[0]}-${daysToInclude[daysToInclude.length - 1]})` : '30 Hari';

    return (
        <section>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-200)', marginBottom: '10px' }}>📖 Progress Tadarus</h2>

            {/* Global Progress */}
            <div style={{ background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--dark-400)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress Keseluruhan</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{quranGlobalProgress.percentage}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>{quranGlobalProgress.totalRead.toLocaleString()} / {quranGlobalProgress.totalAyat.toLocaleString()} ayat</div>
                        <div style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '2px' }}>{quranGlobalProgress.completedSurahs}/114 surat selesai</div>
                    </div>
                </div>
                <div style={{ height: '6px', background: 'var(--dark-600)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(quranGlobalProgress.percentage, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                </div>
            </div>

            {/* Period Detail */}
            <div style={{ background: 'var(--dark-800)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: surahList.length > 0 ? '14px' : '0', paddingBottom: surahList.length > 0 ? '12px' : '0', borderBottom: surahList.length > 0 ? '1px solid var(--dark-700)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>📅</span>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-200)' }}>Bacaan {periodLabel}</div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>{filteredReadings.length} sesi • {periodAyatSet.size} ayat unik</div>
                        </div>
                    </div>
                </div>
                {surahList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--dark-500)', fontSize: '12px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>📖</div>Belum ada bacaan pada periode ini
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {surahList.map(surah => {
                            const gsp = quranGlobalProgress.surahProgress.find(s => s.number === surah.number);
                            const pct = gsp?.percentage || 0;
                            const sorted = [...surah.ranges].sort((a, b) => a.start - b.start);
                            const merged = [];
                            sorted.forEach(r => { const last = merged[merged.length - 1]; if (last && r.start <= last.end + 1) { last.end = Math.max(last.end, r.end); } else { merged.push({ start: r.start, end: r.end }); } });
                            return (
                                <div key={surah.number} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--dark-700)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', background: pct === 100 ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--dark-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: pct === 100 ? 'white' : 'var(--dark-300)' }}>{pct === 100 ? '✓' : surah.number}</div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-100)' }}>{surah.name}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--dark-400)' }}>{surah.totalAyat} ayat</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: pct === 100 ? '#10b981' : '#3b82f6', background: pct === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>{pct}%</div>
                                    </div>
                                    <div style={{ height: '4px', background: 'var(--dark-600)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {merged.map((r, idx) => (
                                            <span key={idx} style={{ fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}>
                                                {r.start === r.end ? `Ayat ${r.start}` : `Ayat ${r.start}-${r.end}`}
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
}
