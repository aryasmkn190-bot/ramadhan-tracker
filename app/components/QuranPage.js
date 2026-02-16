'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

// Qari list for audio
const QARI_LIST = [
    { id: '05', name: 'Misyari Rasyid Al-Afasy' },
    { id: '01', name: 'Abdullah Al-Juhany' },
    { id: '03', name: 'Abdurrahman As-Sudais' },
    { id: '04', name: 'Ibrahim Al-Dossari' },
    { id: '06', name: 'Yasser Al-Dosari' },
    { id: '02', name: 'Abdul Muhsin Al-Qasim' },
];

// View modes
const VIEW_SURAH = 'surah';
const VIEW_JUZ = 'juz';
const VIEW_READER = 'reader';

export default function QuranPage() {
    const {
        quranGlobalProgress,
        addQuranReading,
        selectedDateString,
        addToast,
        quranReadings,
    } = useApp();

    // Main state
    const [viewMode, setViewMode] = useState(VIEW_SURAH);
    const [activeListTab, setActiveListTab] = useState('surah');
    const [surahList, setSurahList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(true);

    // Reader state
    const [currentSurah, setCurrentSurah] = useState(null);
    const [ayatList, setAyatList] = useState([]);
    const [isLoadingAyat, setIsLoadingAyat] = useState(false);
    const [selectedQari, setSelectedQari] = useState('05');
    const [playingAyat, setPlayingAyat] = useState(null);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showLatin, setShowLatin] = useState(false);
    const [lastReadSurah, setLastReadSurah] = useState(null);
    const [lastReadAyat, setLastReadAyat] = useState(null);

    // Per-ayat selection
    const [selectedAyats, setSelectedAyats] = useState(new Set());
    const [selectMode, setSelectMode] = useState(false); // range-select mode
    const [rangeStart, setRangeStart] = useState(null);

    // Audio ref
    const audioRef = useRef(null);
    const ayatRefs = useRef({});
    const readerRef = useRef(null);

    // Load surah list on mount
    useEffect(() => {
        fetchSurahList();
        // Load last read from localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ramadhan_last_read');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setLastReadSurah(parsed.surah);
                    setLastReadAyat(parsed.ayat);
                } catch (e) { /* ignore */ }
            }
        }
    }, []);

    // Fetch all surahs
    const fetchSurahList = async () => {
        setIsLoadingList(true);
        try {
            const res = await fetch('https://equran.id/api/v2/surat');
            const json = await res.json();
            if (json.code === 200 && json.data) {
                setSurahList(json.data);
            }
        } catch (error) {
            console.error('Error fetching surah list:', error);
            addToast('Gagal memuat daftar surat', 'error');
        } finally {
            setIsLoadingList(false);
        }
    };

    // Fetch surah detail (ayat)
    const openSurah = useCallback(async (surahNumber, scrollToAyat = null) => {
        setIsLoadingAyat(true);
        setViewMode(VIEW_READER);
        setAyatList([]);

        try {
            const res = await fetch(`https://equran.id/api/v2/surat/${surahNumber}`);
            const json = await res.json();
            if (json.code === 200 && json.data) {
                setCurrentSurah(json.data);
                setAyatList(json.data.ayat || []);

                // Save last read
                const lastRead = { surah: surahNumber, ayat: scrollToAyat || 1 };
                setLastReadSurah(surahNumber);
                setLastReadAyat(scrollToAyat || 1);
                localStorage.setItem('ramadhan_last_read', JSON.stringify(lastRead));

                // Scroll to specific ayat after render
                if (scrollToAyat) {
                    setTimeout(() => {
                        const el = ayatRefs.current[scrollToAyat];
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error fetching surah:', error);
            addToast('Gagal memuat surat', 'error');
        } finally {
            setIsLoadingAyat(false);
        }
    }, [addToast]);

    // Navigate to next/prev surah
    const goToSurah = (num) => {
        if (num >= 1 && num <= 114) {
            stopAudio();
            openSurah(num);
            if (readerRef.current) {
                readerRef.current.scrollTop = 0;
            }
        }
    };

    // Audio functions
    const playAyatAudio = (ayat) => {
        const audioUrl = ayat.audio?.[selectedQari];
        if (!audioUrl) {
            addToast('Audio tidak tersedia', 'error');
            return;
        }

        if (playingAyat === ayat.nomorAyat) {
            stopAudio();
            return;
        }

        stopAudio();
        setPlayingAyat(ayat.nomorAyat);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.play().catch(() => {
            addToast('Gagal memutar audio', 'error');
            setPlayingAyat(null);
        });

        audio.onended = () => {
            setPlayingAyat(null);
            // Auto-play next ayat
            const nextAyat = ayatList.find(a => a.nomorAyat === ayat.nomorAyat + 1);
            if (nextAyat) {
                // Scroll to next ayat
                const el = ayatRefs.current[nextAyat.nomorAyat];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setTimeout(() => playAyatAudio(nextAyat), 300);
            }
        };
    };

    const playFullSurah = () => {
        if (!currentSurah?.audioFull?.[selectedQari]) {
            addToast('Audio tidak tersedia', 'error');
            return;
        }

        if (playingAyat === 'full') {
            stopAudio();
            return;
        }

        stopAudio();
        setPlayingAyat('full');

        const audio = new Audio(currentSurah.audioFull[selectedQari]);
        audioRef.current = audio;
        audio.play().catch(() => {
            addToast('Gagal memutar audio', 'error');
            setPlayingAyat(null);
        });
        audio.onended = () => setPlayingAyat(null);
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setPlayingAyat(null);
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => stopAudio();
    }, []);

    // Stop audio when leaving reader
    useEffect(() => {
        if (viewMode !== VIEW_READER) {
            stopAudio();
        }
    }, [viewMode]);

    // Mark surah as read (record all ayat)
    const markSurahRead = () => {
        if (!currentSurah) return;
        addQuranReading(currentSurah.nomor, 1, currentSurah.jumlahAyat, selectedDateString);
    };

    // Build a set of already-read ayat for current surah
    const readAyatSet = useMemo(() => {
        if (!currentSurah) return new Set();
        const set = new Set();
        quranReadings.forEach(r => {
            if (r.surahNumber === currentSurah.nomor) {
                for (let a = r.startAyat; a <= r.endAyat; a++) {
                    set.add(a);
                }
            }
        });
        return set;
    }, [currentSurah, quranReadings]);

    // Toggle single ayat selection
    const toggleAyatSelection = (ayatNum) => {
        if (selectMode && rangeStart !== null) {
            // Range select: select from rangeStart to this ayat
            const start = Math.min(rangeStart, ayatNum);
            const end = Math.max(rangeStart, ayatNum);
            const newSet = new Set(selectedAyats);
            for (let i = start; i <= end; i++) {
                newSet.add(i);
            }
            setSelectedAyats(newSet);
            setRangeStart(null);
            setSelectMode(false);
            return;
        }

        if (selectMode) {
            setRangeStart(ayatNum);
            return;
        }

        // Normal toggle
        const newSet = new Set(selectedAyats);
        if (newSet.has(ayatNum)) {
            newSet.delete(ayatNum);
        } else {
            newSet.add(ayatNum);
        }
        setSelectedAyats(newSet);
    };

    // Select all ayats
    const selectAllAyats = () => {
        if (!currentSurah) return;
        const all = new Set();
        for (let i = 1; i <= currentSurah.jumlahAyat; i++) all.add(i);
        setSelectedAyats(all);
    };

    // Deselect all ayats
    const deselectAllAyats = () => {
        setSelectedAyats(new Set());
        setRangeStart(null);
        setSelectMode(false);
    };

    // Mark selected ayats as read
    const markSelectedRead = async () => {
        if (!currentSurah || selectedAyats.size === 0) return;

        // Convert selectedAyats Set to sorted array
        const sorted = [...selectedAyats].sort((a, b) => a - b);

        // Group consecutive ayats into ranges
        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push({ start, end });
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push({ start, end });

        // Record each range sequentially
        for (const range of ranges) {
            await addQuranReading(currentSurah.nomor, range.start, range.end, selectedDateString);
        }

        setSelectedAyats(new Set());
    };

    // Reset selection when changing surah
    useEffect(() => {
        setSelectedAyats(new Set());
        setRangeStart(null);
        setSelectMode(false);
    }, [currentSurah?.nomor]);

    // Filter surahs
    const filteredSurahs = surahList.filter(s =>
        s.namaLatin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.arti.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nomor.toString() === searchQuery
    );

    // Group surahs by juz
    const juzGroups = (() => {
        // Map surahs to juz (approximate based on standard mushaf)
        const juzMapping = {
            1: [1, 2], 2: [2], 3: [2, 3], 4: [3, 4], 5: [4], 6: [4, 5],
            7: [5, 6], 8: [6, 7], 9: [7, 8], 10: [8, 9], 11: [9, 10, 11],
            12: [11, 12], 13: [12, 13, 14], 14: [15, 16], 15: [17, 18],
            16: [18, 19, 20], 17: [21, 22], 18: [23, 24, 25], 19: [25, 26, 27],
            20: [27, 28, 29], 21: [29, 30, 31, 32, 33], 22: [33, 34, 35, 36],
            23: [36, 37, 38, 39], 24: [39, 40, 41], 25: [41, 42, 43, 44, 45],
            26: [46, 47, 48, 49, 50, 51], 27: [51, 52, 53, 54, 55, 56, 57],
            28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
            29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
            30: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
        };
        const groups = {};
        for (let i = 1; i <= 30; i++) {
            groups[i] = {
                number: i,
                surahs: [],
                isComplete: (() => {
                    const juzSurahNums = juzMapping[i] || [];
                    return juzSurahNums.length > 0 && juzSurahNums.every(num => {
                        const sp = quranGlobalProgress.surahProgress.find(s => s.number === num);
                        return sp?.completed;
                    });
                })(),
            };
        }
        surahList.forEach(s => {
            for (const [juz, nums] of Object.entries(juzMapping)) {
                if (nums.includes(s.nomor)) {
                    if (!groups[juz].surahs.find(x => x.nomor === s.nomor)) {
                        groups[juz].surahs.push(s);
                    }
                }
            }
        });
        return groups;
    })();

    // ============ RENDER ============

    // Back button handler
    const handleBack = () => {
        stopAudio();
        setViewMode(VIEW_SURAH);
        setCurrentSurah(null);
        setAyatList([]);
    };

    // ---- READER VIEW ----
    if (viewMode === VIEW_READER) {
        return (
            <main className="main-content" style={{ paddingBottom: '70px' }}>
                {/* Reader Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                }}>
                    <button
                        onClick={handleBack}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--dark-700)',
                            border: 'none',
                            color: 'var(--dark-200)',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        ←
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'var(--dark-100)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {currentSurah?.namaLatin || 'Memuat...'}
                        </h2>
                        {currentSurah && (
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--dark-400)', margin: 0 }}>
                                    {currentSurah.arti} • {currentSurah.jumlahAyat} ayat • {currentSurah.tempatTurun}
                                </p>
                                {readAyatSet.size > 0 && (
                                    <p style={{ fontSize: '10px', color: '#10b981', margin: '2px 0 0 0', fontWeight: '600' }}>
                                        ✓ {readAyatSet.size}/{currentSurah.jumlahAyat} ayat sudah dibaca
                                        {readAyatSet.size === currentSurah.jumlahAyat && ' 🎉'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <span style={{
                        fontSize: '24px',
                        fontFamily: "'Scheherazade New', 'Amiri', serif",
                        color: 'var(--gold-400)',
                        direction: 'rtl',
                    }}>
                        {currentSurah?.nama || ''}
                    </span>
                </div>

                {/* Controls Bar */}
                {currentSurah && (
                    <div style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '10px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}>
                        {/* Qari selector & full audio */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                value={selectedQari}
                                onChange={(e) => {
                                    stopAudio();
                                    setSelectedQari(e.target.value);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    background: 'var(--dark-700)',
                                    border: '1px solid var(--dark-600)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--dark-200)',
                                    fontSize: '12px',
                                }}
                            >
                                {QARI_LIST.map(q => (
                                    <option key={q.id} value={q.id}>{q.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={playFullSurah}
                                style={{
                                    padding: '8px 14px',
                                    background: playingAyat === 'full'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(16, 185, 129, 0.15)',
                                    border: playingAyat === 'full'
                                        ? '1px solid rgba(239, 68, 68, 0.3)'
                                        : '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    color: playingAyat === 'full' ? '#f87171' : 'var(--success)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {playingAyat === 'full' ? '⏹ Stop' : '▶ Full'}
                            </button>
                        </div>

                        {/* Toggle options */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setShowTranslation(!showTranslation)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: showTranslation ? 'rgba(16, 185, 129, 0.15)' : 'var(--dark-700)',
                                    color: showTranslation ? 'var(--success)' : 'var(--dark-400)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                🇮🇩 Terjemahan
                            </button>
                            <button
                                onClick={() => setShowLatin(!showLatin)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: showLatin ? 'rgba(59, 130, 246, 0.15)' : 'var(--dark-700)',
                                    color: showLatin ? '#60a5fa' : 'var(--dark-400)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Aa Latin
                            </button>
                        </div>

                        {/* Selection controls */}
                        <div style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            paddingTop: '4px',
                            borderTop: '1px solid var(--dark-700)',
                        }}>
                            <button
                                onClick={() => {
                                    if (selectMode) {
                                        setSelectMode(false);
                                        setRangeStart(null);
                                    } else {
                                        setSelectMode(true);
                                        setRangeStart(null);
                                    }
                                }}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: selectMode ? 'rgba(139, 92, 246, 0.2)' : 'var(--dark-700)',
                                    color: selectMode ? '#a78bfa' : 'var(--dark-400)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                {selectMode ? (rangeStart ? `📍 Pilih akhir...` : '📍 Pilih awal...') : '↔️ Range'}
                            </button>
                            <button
                                onClick={selectAllAyats}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: 'var(--dark-700)',
                                    color: 'var(--dark-400)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                ☑️ Semua
                            </button>
                            {selectedAyats.size > 0 && (
                                <button
                                    onClick={deselectAllAyats}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        border: 'none',
                                        background: 'var(--dark-700)',
                                        color: 'var(--dark-400)',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✖ Batal
                                </button>
                            )}

                            <div style={{ flex: 1 }} />

                            {selectedAyats.size > 0 ? (
                                <button
                                    onClick={markSelectedRead}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-full)',
                                        border: 'none',
                                        background: 'var(--primary-gradient)',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✅ Tandai {selectedAyats.size} Ayat
                                </button>
                            ) : (
                                <button
                                    onClick={markSurahRead}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-full)',
                                        border: 'none',
                                        background: 'var(--primary-gradient)',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✅ Tandai Semua
                                </button>
                            )}
                        </div>

                        {/* Selection info */}
                        {selectedAyats.size > 0 && (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--emerald-400)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                            }}>
                                {(() => {
                                    const sorted = [...selectedAyats].sort((a, b) => a - b);
                                    if (sorted.length <= 5) return `Ayat terpilih: ${sorted.join(', ')}`;
                                    return `${sorted.length} ayat terpilih (${sorted[0]}–${sorted[sorted.length - 1]})`;
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* Loading */}
                {isLoadingAyat && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: 'var(--dark-400)',
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📖</div>
                        <p>Memuat surat...</p>
                    </div>
                )}

                {/* Bismillah */}
                {!isLoadingAyat && currentSurah && currentSurah.nomor !== 1 && currentSurah.nomor !== 9 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        marginBottom: '12px',
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(251, 191, 36, 0.1)',
                    }}>
                        <p style={{
                            fontSize: '28px',
                            fontFamily: "'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
                            color: 'var(--gold-400)',
                            direction: 'rtl',
                            lineHeight: 1.8,
                            margin: 0,
                        }}>
                            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                        </p>
                    </div>
                )}

                {/* Ayat List */}
                <div ref={readerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ayatList.map((ayat) => {
                        const isSelected = selectedAyats.has(ayat.nomorAyat);
                        const isRangeStart = selectMode && rangeStart === ayat.nomorAyat;
                        const isAlreadyRead = readAyatSet.has(ayat.nomorAyat);

                        return (
                            <div
                                key={ayat.nomorAyat}
                                ref={el => ayatRefs.current[ayat.nomorAyat] = el}
                                style={{
                                    background: isRangeStart
                                        ? 'rgba(139, 92, 246, 0.1)'
                                        : isSelected
                                            ? 'rgba(16, 185, 129, 0.06)'
                                            : playingAyat === ayat.nomorAyat
                                                ? 'rgba(16, 185, 129, 0.08)'
                                                : 'var(--dark-800)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '16px',
                                    border: isRangeStart
                                        ? '1px solid rgba(139, 92, 246, 0.3)'
                                        : isSelected
                                            ? '1px solid rgba(16, 185, 129, 0.2)'
                                            : playingAyat === ayat.nomorAyat
                                                ? '1px solid rgba(16, 185, 129, 0.2)'
                                                : '1px solid transparent',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {/* Ayat number + checkbox + play button */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleAyatSelection(ayat.nomorAyat)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                border: isSelected
                                                    ? '2px solid #10b981'
                                                    : isRangeStart
                                                        ? '2px solid #8b5cf6'
                                                        : '2px solid var(--dark-500)',
                                                background: isSelected
                                                    ? 'rgba(16, 185, 129, 0.2)'
                                                    : isRangeStart
                                                        ? 'rgba(139, 92, 246, 0.2)'
                                                        : 'transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {isSelected ? '✓' : isRangeStart ? '📍' : ''}
                                        </button>

                                        {/* Ayat number */}
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: 'var(--radius-full)',
                                            background: isAlreadyRead
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : 'rgba(251, 191, 36, 0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: isAlreadyRead ? '#10b981' : 'var(--gold-400)',
                                        }}>
                                            {ayat.nomorAyat}
                                        </div>

                                        {isAlreadyRead && (
                                            <span style={{
                                                fontSize: '9px',
                                                color: '#10b981',
                                                fontWeight: '600',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                padding: '2px 6px',
                                                borderRadius: 'var(--radius-full)',
                                            }}>
                                                ✓ Dibaca
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => playAyatAudio(ayat)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: 'var(--radius-full)',
                                            background: playingAyat === ayat.nomorAyat
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(16, 185, 129, 0.12)',
                                            border: 'none',
                                            color: playingAyat === ayat.nomorAyat
                                                ? '#f87171' : 'var(--success)',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {playingAyat === ayat.nomorAyat ? '⏸' : '▶'}
                                    </button>
                                </div>

                                {/* Arabic text */}
                                <p style={{
                                    fontSize: '26px',
                                    fontFamily: "'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
                                    color: 'var(--dark-50)',
                                    direction: 'rtl',
                                    textAlign: 'right',
                                    lineHeight: 2,
                                    margin: '0 0 10px 0',
                                    wordSpacing: '4px',
                                }}>
                                    {ayat.teksArab}
                                </p>

                                {/* Latin */}
                                {showLatin && ayat.teksLatin && (
                                    <p style={{
                                        fontSize: '13px',
                                        color: '#60a5fa',
                                        fontStyle: 'italic',
                                        lineHeight: 1.6,
                                        margin: '0 0 6px 0',
                                    }}>
                                        {ayat.teksLatin}
                                    </p>
                                )}

                                {/* Translation */}
                                {showTranslation && (
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'var(--dark-300)',
                                        lineHeight: 1.6,
                                        margin: 0,
                                    }}>
                                        {ayat.teksIndonesia}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Surah Navigation */}
                {currentSurah && !isLoadingAyat && (
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '16px',
                        paddingBottom: '20px',
                    }}>
                        {currentSurah.suratSebelumnya && (
                            <button
                                onClick={() => goToSurah(currentSurah.suratSebelumnya.nomor)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'var(--dark-700)',
                                    border: '1px solid var(--dark-600)',
                                    borderRadius: 'var(--radius-lg)',
                                    color: 'var(--dark-200)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginBottom: '2px' }}>← Sebelumnya</div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{currentSurah.suratSebelumnya.namaLatin}</div>
                            </button>
                        )}
                        {currentSurah.suratSelanjutnya && (
                            <button
                                onClick={() => goToSurah(currentSurah.suratSelanjutnya.nomor)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'var(--dark-700)',
                                    border: '1px solid var(--dark-600)',
                                    borderRadius: 'var(--radius-lg)',
                                    color: 'var(--dark-200)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginBottom: '2px' }}>Selanjutnya →</div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{currentSurah.suratSelanjutnya.namaLatin}</div>
                            </button>
                        )}
                    </div>
                )}
            </main>
        );
    }

    // ---- LIST VIEW (Surah / Juz) ----
    return (
        <main className="main-content">
            {/* Progress Header */}
            <div style={{
                background: 'var(--dark-800)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                marginBottom: '16px',
                textAlign: 'center',
                border: '1px solid rgba(251, 191, 36, 0.1)',
            }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📖</div>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--gold-400)',
                    marginBottom: '6px',
                }}>
                    Progress Tadarus
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--dark-300)', marginBottom: '14px' }}>
                    {quranGlobalProgress.totalRead.toLocaleString()} / {quranGlobalProgress.totalAyat.toLocaleString()} ayat • {quranGlobalProgress.completedSurahs}/114 surat
                </p>
                <div className="progress-bar" style={{ marginBottom: '6px' }}>
                    <div
                        className="progress-fill"
                        style={{ width: `${Math.min(quranGlobalProgress.percentage, 100)}%` }}
                    />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                    {quranGlobalProgress.percentage}% Khatam
                </p>

                {/* Last read bookmark */}
                {lastReadSurah && (
                    <button
                        onClick={() => openSurah(lastReadSurah, lastReadAyat)}
                        style={{
                            marginTop: '12px',
                            padding: '10px 20px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 'var(--radius-full)',
                            color: 'var(--success)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>📌</span>
                        <span>
                            Lanjut Baca — {surahList.find(s => s.nomor === lastReadSurah)?.namaLatin || `Surat ${lastReadSurah}`}
                            {lastReadAyat > 1 ? ` ayat ${lastReadAyat}` : ''}
                        </span>
                    </button>
                )}
            </div>

            {/* Tabs: Surah / Juz */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '12px',
                background: 'var(--dark-700)',
                padding: '4px',
                borderRadius: 'var(--radius-lg)',
            }}>
                {[
                    { id: 'surah', label: 'Per Surat', icon: '📄' },
                    { id: 'juz', label: 'Per Juz', icon: '📚' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveListTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: activeListTab === tab.id ? 'var(--emerald-600)' : 'transparent',
                            color: activeListTab === tab.id ? 'white' : 'var(--dark-400)',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'var(--transition-normal)',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            {activeListTab === 'surah' && (
                <div style={{ marginBottom: '12px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Cari surat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'var(--dark-700)',
                            border: '1px solid var(--dark-600)',
                            borderRadius: 'var(--radius-lg)',
                            color: 'var(--dark-100)',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
            )}

            {/* Loading */}
            {isLoadingList && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--dark-400)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
                    <p>Memuat daftar surat...</p>
                </div>
            )}

            {/* ====== SURAH LIST ====== */}
            {!isLoadingList && activeListTab === 'surah' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filteredSurahs.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px',
                            color: 'var(--dark-400)',
                            fontSize: '14px',
                        }}>
                            Tidak ditemukan surat "{searchQuery}"
                        </div>
                    ) : (
                        filteredSurahs.map(surah => {
                            const sp = quranGlobalProgress?.surahProgress?.find(s => s.number === surah.nomor);
                            const pct = sp?.percentage || 0;
                            const isComplete = pct === 100;
                            const hasProgress = pct > 0;

                            return (
                                <button
                                    key={surah.nomor}
                                    onClick={() => openSurah(surah.nomor)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--dark-800)',
                                        border: isComplete
                                            ? '1px solid rgba(16, 185, 129, 0.2)'
                                            : lastReadSurah === surah.nomor
                                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                                : '1px solid transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        width: '100%',
                                        transition: 'var(--transition-fast)',
                                    }}
                                >
                                    {/* Number badge */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: 'var(--radius-md)',
                                        background: isComplete
                                            ? 'rgba(16, 185, 129, 0.15)'
                                            : 'rgba(251, 191, 36, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isComplete ? '16px' : '13px',
                                        fontWeight: '700',
                                        color: isComplete ? '#10b981' : 'var(--gold-400)',
                                        flexShrink: 0,
                                    }}>
                                        {isComplete ? '✓' : surah.nomor}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: isComplete ? '#10b981' : 'var(--dark-100)',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            {surah.namaLatin}
                                            {lastReadSurah === surah.nomor && (
                                                <span style={{ fontSize: '10px' }}>📌</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                            {surah.arti} • {surah.jumlahAyat} ayat • {surah.tempatTurun}
                                        </div>
                                        {hasProgress && !isComplete && (
                                            <div style={{
                                                height: '3px',
                                                background: 'var(--dark-600)',
                                                borderRadius: '2px',
                                                overflow: 'hidden',
                                                marginTop: '5px',
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                                                    borderRadius: '2px',
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress or Arabic name */}
                                    {hasProgress && !isComplete ? (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#3b82f6',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            padding: '3px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            flexShrink: 0,
                                        }}>
                                            {pct}%
                                        </span>
                                    ) : (
                                        <span style={{
                                            fontSize: '20px',
                                            fontFamily: "'Scheherazade New', 'Amiri', serif",
                                            color: isComplete ? '#10b981' : 'var(--dark-300)',
                                            direction: 'rtl',
                                            flexShrink: 0,
                                        }}>
                                            {surah.nama}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* ====== JUZ LIST ====== */}
            {!isLoadingList && activeListTab === 'juz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.values(juzGroups).map(juz => (
                        <div
                            key={juz.number}
                            style={{
                                background: 'var(--dark-800)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: juz.isComplete
                                    ? '1px solid rgba(16, 185, 129, 0.2)'
                                    : '1px solid transparent',
                            }}
                        >
                            {/* Juz header */}
                            <div style={{
                                padding: '12px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                borderBottom: '1px solid var(--dark-700)',
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: 'var(--radius-full)',
                                    background: juz.isComplete
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : 'rgba(251, 191, 36, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: juz.isComplete ? 'var(--success)' : 'var(--gold-400)',
                                    flexShrink: 0,
                                }}>
                                    {juz.isComplete ? '✓' : juz.number}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        color: juz.isComplete ? 'var(--success)' : 'var(--dark-100)',
                                        fontSize: '14px',
                                    }}>
                                        Juz {juz.number}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                        {juz.surahs.length > 0
                                            ? `${juz.surahs[0].namaLatin} — ${juz.surahs[juz.surahs.length - 1].namaLatin}`
                                            : 'Memuat...'
                                        }
                                    </div>
                                </div>
                                {juz.isComplete && (
                                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>
                                        Selesai
                                    </span>
                                )}
                            </div>

                            {/* Surahs in Juz */}
                            <div style={{ padding: '4px' }}>
                                {juz.surahs.map(surah => (
                                    <button
                                        key={surah.nomor}
                                        onClick={() => openSurah(surah.nomor)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-400)',
                                            width: '24px',
                                            textAlign: 'center',
                                        }}>
                                            {surah.nomor}
                                        </span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: 'var(--dark-200)',
                                            flex: 1,
                                        }}>
                                            {surah.namaLatin}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-500)',
                                        }}>
                                            {surah.jumlahAyat} ayat
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
