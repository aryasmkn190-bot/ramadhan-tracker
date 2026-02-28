'use client';

import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { GROUP_COLORS } from '../data/userGroups';

/**
 * GroupRekapExport — Export group member ranking as a shareable image
 * Designed for GroupRekapPage (admin group)
 */
export default function GroupRekapExport({
    rankedUsers,
    groupName,
    filterLabel,
    rankBy,
    groupStats,
}) {
    const [exporting, setExporting] = useState(false);
    const cardRef = useRef(null);

    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const rankByLabel = {
        produktif: '🏅 Paling Produktif',
        total: '🔢 Total Aktivitas',
        sholat: '🕌 Sholat Wajib',
        sunnah: '⭐ Sholat Sunnah',
        aktivitas: '📋 Aktivitas Harian',
        amanah: '🎯 Amanah (Tugas)',
        quran: '📖 Tadarus Quran',
        idle: '⏳ Waktu Kosong',
    };

    const getSortValue = (user) => {
        if (rankBy === 'produktif') return `${user.produktif_score} poin`;
        if (rankBy === 'quran') return `${user.quran_ayat} ayat`;
        if (rankBy === 'sholat') return `${user.sholat}x`;
        if (rankBy === 'sunnah') return `${user.sunnah}x`;
        if (rankBy === 'aktivitas') return `${(user.aktivitas || 0) + (user.custom || 0)}x`;
        if (rankBy === 'amanah') return `${user.amanah}x`;
        if (rankBy === 'idle') return `${user.idle_hours} jam`;
        return `${user.total}x`;
    };

    const gc = GROUP_COLORS[groupName] || { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#818cf8' };
    const topUsers = rankedUsers.slice(0, 20);

    const handleExport = useCallback(async () => {
        setExporting(true);
        await new Promise(r => setTimeout(r, 300));

        try {
            const element = cardRef.current;
            if (!element) { setExporting(false); return; }

            const canvas = await html2canvas(element, {
                backgroundColor: '#0f1117',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const fileName = `rekap-${groupName.replace(/\s+/g, '-').toLowerCase()}-${today.toISOString().split('T')[0]}.png`;

            // Try Web Share API first (mobile)
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'image/png' });
                const shareData = { files: [file] };
                if (navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                        setExporting(false);
                        return;
                    } catch (e) {
                        if (e.name === 'AbortError') { setExporting(false); return; }
                    }
                }
            }

            // Fallback: download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    }, [groupName, today]);

    return (
        <>
            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                    padding: '7px 14px',
                    background: exporting
                        ? 'rgba(99, 102, 241, 0.3)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: exporting ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    opacity: exporting ? 0.7 : 1,
                }}
            >
                {exporting ? '⏳ Membuat...' : '📤 Export'}
            </button>

            {/* Hidden render area — captured by html2canvas */}
            {exporting && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                    <div
                        ref={cardRef}
                        style={{
                            width: '420px',
                            background: '#0f1117',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            color: '#f3f4f6',
                        }}
                    >
                        {/* Card Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #065f46, #064e3b)',
                            padding: '24px 24px 20px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '6px',
                            }}>
                                <span style={{ fontSize: '22px' }}>🌙</span>
                                <span style={{
                                    fontSize: '18px',
                                    fontWeight: '800',
                                    color: '#fbbf24',
                                    letterSpacing: '-0.3px',
                                }}>Ramadhan Tracker</span>
                            </div>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '800',
                                color: 'white',
                                marginBottom: '6px',
                            }}>
                                👥 Rekap {groupName}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.6)',
                            }}>
                                📅 {filterLabel} • {dateStr}
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.5)',
                                marginTop: '2px',
                            }}>
                                Diurutkan: {rankByLabel[rankBy] || 'Total Aktivitas'}
                            </div>

                            {/* Stats bar */}
                            {groupStats && (
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '12px',
                                    padding: '10px 14px',
                                    background: 'rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                }}>
                                    {[
                                        { label: 'Anggota', value: groupStats.totalMembers },
                                        { label: 'Aktivitas', value: groupStats.totalActivities },
                                        { label: 'Ayat', value: groupStats.totalQuranAyat },
                                        { label: 'Rata-rata', value: groupStats.avgActivities },
                                    ].map((s, i) => (
                                        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{s.value}</div>
                                            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Card Body — User List */}
                        <div style={{ padding: '16px 20px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {topUsers.map((user, i) => (
                                    <div key={user.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        background: i < 3 ? 'rgba(251, 191, 36, 0.04)' : 'rgba(255,255,255,0.015)',
                                        borderRadius: '8px',
                                        border: i < 3 ? '1px solid rgba(251, 191, 36, 0.1)' : '1px solid rgba(255,255,255,0.03)',
                                    }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: i < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: i < 3 ? '12px' : '9px',
                                            fontWeight: '800',
                                            color: i < 3 ? '#1f2937' : '#9ca3af',
                                            flexShrink: 0,
                                        }}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                color: '#e5e7eb',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {user.full_name}
                                            </div>
                                            <div style={{
                                                fontSize: '9px',
                                                color: '#6b7280',
                                                marginTop: '1px',
                                                display: 'flex',
                                                gap: '5px',
                                            }}>
                                                <span>🕌{user.sholat}</span>
                                                <span>⭐{user.sunnah}</span>
                                                <span>📋{(user.aktivitas || 0) + (user.custom || 0)}</span>
                                                <span>📖{user.quran_ayat}</span>
                                            </div>
                                        </div>

                                        <div style={{
                                            padding: '3px 8px',
                                            borderRadius: '9px',
                                            background: i < 3 ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255,255,255,0.05)',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            color: i < 3 ? '#fbbf24' : '#9ca3af',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}>
                                            {getSortValue(user)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div style={{
                            padding: '12px 20px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ fontSize: '9px', color: '#4b5563', fontWeight: '600' }}>
                                Generated {today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                            <div style={{ fontSize: '9px', color: '#4b5563', fontWeight: '600' }}>
                                🌙 Ramadhan Tracker 1447H
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
