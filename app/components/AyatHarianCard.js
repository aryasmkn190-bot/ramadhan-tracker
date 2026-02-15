'use client';

import { useState, useEffect, useRef } from 'react';
import { getRandomAyat, getDailyAyat } from '../lib/equran';

export default function AyatHarianCard() {
    const [ayatData, setAyatData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showFull, setShowFull] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        loadDailyAyat();
    }, []);

    const loadDailyAyat = async () => {
        setLoading(true);
        const data = await getDailyAyat();
        setAyatData(data);
        setLoading(false);
        setShowFull(false);
        setIsPlaying(false);
    };

    const loadRandomAyat = async () => {
        setLoading(true);
        const data = await getRandomAyat();
        try {
            if (data?.ayat?.audio?.['05']) {
                // Preload audio if possible, or just reset state
            }
        } catch (e) { }
        setAyatData(data);
        setLoading(false);
        setShowFull(false);
        setIsPlaying(false);
    };

    const toggleAudio = () => {
        if (!audioRef.current || !ayatData?.ayat?.audio?.['05']) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.src = ayatData.ayat.audio['05']; // Misyari Al-Afasy
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    if (loading) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(120, 53, 15, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                textAlign: 'center',
            }}>
                <div style={{ color: 'var(--dark-300)' }}>Memuat ayat...</div>
            </div>
        );
    }

    if (!ayatData) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(120, 53, 15, 0.2) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
        }}>
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--dark-100)', margin: 0, fontSize: '16px' }}>
                    📖 Ayat Hari Ini
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {ayatData.ayat.audio && (
                        <button
                            onClick={toggleAudio}
                            style={{
                                background: isPlaying ? 'var(--gold)' : 'rgba(245, 158, 11, 0.3)',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                color: isPlaying ? 'black' : 'var(--dark-100)',
                                fontSize: '12px',
                            }}
                        >
                            {isPlaying ? '⏸️ Pause' : '🔊 Dengar'}
                        </button>
                    )}
                    <button
                        onClick={loadRandomAyat}
                        style={{
                            background: 'rgba(245, 158, 11, 0.3)',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            color: 'var(--dark-100)',
                            fontSize: '12px',
                        }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Surat Info */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
            }}>
                <span style={{
                    background: 'var(--gold)',
                    color: 'black',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: '600',
                }}>
                    {ayatData.surat.namaLatin} : {ayatData.ayat.nomor}
                </span>
                <span style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
                    {ayatData.surat.arti}
                </span>
            </div>

            {/* Arabic Text */}
            <div style={{
                textAlign: 'right',
                fontSize: '26px',
                lineHeight: '2.2',
                color: 'var(--dark-100)',
                marginBottom: '16px',
                fontFamily: "'Amiri', serif",
                direction: 'rtl',
            }}>
                {ayatData.ayat.arab}
            </div>

            {/* Latin (collapsible) */}
            {showFull && (
                <div style={{
                    color: 'var(--dark-300)',
                    fontSize: '13px',
                    fontStyle: 'italic',
                    marginBottom: '12px',
                    lineHeight: '1.6',
                }}>
                    {ayatData.ayat.latin}
                </div>
            )}

            {/* Translation */}
            <div style={{
                color: 'var(--dark-200)',
                fontSize: '14px',
                lineHeight: '1.7',
                borderLeft: '3px solid var(--gold)',
                paddingLeft: '12px',
            }}>
                "{ayatData.ayat.arti}"
            </div>

            {/* Toggle button */}
            <button
                onClick={() => setShowFull(!showFull)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '12px',
                    padding: 0,
                }}
            >
                {showFull ? '▲ Sembunyikan Latin' : '▼ Tampilkan Latin'}
            </button>
        </div>
    );
}
