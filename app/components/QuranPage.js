'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
        quranProgress,
        addPagesRead,
        updateQuranProgress,
        addToast,
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

    // Mark surah as read (approximate pages)
    const markSurahRead = () => {
        if (!currentSurah) return;
        const surahInfo = surahList.find(s => s.nomor === currentSurah.nomor);
        if (!surahInfo) return;

        // Approximate pages: total 604 pages, 6236 ayat -> ~10.3 ayat per page
        const approxPages = Math.max(1, Math.round(currentSurah.jumlahAyat / 10.3));
        addPagesRead(approxPages);
        addToast(`✅ QS. ${currentSurah.namaLatin} selesai! (+${approxPages} halaman)`, 'success');
    };

    // Filter surahs
    const filteredSurahs = surahList.filter(s =>
        s.namaLatin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.arti.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nomor.toString() === searchQuery
    );

    // Group surahs by juz
    const juzGroups = (() => {
        const groups = {};
        for (let i = 1; i <= 30; i++) {
            groups[i] = {
                number: i,
                surahs: [],
                isComplete: quranProgress.currentJuz > i ||
                    (quranProgress.currentJuz === i && quranProgress.pagesRead >= i * 20),
            };
        }
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
                            <p style={{ fontSize: '11px', color: 'var(--dark-400)', margin: 0 }}>
                                {currentSurah.arti} • {currentSurah.jumlahAyat} ayat • {currentSurah.tempatTurun}
                            </p>
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
                            <div style={{ flex: 1 }} />
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
                                ✅ Tandai Selesai
                            </button>
                        </div>
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
                    {ayatList.map((ayat) => (
                        <div
                            key={ayat.nomorAyat}
                            ref={el => ayatRefs.current[ayat.nomorAyat] = el}
                            style={{
                                background: playingAyat === ayat.nomorAyat
                                    ? 'rgba(16, 185, 129, 0.08)'
                                    : 'var(--dark-800)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '16px',
                                border: playingAyat === ayat.nomorAyat
                                    ? '1px solid rgba(16, 185, 129, 0.2)'
                                    : '1px solid transparent',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {/* Ayat number + play button */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px',
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(251, 191, 36, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'var(--gold-400)',
                                }}>
                                    {ayat.nomorAyat}
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
                    ))}
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
                    Juz {quranProgress.currentJuz}/30 • {quranProgress.pagesRead} halaman
                </p>
                <div className="progress-bar" style={{ marginBottom: '6px' }}>
                    <div
                        className="progress-fill"
                        style={{ width: `${Math.min((quranProgress.pagesRead / 604) * 100, 100)}%` }}
                    />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                    {Math.round((quranProgress.pagesRead / 604) * 100)}% Khatam
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
                        filteredSurahs.map(surah => (
                            <button
                                key={surah.nomor}
                                onClick={() => openSurah(surah.nomor)}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--dark-800)',
                                    border: lastReadSurah === surah.nomor
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
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: 'var(--gold-400)',
                                    flexShrink: 0,
                                }}>
                                    {surah.nomor}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        color: 'var(--dark-100)',
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
                                </div>

                                {/* Arabic name */}
                                <span style={{
                                    fontSize: '20px',
                                    fontFamily: "'Scheherazade New', 'Amiri', serif",
                                    color: 'var(--dark-300)',
                                    direction: 'rtl',
                                    flexShrink: 0,
                                }}>
                                    {surah.nama}
                                </span>
                            </button>
                        ))
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
