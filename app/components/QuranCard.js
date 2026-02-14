'use client';

import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

export default function QuranCard() {
    const {
        quranGlobalProgress,
        quranReadings,
        addQuranReading,
        deleteQuranReading,
        resetQuranReadings,
        getQuranReadingsForDay,
        selectedDateString,
        QURAN_SURAHS,
        TOTAL_AYAT,
    } = useApp();

    const [showModal, setShowModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showSurahDetail, setShowSurahDetail] = useState(false);
    const [selectedSurah, setSelectedSurah] = useState(1);
    const [startAyat, setStartAyat] = useState('1');
    const [endAyat, setEndAyat] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { percentage, totalRead, totalAyat, completedSurahs, surahProgress } = quranGlobalProgress;

    // Readings for the selected day
    const todayReadings = useMemo(() => {
        return getQuranReadingsForDay(selectedDateString);
    }, [getQuranReadingsForDay, selectedDateString]);

    // Filtered surahs by search
    const filteredSurahs = useMemo(() => {
        if (!searchQuery.trim()) return QURAN_SURAHS;
        const q = searchQuery.toLowerCase();
        return QURAN_SURAHS.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.translation.toLowerCase().includes(q) ||
            s.number.toString() === q
        );
    }, [searchQuery, QURAN_SURAHS]);

    const currentSurah = QURAN_SURAHS.find(s => s.number === selectedSurah);

    const handleAddReading = () => {
        const start = parseInt(startAyat) || 1;
        const end = parseInt(endAyat) || currentSurah?.totalAyat || 1;
        if (start > 0 && end >= start) {
            addQuranReading(selectedSurah, start, end, selectedDateString);
            setStartAyat('1');
            setEndAyat('');
            setShowModal(false);
        }
    };

    const openModalWithSurah = (surahNum) => {
        setSelectedSurah(surahNum);
        setStartAyat('1');
        const surah = QURAN_SURAHS.find(s => s.number === surahNum);
        setEndAyat(surah ? surah.totalAyat.toString() : '');
        setSearchQuery('');
        setShowModal(true);
    };

    return (
        <>
            <div className="quran-card">
                {/* Header */}
                <div className="quran-header">
                    <div className="quran-title">
                        <span>📖</span>
                        <span>Progress Tadarus Al-Quran</span>
                    </div>
                    <span style={{
                        fontSize: '12px',
                        color: '#10b981',
                        fontWeight: '600',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '3px 10px',
                        borderRadius: '999px',
                    }}>
                        {completedSurahs}/114 Surat
                    </span>
                </div>

                {/* Global Progress */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '6px',
                    }}>
                        <span style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#10b981',
                        }}>
                            {percentage}%
                        </span>
                        <span style={{
                            fontSize: '12px',
                            color: 'var(--dark-400)',
                        }}>
                            {totalRead.toLocaleString()} / {totalAyat.toLocaleString()} ayat
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Today's readings */}
                {todayReadings.length > 0 && (
                    <div style={{
                        marginBottom: '12px',
                        padding: '10px 12px',
                        background: 'rgba(16, 185, 129, 0.06)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.12)',
                    }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'var(--dark-400)',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            📅 Bacaan Hari Ini
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {todayReadings.map(r => {
                                const surah = QURAN_SURAHS.find(s => s.number === r.surahNumber);
                                const ayatCount = r.endAyat - r.startAyat + 1;
                                return (
                                    <div key={r.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        background: 'var(--dark-700)',
                                        borderRadius: '8px',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: 'var(--dark-100)',
                                            }}>
                                                {surah?.name || `Surat ${r.surahNumber}`}
                                            </span>
                                            <span style={{
                                                fontSize: '12px',
                                                color: 'var(--dark-400)',
                                                marginLeft: '8px',
                                            }}>
                                                Ayat {r.startAyat}–{r.endAyat} ({ayatCount} ayat)
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteQuranReading(r.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                lineHeight: 1,
                                            }}
                                            title="Hapus"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="add-quran-btn"
                        onClick={() => {
                            setSearchQuery('');
                            setShowModal(true);
                        }}
                        style={{ flex: 1 }}
                    >
                        <span>➕</span>
                        <span>Tambah Bacaan</span>
                    </button>

                    <button
                        onClick={() => setShowSurahDetail(!showSurahDetail)}
                        style={{
                            padding: '10px 14px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: 'var(--radius-lg)',
                            color: '#60a5fa',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                        title="Lihat progress surat"
                    >
                        📊
                    </button>

                    {totalRead > 0 && (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 'var(--radius-lg)',
                                color: '#f87171',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                            title="Reset progress"
                        >
                            🔄
                        </button>
                    )}
                </div>

                {/* Surah progress detail (collapsible) */}
                {showSurahDetail && (
                    <div style={{
                        marginTop: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--dark-600)',
                    }}>
                        {surahProgress.map(s => (
                            <div
                                key={s.number}
                                onClick={() => openModalWithSurah(s.number)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    borderBottom: '1px solid var(--dark-700)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <span style={{
                                    width: '28px',
                                    fontSize: '11px',
                                    color: 'var(--dark-400)',
                                    textAlign: 'right',
                                    fontFamily: 'monospace',
                                }}>
                                    {s.number}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: s.completed ? '#10b981' : 'var(--dark-200)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {s.completed && '✅ '}{s.name}
                                    </div>
                                </div>
                                <div style={{
                                    width: '60px',
                                    height: '4px',
                                    background: 'var(--dark-600)',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${s.percentage}%`,
                                        height: '100%',
                                        background: s.completed ? '#10b981' : '#3b82f6',
                                        borderRadius: '2px',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    color: 'var(--dark-400)',
                                    fontFamily: 'monospace',
                                    width: '50px',
                                    textAlign: 'right',
                                }}>
                                    {s.readCount}/{s.totalAyat}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== ADD READING MODAL ===== */}
            <div className={`modal-overlay ${showModal ? 'active' : ''}`} onClick={() => setShowModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Tambah Bacaan</h2>
                        <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                    </div>

                    {/* Search surat */}
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Cari surat... (nama atau nomor)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ fontSize: '13px' }}
                        />
                    </div>

                    {/* Surah list */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        marginBottom: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--dark-600)',
                        maxHeight: '200px',
                    }}>
                        {filteredSurahs.map(s => {
                            const sp = surahProgress.find(p => p.number === s.number);
                            return (
                                <div
                                    key={s.number}
                                    onClick={() => {
                                        setSelectedSurah(s.number);
                                        setStartAyat('1');
                                        setEndAyat(s.totalAyat.toString());
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--dark-700)',
                                        cursor: 'pointer',
                                        background: selectedSurah === s.number ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                        transition: 'background 0.1s',
                                    }}
                                >
                                    <span style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        background: selectedSurah === s.number ? '#10b981' : 'var(--dark-600)',
                                        color: selectedSurah === s.number ? '#fff' : 'var(--dark-300)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        flexShrink: 0,
                                    }}>
                                        {s.number}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--dark-100)',
                                        }}>
                                            {s.name}
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-400)',
                                        }}>
                                            {s.translation} • {s.totalAyat} ayat
                                            {sp?.completed && ' ✅'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Ayat range input */}
                    {currentSurah && (
                        <div style={{
                            padding: '12px',
                            background: 'var(--dark-700)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '12px',
                        }}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--dark-100)',
                                marginBottom: '10px',
                            }}>
                                📖 {currentSurah.name} ({currentSurah.totalAyat} ayat)
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{
                                        fontSize: '11px',
                                        color: 'var(--dark-400)',
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        Dari Ayat
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={startAyat}
                                        onChange={(e) => setStartAyat(e.target.value)}
                                        min="1"
                                        max={currentSurah.totalAyat}
                                        style={{ fontSize: '14px', textAlign: 'center' }}
                                    />
                                </div>
                                <span style={{
                                    color: 'var(--dark-400)',
                                    fontSize: '16px',
                                    marginTop: '16px',
                                }}>—</span>
                                <div style={{ flex: 1 }}>
                                    <label style={{
                                        fontSize: '11px',
                                        color: 'var(--dark-400)',
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        Sampai Ayat
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={endAyat}
                                        onChange={(e) => setEndAyat(e.target.value)}
                                        min="1"
                                        max={currentSurah.totalAyat}
                                        placeholder={currentSurah.totalAyat.toString()}
                                        style={{ fontSize: '14px', textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={handleAddReading}>
                        <span>📖</span>
                        <span>Simpan Bacaan</span>
                    </button>
                </div>
            </div>

            {/* ===== RESET CONFIRMATION MODAL ===== */}
            <div className={`modal-overlay ${showResetConfirm ? 'active' : ''}`} onClick={() => setShowResetConfirm(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Reset Progress?</h2>
                        <button className="modal-close" onClick={() => setShowResetConfirm(false)}>×</button>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        padding: '8px 0 20px',
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                        <p style={{ color: 'var(--dark-200)', fontSize: '14px', marginBottom: '4px' }}>
                            Progress saat ini: <strong>{totalRead.toLocaleString()} ayat ({percentage}%)</strong>
                        </p>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px' }}>
                            Tindakan ini akan menghapus seluruh riwayat bacaan Al-Quran Anda.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'var(--dark-700)',
                                color: 'var(--dark-200)',
                                border: '1px solid var(--dark-600)',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => {
                                resetQuranReadings();
                                setShowResetConfirm(false);
                            }}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Ya, Reset
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
