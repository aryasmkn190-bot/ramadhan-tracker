'use client';

import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { GROUP_COLORS } from '../data/userGroups';

/**
 * RankingExport — Export ranking data as shareable images
 * Props:
 * - groupRanking: array of { group, members, totalActivities, totalSessions, avgActivities }
 * - rankedUsers: array of user stats
 * - filterLabel: string describing current filter (e.g. "Hari ke-11 Ramadhan")
 * - rankBy: current sort mode
 * - getSortValue: function to get display value for a user
 * - getRankDisplay: function to get rank badge
 */
export default function RankingExport({
    groupRanking,
    rankedUsers,
    filterLabel,
    rankBy,
    getSortValue,
    getRankDisplay,
}) {
    const [showModal, setShowModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState(null); // 'group' or 'user'
    const cardRef = useRef(null);

    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const handleExport = useCallback(async (type) => {
        setExportType(type);
        setExporting(true);

        // Wait for render to complete
        await new Promise(r => setTimeout(r, 300));

        try {
            const element = cardRef.current;
            if (!element) {
                setExporting(false);
                return;
            }

            const canvas = await html2canvas(element, {
                backgroundColor: '#0f1117',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const fileName = `ranking-${type}-${today.toISOString().split('T')[0]}.png`;

            // Try Web Share API first (mobile)
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'image/png' });
                const shareData = { files: [file] };

                if (navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                        setExporting(false);
                        setShowModal(false);
                        return;
                    } catch (e) {
                        if (e.name === 'AbortError') {
                            setExporting(false);
                            return;
                        }
                        // Fall through to download
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
            setShowModal(false);
        }
    }, [today]);

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

    // Top users for export (max 20)
    const topUsers = rankedUsers.slice(0, 20);

    return (
        <>
            {/* Export Button */}
            <button
                onClick={() => setShowModal(true)}
                style={{
                    padding: '7px 14px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                }}
            >
                📤 Export
            </button>

            {/* Modal */}
            {(showModal || exporting) && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '16px',
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '360px',
                        background: '#1a1d27',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#f3f4f6' }}>
                                📤 Export Ranking
                            </div>
                            {!exporting && (
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        width: '32px', height: '32px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#9ca3af',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >✕</button>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '16px 20px' }}>
                            {exporting ? (
                                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
                                    <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '600' }}>
                                        Membuat gambar...
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                                        Pilih data yang ingin di-export sebagai gambar:
                                    </div>

                                    {/* Option 1: Group Ranking */}
                                    <button
                                        onClick={() => handleExport('group')}
                                        style={{
                                            padding: '14px 16px',
                                            background: 'rgba(99, 102, 241, 0.08)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{
                                            width: '44px', height: '44px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                        }}>🏅</div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#e5e7eb' }}>
                                                Peringkat Grup
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                Ranking {groupRanking.length} grup berdasarkan total aktivitas
                                            </div>
                                        </div>
                                    </button>

                                    {/* Option 2: User Ranking */}
                                    <button
                                        onClick={() => handleExport('user')}
                                        style={{
                                            padding: '14px 16px',
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{
                                            width: '44px', height: '44px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                        }}>🏆</div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#e5e7eb' }}>
                                                Peringkat User
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                Top {Math.min(topUsers.length, 20)} user • {rankByLabel[rankBy] || 'Total Aktivitas'}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden render area — this is captured by html2canvas */}
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
                                marginBottom: '4px',
                            }}>
                                {exportType === 'group' ? '🏅 Peringkat Grup' : '🏆 Peringkat User'}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.6)',
                            }}>
                                📅 {filterLabel} • {dateStr}
                            </div>
                            {exportType === 'user' && (
                                <div style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.5)',
                                    marginTop: '2px',
                                }}>
                                    Diurutkan: {rankByLabel[rankBy] || 'Total Aktivitas'}
                                </div>
                            )}
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '16px 20px 8px' }}>
                            {exportType === 'group' ? (
                                /* ========== GROUP RANKING ========== */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {groupRanking.map((g, i) => {
                                        const colors = GROUP_COLORS[g.group];
                                        const maxTotal = groupRanking[0]?.totalActivities || 1;
                                        const barWidth = Math.max(8, (g.totalActivities / maxTotal) * 100);
                                        return (
                                            <div key={g.group} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: i < 3 ? 'rgba(251, 191, 36, 0.04)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '10px',
                                                border: i < 3 ? '1px solid rgba(251, 191, 36, 0.12)' : '1px solid rgba(255,255,255,0.04)',
                                            }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: i < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#374151',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: i < 3 ? '14px' : '11px',
                                                    fontWeight: '800',
                                                    color: i < 3 ? '#1f2937' : '#9ca3af',
                                                    flexShrink: 0,
                                                }}>
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        color: colors?.text || '#e5e7eb',
                                                        marginBottom: '4px',
                                                    }}>
                                                        {g.group}
                                                    </div>
                                                    <div style={{
                                                        height: '6px',
                                                        background: '#1f2937',
                                                        borderRadius: '3px',
                                                        overflow: 'hidden',
                                                    }}>
                                                        <div style={{
                                                            width: `${barWidth}%`,
                                                            height: '100%',
                                                            background: `linear-gradient(90deg, ${colors?.text || '#10b981'}88, ${colors?.text || '#10b981'})`,
                                                            borderRadius: '3px',
                                                        }} />
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        color: '#f3f4f6',
                                                    }}>
                                                        {g.totalActivities}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        color: '#6b7280',
                                                        fontWeight: '600',
                                                    }}>
                                                        {g.members} anggota • {g.totalSessions} ayat
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* ========== USER RANKING ========== */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {topUsers.map((user, i) => {
                                        const gc = GROUP_COLORS[user.user_group];
                                        return (
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
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                    }}>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            color: '#e5e7eb',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {user.full_name}
                                                        </span>
                                                        {gc && (
                                                            <span style={{
                                                                fontSize: '7px',
                                                                fontWeight: '700',
                                                                padding: '1px 5px',
                                                                borderRadius: '9px',
                                                                background: gc.bg,
                                                                color: gc.text,
                                                                border: `1px solid ${gc.border}`,
                                                                flexShrink: 0,
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {user.user_group}
                                                            </span>
                                                        )}
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
                                                        <span>📋{user.aktivitas + user.custom}</span>
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
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Card Footer */}
                        <div style={{
                            padding: '12px 20px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{
                                fontSize: '9px',
                                color: '#4b5563',
                                fontWeight: '600',
                            }}>
                                Generated {today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                            <div style={{
                                fontSize: '9px',
                                color: '#4b5563',
                                fontWeight: '600',
                            }}>
                                🌙 Ramadhan Tracker 1447H
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
