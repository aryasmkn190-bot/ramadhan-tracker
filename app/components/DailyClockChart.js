'use client';

import { useMemo, useState } from 'react';

// Large palette of visually distinct colors for per-activity coloring
const ACTIVITY_PALETTE = [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#ef4444', // red
    '#84cc16', // lime
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7', // purple
    '#e879f9', // fuchsia
    '#22d3ee', // sky
    '#facc15', // yellow
    '#fb923c', // light orange
    '#4ade80', // light green
    '#818cf8', // indigo
    '#f472b6', // light pink
    '#2dd4bf', // mint
    '#c084fc', // light purple
];

// Deterministic hash for activity name → palette index
function activityColorIndex(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % ACTIVITY_PALETTE.length;
}

const SIZE = 520;
const CX = SIZE / 2;
const CY = SIZE / 2;

// Maps fractional hour (0-24) to SVG angle. 06:00=left(180°), 12:00=top(270°), 18:00=right(0°), 00:00=bottom(90°)
function hourToAngle(hour) {
    return ((hour / 24) * 360 + 90) % 360;
}

function polar(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx, cy, oR, iR, a1, a2) {
    let diff = ((a2 - a1) % 360 + 360) % 360;
    if (diff < 0.5) diff = 360;
    const os = polar(cx, cy, oR, a1), oe = polar(cx, cy, oR, a2);
    const is_ = polar(cx, cy, iR, a1), ie = polar(cx, cy, iR, a2);
    const la = diff > 180 ? 1 : 0;
    return `M ${os.x} ${os.y} A ${oR} ${oR} 0 ${la} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${iR} ${iR} 0 ${la} 0 ${is_.x} ${is_.y} Z`;
}

// Parse "HH:MM" to fractional hours (e.g. "07:30" → 7.5)
function parseTime(timeStr) {
    if (!timeStr) return null;
    const m = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1]) + parseInt(m[2]) / 60;
}

