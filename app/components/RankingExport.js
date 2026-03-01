'use client';

import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { GROUP_COLORS } from '../data/userGroups';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportUserXlsx, exportGroupXlsx } from '../utils/exportXlsx';

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
    groupRankBy,
    getSortValue,
    getRankDisplay,
    getGroupSortValue,
    getGroupSortLabel,
}) {
    const [showModal, setShowModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState(null); // 'group' or 'user'
    const [rankFrom, setRankFrom] = useState(1);
    const [rankTo, setRankTo] = useState(10);
    const [exportFormat, setExportFormat] = useState('image'); // 'image' or 'pdf'
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

    const groupRankByLabel = {
        produktif: '🏅 Paling Produktif',
        avg: '📊 Rata-rata Aktivitas',
        total: '🔢 Total Aktivitas',
        sholat: '🕌 Sholat Wajib',
        sunnah: '⭐ Sholat Sunnah',
        aktivitas: '📋 Aktivitas Harian',
        amanah: '🎯 Amanah (Tugas)',
        quran_avg: '📖 Tadarus Quran',
        istirahat: '😴 Istirahat (sedikit = baik)',
        hiburan: '🎮 Hiburan (sedikit = baik)',
        idle: '⏳ Waktu Kosong (sedikit = baik)',
    };

    // Clean labels (no emoji) for PDF — jsPDF default font doesn't support emoji
    const pdfRankByLabel = {
        produktif: 'Paling Produktif',
        total: 'Total Aktivitas',
        sholat: 'Sholat Wajib',
        sunnah: 'Sholat Sunnah',
        aktivitas: 'Aktivitas Harian',
        amanah: 'Tugas',
        quran: 'Tadarus Quran',
        idle: 'Tidak Beraktivitas',
    };
    const pdfGroupRankByLabel = {
        produktif: 'Paling Produktif',
        avg: 'Rata-rata Aktivitas',
        total: 'Total Aktivitas',
        sholat: 'Sholat Wajib',
        sunnah: 'Sholat Sunnah',
        aktivitas: 'Aktivitas Harian',
        amanah: 'Tugas',
        quran_avg: 'Tadarus Quran',
        istirahat: 'Istirahat',
        hiburan: 'Hiburan',
        idle: 'Tidak Beraktivitas',
    };
    const stripEmoji = (str) => str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}\u{20E3}\u{FE0F}]/gu, '').trim();

    const handleExportPDF = useCallback((type) => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const title = type === 'group' ? 'Peringkat Grup' : 'Peringkat User';
            const sortLabel = type === 'group'
                ? (pdfGroupRankByLabel[groupRankBy] || 'Rata-rata/Anggota')
                : (pdfRankByLabel[rankBy] || 'Total Aktivitas');
            const cleanFilterLabel = stripEmoji(filterLabel);

            // Header
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(`Ramadhan Tracker - ${title}`, pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`${cleanFilterLabel} | ${dateStr}`, pageWidth / 2, 22, { align: 'center' });
            doc.text(`Peringkat #${rankFrom} - #${Math.min(rankTo, type === 'group' ? groupRanking.length : rankedUsers.length)} | Diurutkan: ${sortLabel}`, pageWidth / 2, 27, { align: 'center' });

            if (type === 'group') {
                const slicedGroups = groupRanking.slice(Math.max(0, rankFrom - 1), rankTo);
                const headers = [['#', 'Grup', 'Anggota', 'Nilai']];
                const rows = slicedGroups.map((g, i) => [
                    rankFrom + i,
                    g.group,
                    g.members,
                    getGroupSortValue ? getGroupSortValue(g) : g.totalActivities,
                ]);
                autoTable(doc, { head: headers, body: rows, startY: 32, theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [30, 30, 40], textColor: 255 } });
            } else {
                const slicedUsers = rankedUsers.slice(Math.max(0, rankFrom - 1), rankTo);
                const headers = [['#', 'Nama', 'Grup', 'Sholat', 'Sunnah', 'Aktivitas', 'Quran', 'Tugas', 'Tdk Aktif (j)', 'Tidur', 'Hiburan', 'Nilai']];
                const rows = slicedUsers.map((u, i) => [
                    rankFrom + i,
                    u.full_name,
                    u.user_group || '-',
                    u.sholat,
                    u.sunnah,
                    (u.aktivitas || 0) + (u.custom || 0),
                    `${u.quran_ayat} ayat`,
                    u.amanah || 0,
                    u.idle_hours || 0,
                    u.tidur_count > 0 ? `${u.tidur_count}x (${u.tidur_hours}j)` : '0',
                    u.hiburan_count || 0,
                    getSortValue(u),
                ]);
                autoTable(doc, { head: headers, body: rows, startY: 32, theme: 'grid', styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [30, 30, 40], textColor: 255 }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 28 } } });
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let p = 1; p <= pageCount; p++) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Ramadhan Tracker 1447H | Hal ${p}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
            }

            doc.save(`ranking-${type}-${today.toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
        } finally {
            setShowModal(false);
        }
    }, [rankedUsers, groupRanking, rankFrom, rankTo, filterLabel, dateStr, rankBy, groupRankBy, getSortValue, getGroupSortValue, today]);

    const handleExportXlsx = useCallback(async (type) => {
        try {
            const cleanFilter = stripEmoji(filterLabel);
            if (type === 'group') {
                const slicedGroups = groupRanking.slice(Math.max(0, rankFrom - 1), rankTo);
                await exportGroupXlsx({
                    groups: slicedGroups,
                    rankFrom,
                    filterLabel: cleanFilter,
                    dateStr,
                    sortLabel: pdfGroupRankByLabel[groupRankBy] || 'Rata-rata/Anggota',
                    getGroupSortValue,
                    fileName: `ranking-grup-${today.toISOString().split('T')[0]}.xlsx`,
                });
            } else {
                const slicedUsers = rankedUsers.slice(Math.max(0, rankFrom - 1), rankTo);
                await exportUserXlsx({
                    users: slicedUsers,
                    rankFrom,
                    title: 'Peringkat User',
                    filterLabel: cleanFilter,
                    dateStr,
                    sortLabel: pdfRankByLabel[rankBy] || 'Total Aktivitas',
                    getSortValue,
                    fileName: `ranking-user-${today.toISOString().split('T')[0]}.xlsx`,
                    includeGroup: true,
                });
            }
        } catch (error) {
            console.error('XLSX export error:', error);
        } finally {
            setShowModal(false);
        }
    }, [rankedUsers, groupRanking, rankFrom, rankTo, filterLabel, dateStr, rankBy, groupRankBy, getSortValue, getGroupSortValue, today]);

    const handleExport = useCallback(async (type) => {
        if (exportFormat === 'pdf') {
            handleExportPDF(type);
            return;
        }
        if (exportFormat === 'xlsx') {
            handleExportXlsx(type);
            return;
        }

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
    }, [today, exportFormat, handleExportPDF, handleExportXlsx]);

    // Sliced users based on range
    const topUsers = rankedUsers.slice(Math.max(0, rankFrom - 1), rankTo);
    const topGroups = groupRanking.slice(Math.max(0, rankFrom - 1), rankTo);

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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Range Picker */}
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600' }}>
                                            📊 Rentang Peringkat
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Dari</div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={rankTo}
                                                    value={rankFrom}
                                                    onChange={e => setRankFrom(Math.max(1, parseInt(e.target.value) || 1))}
                                                    style={{
                                                        width: '100%', padding: '8px 10px',
                                                        background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)',
                                                        borderRadius: '8px', color: '#f3f4f6',
                                                        fontSize: '14px', fontWeight: '700', textAlign: 'center',
                                                        fontFamily: 'inherit',
                                                    }}
                                                />
                                            </div>
                                            <div style={{ color: '#4b5563', fontSize: '14px', marginTop: '16px' }}>—</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Sampai</div>
                                                <input
                                                    type="number"
                                                    min={rankFrom}
                                                    value={rankTo}
                                                    onChange={e => setRankTo(Math.max(rankFrom, parseInt(e.target.value) || rankFrom))}
                                                    style={{
                                                        width: '100%', padding: '8px 10px',
                                                        background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)',
                                                        borderRadius: '8px', color: '#f3f4f6',
                                                        fontSize: '14px', fontWeight: '700', textAlign: 'center',
                                                        fontFamily: 'inherit',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {/* Quick presets */}
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            {[
                                                { label: '1-5', from: 1, to: 5 },
                                                { label: '1-10', from: 1, to: 10 },
                                                { label: '1-20', from: 1, to: 20 },
                                                { label: 'Semua', from: 1, to: rankedUsers.length },
                                            ].map(p => (
                                                <button key={p.label} onClick={() => { setRankFrom(p.from); setRankTo(p.to); }}
                                                    style={{
                                                        padding: '4px 10px', fontSize: '10px', fontWeight: '600',
                                                        background: rankFrom === p.from && rankTo === p.to ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                                                        border: rankFrom === p.from && rankTo === p.to ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '6px', color: rankFrom === p.from && rankTo === p.to ? '#a5b4fc' : '#9ca3af',
                                                        cursor: 'pointer',
                                                    }}
                                                >{p.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Format Picker */}
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600' }}>
                                            📄 Format Export
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {[{ id: 'image', label: '🖼️ Gambar', desc: 'Shareable image' }, { id: 'pdf', label: '📄 PDF', desc: 'Untuk ratusan user' }, { id: 'xlsx', label: '📊 Excel', desc: 'Tabel berwarna' }].map(f => (
                                                <button key={f.id} onClick={() => setExportFormat(f.id)}
                                                    style={{
                                                        flex: 1, padding: '10px 8px',
                                                        background: exportFormat === f.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                                                        border: exportFormat === f.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: exportFormat === f.id ? '#a5b4fc' : '#9ca3af' }}>{f.label}</div>
                                                    <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>{f.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '-4px', fontWeight: '600' }}>
                                        📤 Pilih data export
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
                                                #{rankFrom}-{Math.min(rankTo, groupRanking.length)} dari {groupRanking.length} grup
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
                                                #{rankFrom}-{Math.min(rankTo, rankedUsers.length)} dari {rankedUsers.length} user
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
                            <div style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.5)',
                                marginTop: '2px',
                            }}>
                                Peringkat #{rankFrom} - #{rankTo}
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
                            {exportType === 'group' && (
                                <div style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.5)',
                                    marginTop: '2px',
                                }}>
                                    Diurutkan: {groupRankByLabel[groupRankBy] || 'Rata-rata/Anggota'}
                                </div>
                            )}
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '16px 20px 8px' }}>
                            {exportType === 'group' ? (
                                /* ========== GROUP RANKING ========== */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {topGroups.map((g, i) => {
                                        const realIndex = rankFrom - 1 + i;
                                        const colors = GROUP_COLORS[g.group];
                                        const sortVal = getGroupSortValue ? getGroupSortValue(g) : g.totalActivities;
                                        const maxVal = getGroupSortValue ? getGroupSortValue(groupRanking[0]) : (groupRanking[0]?.totalActivities || 1);
                                        const barWidth = Math.max(8, (sortVal / (maxVal || 1)) * 100);
                                        return (
                                            <div key={g.group} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: realIndex < 3 ? 'rgba(251, 191, 36, 0.04)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '10px',
                                                border: realIndex < 3 ? '1px solid rgba(251, 191, 36, 0.12)' : '1px solid rgba(255,255,255,0.04)',
                                            }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: realIndex < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#374151',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: realIndex < 3 ? '14px' : '11px',
                                                    fontWeight: '800',
                                                    color: realIndex < 3 ? '#1f2937' : '#9ca3af',
                                                    flexShrink: 0,
                                                }}>
                                                    {realIndex === 0 ? '🥇' : realIndex === 1 ? '🥈' : realIndex === 2 ? '🥉' : `#${realIndex + 1}`}
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
                                                        {getGroupSortValue ? getGroupSortValue(g) : g.totalActivities}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        color: '#6b7280',
                                                        fontWeight: '600',
                                                    }}>
                                                        {g.members} anggota
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
                                        const realIndex = rankFrom - 1 + i;
                                        const gc = GROUP_COLORS[user.user_group];
                                        return (
                                            <div key={user.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 10px',
                                                background: realIndex < 3 ? 'rgba(251, 191, 36, 0.04)' : 'rgba(255,255,255,0.015)',
                                                borderRadius: '8px',
                                                border: realIndex < 3 ? '1px solid rgba(251, 191, 36, 0.1)' : '1px solid rgba(255,255,255,0.03)',
                                            }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: realIndex < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#374151',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: realIndex < 3 ? '12px' : '9px',
                                                    fontWeight: '800',
                                                    color: realIndex < 3 ? '#1f2937' : '#9ca3af',
                                                    flexShrink: 0,
                                                }}>
                                                    {realIndex === 0 ? '🥇' : realIndex === 1 ? '🥈' : realIndex === 2 ? '🥉' : `${realIndex + 1}`}
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
                                                        fontSize: '8px',
                                                        color: '#6b7280',
                                                        marginTop: '2px',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '2px 3px',
                                                    }}>
                                                        <span style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>🕌 Sholat {user.sholat}</span>
                                                        <span style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>⭐ Sunnah {user.sunnah}</span>
                                                        <span style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>📋 Aktivitas {user.aktivitas + user.custom}</span>
                                                        <span style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>📖 Quran {user.quran_ayat} ayat</span>
                                                        {user.amanah > 0 && <span style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>🎯 Tugas {user.amanah}</span>}
                                                        <span style={{ padding: '1px 4px', background: 'rgba(239,68,68,0.12)', borderRadius: '3px', color: '#f87171' }}>⏳ Idle {user.idle_hours}j</span>
                                                        {user.tidur_count > 0 && <span style={{ padding: '1px 4px', background: 'rgba(239,68,68,0.12)', borderRadius: '3px', color: '#f87171' }}>😴 Tidur {user.tidur_count}x ({user.tidur_hours}j)</span>}
                                                        {user.hiburan_count > 0 && <span style={{ padding: '1px 4px', background: 'rgba(239,68,68,0.12)', borderRadius: '3px', color: '#f87171' }}>🎮 Hiburan {user.hiburan_count}</span>}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '9px',
                                                    background: realIndex < 3 ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255,255,255,0.05)',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    color: realIndex < 3 ? '#fbbf24' : '#9ca3af',
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