// Format fractional hours back to "HH:MM"
function formatTime(fractional) {
    const h = Math.floor(fractional) % 24;
    const m = Math.round((fractional - Math.floor(fractional)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function DailyClockChart({ dayActivities }) {
    const [selectedIdx, setSelectedIdx] = useState(null);

    const toggleSegment = (idx) => {
        setSelectedIdx(prev => prev === idx ? null : idx);
    };

    const { segments, untimedActs, totalCompleted, maxLayers, activityColorMap, usedNames, idleGaps, totalIdleHours } = useMemo(() => {
        const segs = [];
        const untimed = [];
        let completed = 0;
        const cats = new Set();

        if (!dayActivities?.length) return { segments: [], untimedActs: [], totalCompleted: 0, maxLayers: 0, usedCats: [] };

        dayActivities.forEach(act => {
            if (!act.completed) return;
            completed++;
            let placed = false;
            const td = act.timeData || {};

            // Multi-session
            if (td.startTime && td.endTime === '__multi__') {
                try {
                    JSON.parse(td.startTime).forEach(s => {
                        if (s.start) {
                            const startH = parseTime(s.start);
                            if (startH === null || startH < 0 || startH >= 24) return;
                            let endH = s.end ? parseTime(s.end) : null;
                            if (endH === null) endH = Math.min(startH + 1, 24);
                            if (endH < startH) endH = 24; // overnight: clip to midnight
                            if (endH > 24) endH = 24;
                            segs.push({
                                name: act.name,
                                icon: act.icon,
                                category: act.category || 'other',
                                startH,
                                endH,
                                timeLabel: s.start + (s.end ? ` - ${s.end}` : ''),
                                durationLabel: getDurationLabel(startH, endH),
                            });
                            cats.add(act.category || 'other');
                            placed = true;
                        }
                    });
                } catch { }
            }
            // Single recorded time
            else if (td.startTime) {
                const startH = parseTime(td.startTime);
                if (startH !== null && startH >= 0 && startH < 24) {
                    let endH = td.endTime ? parseTime(td.endTime) : null;
                    if (endH === null) endH = Math.min(startH + 1, 24);
                    if (endH < startH) endH = 24; // overnight: clip to midnight
                    if (endH > 24) endH = 24;
                    segs.push({
                        name: act.name,
                        icon: act.icon,
                        category: act.category || 'other',
                        startH,
                        endH,
                        timeLabel: td.startTime + (td.endTime ? ` - ${td.endTime}` : ''),
                        durationLabel: getDurationLabel(startH, endH),
                    });
                    cats.add(act.category || 'other');
                    placed = true;
                }
            }

            // Fallback: default time (e.g. "04:30" or "12:00 - 13:00")
            if (!placed && act.time) {
                const rangeMatch = act.time.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
                if (rangeMatch) {
                    const startH = parseTime(rangeMatch[1]);
                    let endH = parseTime(rangeMatch[2]);
                    if (startH !== null && endH !== null && startH >= 0 && startH < 24) {
                        if (endH <= startH) endH = startH + 1;
                        if (endH > 24) endH = 24;
                        segs.push({
                            name: act.name,
                            icon: act.icon,
                            category: act.category || 'other',
                            startH,
                            endH,
                            timeLabel: act.time,
                            durationLabel: getDurationLabel(startH, endH),
                        });
                        cats.add(act.category || 'other');
                        placed = true;
                    }
                } else {
                    const singleMatch = act.time.match(/(\d{1,2}):(\d{2})/);
                    if (singleMatch) {
                        const startH = parseInt(singleMatch[1]) + parseInt(singleMatch[2]) / 60;
                        if (startH >= 0 && startH < 24) {
                            const endH = Math.min(startH + 1, 24);
                            segs.push({
                                name: act.name,
                                icon: act.icon,
                                category: act.category || 'other',
                                startH,
                                endH,
                                timeLabel: act.time,
                                durationLabel: getDurationLabel(startH, endH),
                            });
                            cats.add(act.category || 'other');
                            placed = true;
                        }
                    }
                }
            }

            if (!placed) { untimed.push(act); cats.add(act.category || 'other'); }
        });

        // Sort segments by start time, then by duration (longer first for better layering)
        segs.sort((a, b) => a.startH - b.startH || (b.endH - b.startH) - (a.endH - a.startH));

        // Assign layers: greedy algorithm — place each segment in the first layer where it doesn't overlap
        const layers = []; // layers[i] = array of segments in that layer
        segs.forEach(seg => {
            let placed = false;
            for (let li = 0; li < layers.length; li++) {
                const overlaps = layers[li].some(other =>
                    other.startH < seg.endH && other.endH > seg.startH
                );
                if (!overlaps) {
                    seg.layer = li;
                    layers[li].push(seg);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                seg.layer = layers.length;
                layers.push([seg]);
            }
        });

        const ml = layers.length;

        // ======= Compute idle (no activity) gaps =======
        // Merge all activity intervals
        const intervals = segs.map(s => [s.startH, s.endH]).sort((a, b) => a[0] - b[0]);
        const merged = [];
        intervals.forEach(([s, e]) => {
            if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
                merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
            } else {
                merged.push([s, e]);
            }
        });
        // Find gaps in 0-24
        const idleGaps = [];
        let cursor = 0;
        merged.forEach(([s, e]) => {
            if (s > cursor) idleGaps.push({ startH: cursor, endH: s });
            cursor = Math.max(cursor, e);
        });
        if (cursor < 24) idleGaps.push({ startH: cursor, endH: 24 });
        const totalIdleHours = idleGaps.reduce((sum, g) => sum + (g.endH - g.startH), 0);

        // ======= Assign unique colors per activity name =======
        const usedNames = [...new Set(segs.map(s => s.name))];
        const activityColorMap = {};
        const usedPaletteIndices = new Set();
        // First pass: assign by hash
        usedNames.forEach(name => {
            let idx = activityColorIndex(name);
            // Resolve collisions
            let tries = 0;
            while (usedPaletteIndices.has(idx) && tries < ACTIVITY_PALETTE.length) {
                idx = (idx + 1) % ACTIVITY_PALETTE.length;
                tries++;
            }
            usedPaletteIndices.add(idx);
            activityColorMap[name] = ACTIVITY_PALETTE[idx];
        });
        // Assign color to each segment
        segs.forEach(seg => {
            seg.color = activityColorMap[seg.name] || '#6b7280';
        });

        return {
            segments: segs,
            untimedActs: untimed,
            totalCompleted: completed,
            maxLayers: ml,
            activityColorMap,
            usedNames,
            idleGaps,
            totalIdleHours,
        };
    }, [dayActivities]);

    // Dynamic ring sizes based on max layers
    const RING_W = maxLayers <= 2 ? 22 : maxLayers <= 3 ? 18 : maxLayers <= 4 ? 14 : 11;
    const RING_G = 3;
    const OUTER_RING = 200;
    const INNER_LIMIT = 70;

    if (totalCompleted === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--dark-400)', fontSize: '13px' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🕐</div>
                Belum ada aktivitas tercatat hari ini
            </div>
        );
    }

    // Find the selected segment for detail panel
    const selectedSeg = selectedIdx !== null && selectedIdx < segments.length ? segments[selectedIdx] : null;

    return (
        <div>
            {/* SVG Clock Chart */}
            <div style={{ padding: '10px 0' }}>
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', margin: '0 auto', display: 'block' }}>
                    <defs>
                        <radialGradient id="dayBg2" cx="50%" cy="30%" r="60%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.10" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                        </radialGradient>
                        <radialGradient id="nightBg2" cx="50%" cy="70%" r="60%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.02" />
                        </radialGradient>
                        <radialGradient id="sunriseGlow2" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="sunsetGlow2" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                            <stop offset="70%" stopColor="#f97316" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </radialGradient>
                        {/* Sunlight gradient for day half overlay */}
                        <radialGradient id="sunlightOverlay" cx="50%" cy="80%" r="80%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.14" />
                            <stop offset="40%" stopColor="#fcd34d" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.02" />
                        </radialGradient>
                    </defs>

                    {/* Background ring */}
                    <circle cx={CX} cy={CY} r={175} fill="none" stroke="var(--dark-600)" strokeWidth="80" opacity="0.3" />

                    {/* Day half (06-18, upper) */}
                    <path d={donutArc(CX, CY, OUTER_RING + 8, INNER_LIMIT - 5, hourToAngle(6), hourToAngle(18))} fill="url(#dayBg2)" />
                    {/* Sunlight overlay on day half — golden silhouette */}
                    <path d={donutArc(CX, CY, OUTER_RING + 8, INNER_LIMIT - 5, hourToAngle(6), hourToAngle(18))} fill="url(#sunlightOverlay)" />
                    {/* Night half (18-06, lower) */}
                    <path d={donutArc(CX, CY, OUTER_RING + 8, INNER_LIMIT - 5, hourToAngle(18), hourToAngle(18) + 180)} fill="url(#nightBg2)" />

                    {/* ===== DASHED RADIAL LINES at every hour ===== */}
                    {Array.from({ length: 24 }, (_, h) => {
                        const a = hourToAngle(h);
                        const is6or18 = h === 6 || h === 18;
                        const isMain = h % 3 === 0;
                        const pInner = polar(CX, CY, INNER_LIMIT - 2, a);
                        const pOuter = polar(CX, CY, OUTER_RING + 4, a);
                        return (
                            <line
                                key={`grid-${h}`}
                                x1={pInner.x} y1={pInner.y}
                                x2={pOuter.x} y2={pOuter.y}
                                stroke={
                                    is6or18 ? 'rgba(251,191,36,0.3)'
                                        : isMain ? 'var(--dark-500)'
                                            : 'var(--dark-600)'
                                }
                                opacity={is6or18 ? 1 : 0.5}
                                strokeWidth={is6or18 ? 1.5 : 1}
                                strokeDasharray={is6or18 ? '6 3' : '4 4'}
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Hour tick marks (outer edge) */}
                    {Array.from({ length: 24 }, (_, h) => {
                        const a = hourToAngle(h);
                        const is6or18 = h === 6 || h === 18;
                        const isMain = h % 3 === 0;
                        const tickOuter = OUTER_RING + (isMain ? 16 : 12);
                        const tickInner = OUTER_RING + 4;
                        const p1 = polar(CX, CY, tickOuter, a);
                        const p2 = polar(CX, CY, tickInner, a);
                        return (
                            <line
                                key={`tick-${h}`}
                                x1={p1.x} y1={p1.y}
                                x2={p2.x} y2={p2.y}
                                stroke={
                                    is6or18 ? '#fbbf24'
                                        : isMain ? 'var(--dark-400)'
                                            : 'var(--dark-500)'
                                }
                                strokeWidth={is6or18 ? 2.5 : isMain ? 1.5 : 1}
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Hour labels — every hour, full format e.g. "09.00" */}
                    {Array.from({ length: 24 }, (_, h) => {
                        const a = hourToAngle(h);
                        const p = polar(CX, CY, OUTER_RING + 26, a);
                        const is6or18 = h === 6 || h === 18;
                        const isMain = h % 3 === 0;
                        return (
                            <text
                                key={`lbl-${h}`}
                                x={p.x}
                                y={p.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={is6or18 ? '#d97706' : isMain ? 'var(--dark-300)' : 'var(--dark-400)'}
                                fontSize={is6or18 ? '11' : isMain ? '9' : '8'}
                                fontWeight={is6or18 ? '700' : isMain ? '600' : '400'}
                                fontFamily="system-ui, sans-serif"
                            >
                                {String(h).padStart(2, '0')}.00
                            </text>
                        );
                    })}

                    {/* Noon & Midnight labels */}
                    <text x={CX} y={CY - OUTER_RING - 44} textAnchor="middle" fill="#d97706" fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="3" opacity="0.9">SIANG</text>
                    <text x={CX} y={CY + OUTER_RING + 50} textAnchor="middle" fill="var(--dark-400)" fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="3" opacity="0.9">MALAM</text>

                    {/* ===== IDLE TIME ARCS (black) ===== */}
                    {idleGaps.map((gap, idx) => {
                        const arcGap = 0.5;
                        const a1 = hourToAngle(gap.startH) + arcGap;
                        const a2 = hourToAngle(gap.endH) - arcGap;
                        const oR = OUTER_RING;
                        const iR = oR - RING_W;
                        return (
                            <path
                                key={`idle-${idx}`}
                                d={donutArc(CX, CY, oR, iR, a1, a2)}
                                fill="#111827"
                                opacity="0.55"
                                style={{ pointerEvents: 'none' }}
                            />
                        );
                    })}

                    {/* ===== ACTIVITY ARCS — duration-based width ===== */}
                    {segments.map((seg, idx) => {
                        const arcGap = 0.8; // small gap in degrees
                        const a1 = hourToAngle(seg.startH) + arcGap;
                        const a2 = hourToAngle(seg.endH) - arcGap;
                        const oR = OUTER_RING - seg.layer * (RING_W + RING_G);
                        const iR = oR - RING_W;
                        if (iR < INNER_LIMIT) return null;
                        const color = seg.color;
                        const isSelected = selectedIdx === idx;
                        return (
                            <path
                                key={`seg-${idx}`}
                                d={donutArc(CX, CY, oR, iR, a1, a2)}
                                fill={color}
                                opacity={isSelected ? 1 : selectedIdx !== null ? 0.45 : 0.8}
                                stroke={isSelected ? 'var(--dark-300)' : 'none'}
                                strokeWidth={isSelected ? 1.5 : 0}
                                style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                                onClick={() => toggleSegment(idx)}
                            >
                                <title>{`${seg.icon} ${seg.name}\n⏱ ${seg.timeLabel}\n⏳ ${seg.durationLabel}`}</title>
                            </path>
                        );
                    })}

                    {/* ===== SUN ICON - far left, above 06.00 label ===== */}
                    <circle cx={CX - OUTER_RING - 34} cy={CY - 22} r="18" fill="url(#sunriseGlow2)" />
                    <text
                        x={CX - OUTER_RING - 34}
                        y={CY - 22}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="24"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }}
                    >
                        ☀️
                    </text>

                    {/* ===== MOON ICON - far right, above 18.00 label ===== */}
                    <circle cx={CX + OUTER_RING + 34} cy={CY - 22} r="18" fill="url(#sunsetGlow2)" />
                    <g transform={`translate(${CX + OUTER_RING + 34 - 10}, ${CY - 22 - 10})`}>
                        <circle cx="10" cy="10" r="8" fill="#e2e8f0" style={{ filter: 'drop-shadow(0 0 6px rgba(100,160,255,0.5))' }} />
                        <circle cx="14" cy="7" r="7" fill="var(--dark-800, #1f2937)" />
                    </g>

                    {/* Center circle */}
                    <circle cx={CX} cy={CY} r={52} fill="var(--dark-700, #374151)" stroke="var(--dark-500)" strokeWidth="1.5" />
                    <text x={CX} y={CY - 12} textAnchor="middle" dominantBaseline="central" fill="var(--dark-100)" fontSize="28" fontWeight="700" fontFamily="system-ui, sans-serif">{totalCompleted}</text>
                    <text x={CX} y={CY + 10} textAnchor="middle" dominantBaseline="central" fill="var(--dark-400)" fontSize="10" fontFamily="system-ui, sans-serif">aktivitas</text>
                </svg>
            </div>

            {/* ===== SELECTED SEGMENT DETAIL ===== */}
            {selectedSeg && (
                <div style={{
                    margin: '8px 0 0',
                    padding: '12px 14px',
                    background: 'var(--dark-700)',
                    borderRadius: '10px',
                    border: `1px solid ${selectedSeg.color || '#6b7280'}40`,
                    animation: 'fadeInChart 0.15s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '4px',
                                background: selectedSeg.color || '#6b7280',
                                flexShrink: 0,
                                boxShadow: `0 0 6px ${selectedSeg.color || '#6b7280'}50`,
                            }} />
                            <span style={{ fontSize: '18px' }}>{selectedSeg.icon}</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--dark-100)' }}>
                                {selectedSeg.name}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedIdx(null)}
                            style={{
                                background: 'var(--dark-600)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                color: 'var(--dark-300)',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--dark-300)' }}>
                            <span style={{ fontSize: '14px' }}>⏱</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--dark-200)' }}>
                                {selectedSeg.timeLabel}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--dark-300)' }}>
                            <span style={{ fontSize: '14px' }}>⏳</span>
                            <span style={{ fontWeight: '600', color: 'var(--dark-200)' }}>
                                {selectedSeg.durationLabel}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--dark-300)' }}>
                            <span style={{ fontSize: '14px' }}>🏷️</span>
                            <span style={{ fontWeight: '500', color: selectedSeg.color || '#6b7280' }}>
                                {selectedSeg.name}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ACTIVITY LEGEND ===== */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
                justifyContent: 'center',
                marginTop: '14px',
                padding: '12px',
                background: 'var(--dark-700)',
                borderRadius: '10px',
            }}>
                {usedNames.map(name => (
                    <div key={name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--dark-200)',
                        fontWeight: '500',
                    }}>
                        <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            background: activityColorMap[name] || '#6b7280',
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${activityColorMap[name] || '#6b7280'}40`,
                        }} />
                        {name}
                    </div>
                ))}
                {/* Idle time legend */}
                {totalIdleHours > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--dark-200)',
                        fontWeight: '500',
                    }}>
                        <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            background: '#111827',
                            border: '1px solid var(--dark-500)',
                            flexShrink: 0,
                        }} />
                        Tidak Ada Aktivitas ({Math.round(totalIdleHours)} jam)
                    </div>
                )}
            </div>

            {/* ===== ACTIVITY LIST ===== */}
            <div style={{
                marginTop: '14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '8px',
            }}>
                {segments.map((seg, idx) => {
                    const color = seg.color;
                    const isSelected = selectedIdx === idx;
                    return (
                        <div
                            key={idx}
                            style={{
                                padding: '10px 12px',
                                background: isSelected ? `${color}15` : 'var(--dark-700)',
                                borderRadius: '10px',
                                borderLeft: `3px solid ${color}`,
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                            }}
                            onClick={() => toggleSegment(idx)}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                            }}>
                                <span style={{ fontSize: '14px' }}>{seg.icon}</span>
                                <span style={{
                                    flex: 1,
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'var(--dark-100)',
                                }}>
                                    {seg.name}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '10px',
                                color: 'var(--dark-400)',
                            }}>
                                <span style={{ fontFamily: 'monospace' }}>{seg.timeLabel}</span>
                                <span style={{
                                    background: `${color}20`,
                                    color: color,
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '9px',
                                }}>
                                    {seg.durationLabel}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== UNTIMED ACTIVITIES ===== */}
            {untimedActs.length > 0 && (
                <div style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: 'var(--dark-700)',
                    borderRadius: '10px',
                    borderLeft: '3px solid var(--dark-500)',
                }}>
                    <div style={{
                        fontSize: '11px',
                        color: 'var(--dark-400)',
                        marginBottom: '8px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                    }}>
                        ⏳ Tanpa waktu spesifik
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {untimedActs.map((a, i) => (
                            <span key={i} style={{
                                fontSize: '12px',
                                color: 'var(--dark-200)',
                                background: 'var(--dark-600)',
                                padding: '4px 10px',
                                borderRadius: '14px',
                                fontWeight: '500',
                            }}>
                                {a.icon} {a.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeInChart {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Helper: generate duration label from fractional hours
function getDurationLabel(startH, endH) {
    const totalMinutes = Math.round((endH - startH) * 60);
    if (totalMinutes <= 0) return '-';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
    if (hours > 0) return `${hours} jam`;
    return `${mins} menit`;
}
