'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const SURAHS = [
    { number: 1, name: 'Al-Fatihah', verses: 7, juz: 1, page: 1 },
    { number: 2, name: 'Al-Baqarah', verses: 286, juz: 1, page: 2 },
    { number: 3, name: 'Ali \'Imran', verses: 200, juz: 3, page: 50 },
    { number: 4, name: 'An-Nisa', verses: 176, juz: 4, page: 77 },
    { number: 5, name: 'Al-Ma\'idah', verses: 120, juz: 6, page: 106 },
    { number: 6, name: 'Al-An\'am', verses: 165, juz: 7, page: 128 },
    { number: 7, name: 'Al-A\'raf', verses: 206, juz: 8, page: 151 },
    { number: 8, name: 'Al-Anfal', verses: 75, juz: 9, page: 177 },
    { number: 9, name: 'At-Taubah', verses: 129, juz: 10, page: 187 },
    { number: 10, name: 'Yunus', verses: 109, juz: 11, page: 208 },
    { number: 11, name: 'Hud', verses: 123, juz: 11, page: 221 },
    { number: 12, name: 'Yusuf', verses: 111, juz: 12, page: 235 },
    { number: 13, name: 'Ar-Ra\'d', verses: 43, juz: 13, page: 249 },
    { number: 14, name: 'Ibrahim', verses: 52, juz: 13, page: 255 },
    { number: 15, name: 'Al-Hijr', verses: 99, juz: 14, page: 262 },
    { number: 16, name: 'An-Nahl', verses: 128, juz: 14, page: 267 },
    { number: 17, name: 'Al-Isra', verses: 111, juz: 15, page: 282 },
    { number: 18, name: 'Al-Kahf', verses: 110, juz: 15, page: 293 },
    { number: 19, name: 'Maryam', verses: 98, juz: 16, page: 305 },
    { number: 20, name: 'Taha', verses: 135, juz: 16, page: 312 },
    { number: 21, name: 'Al-Anbiya', verses: 112, juz: 17, page: 322 },
    { number: 22, name: 'Al-Hajj', verses: 78, juz: 17, page: 332 },
    { number: 23, name: 'Al-Mu\'minun', verses: 118, juz: 18, page: 342 },
    { number: 24, name: 'An-Nur', verses: 64, juz: 18, page: 350 },
    { number: 25, name: 'Al-Furqan', verses: 77, juz: 18, page: 359 },
    { number: 26, name: 'Asy-Syu\'ara', verses: 227, juz: 19, page: 367 },
    { number: 27, name: 'An-Naml', verses: 93, juz: 19, page: 377 },
    { number: 28, name: 'Al-Qasas', verses: 88, juz: 20, page: 385 },
    { number: 29, name: 'Al-Ankabut', verses: 69, juz: 20, page: 396 },
    { number: 30, name: 'Ar-Rum', verses: 60, juz: 21, page: 404 },
    { number: 36, name: 'Ya-Sin', verses: 83, juz: 22, page: 440 },
    { number: 67, name: 'Al-Mulk', verses: 30, juz: 29, page: 562 },
    { number: 78, name: 'An-Naba', verses: 40, juz: 30, page: 582 },
    { number: 112, name: 'Al-Ikhlas', verses: 4, juz: 30, page: 604 },
    { number: 113, name: 'Al-Falaq', verses: 5, juz: 30, page: 604 },
    { number: 114, name: 'An-Nas', verses: 6, juz: 30, page: 604 },
];

const JUZ_DATA = Array.from({ length: 30 }, (_, i) => ({
    number: i + 1,
    name: `Juz ${i + 1}`,
    startPage: i * 20 + 1,
    endPage: (i + 1) * 20,
}));

export default function QuranPage() {
    const { quranProgress, addPagesRead, updateQuranProgress } = useApp();
    const [activeTab, setActiveTab] = useState('juz');
    const [showModal, setShowModal] = useState(false);
    const [selectedJuz, setSelectedJuz] = useState(null);

    const handleJuzClick = (juz) => {
        setSelectedJuz(juz);
        setShowModal(true);
    };

    const markJuzComplete = () => {
        if (selectedJuz) {
            const newJuz = Math.max(quranProgress.currentJuz, selectedJuz.number);
            const newPages = selectedJuz.number * 20;
            updateQuranProgress(newJuz, Math.max(quranProgress.pagesRead, newPages));
            setShowModal(false);
        }
    };

    return (
        <main className="main-content">
            {/* Header Card */}
            <div className="stats-card">
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--gold-400)' }}>
                        Progress Tadarus
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--dark-300)' }}>
                        Juz {quranProgress.currentJuz} dari 30 • {quranProgress.pagesRead} halaman
                    </p>
                    <div className="progress-bar" style={{ marginTop: '20px' }}>
                        <div
                            className="progress-fill"
                            style={{ width: `${(quranProgress.pagesRead / 604) * 100}%` }}
                        ></div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--dark-400)', marginTop: '8px' }}>
                        {Math.round((quranProgress.pagesRead / 604) * 100)}% Khatam
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                background: 'var(--dark-700)',
                padding: '6px',
                borderRadius: 'var(--radius-lg)'
            }}>
                <button
                    onClick={() => setActiveTab('juz')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: activeTab === 'juz' ? 'var(--emerald-600)' : 'transparent',
                        color: activeTab === 'juz' ? 'white' : 'var(--dark-400)',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'var(--transition-normal)'
                    }}
                >
                    Per Juz
                </button>
                <button
                    onClick={() => setActiveTab('surah')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: activeTab === 'surah' ? 'var(--emerald-600)' : 'transparent',
                        color: activeTab === 'surah' ? 'white' : 'var(--dark-400)',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'var(--transition-normal)'
                    }}
                >
                    Per Surah
                </button>
            </div>

            {/* Juz List */}
            {activeTab === 'juz' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {JUZ_DATA.map((juz) => {
                        const isCompleted = quranProgress.currentJuz > juz.number ||
                            (quranProgress.currentJuz === juz.number && quranProgress.pagesRead >= juz.endPage);
                        const isCurrent = quranProgress.currentJuz === juz.number;

                        return (
                            <button
                                key={juz.number}
                                onClick={() => handleJuzClick(juz)}
                                style={{
                                    padding: '16px 8px',
                                    borderRadius: 'var(--radius-md)',
                                    border: isCurrent ? '2px solid var(--gold-400)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isCompleted
                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))'
                                        : 'var(--dark-700)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition-normal)',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: isCompleted ? 'var(--emerald-400)' : 'var(--dark-200)',
                                    marginBottom: '4px'
                                }}>
                                    {juz.number}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--dark-400)' }}>
                                    {isCompleted ? '✓ Selesai' : isCurrent ? '📖 Sedang' : 'Juz'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Surah List */}
            {activeTab === 'surah' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {SURAHS.map((surah) => (
                        <div
                            key={surah.number}
                            style={{
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--dark-700)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(251, 191, 36, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--gold-400)'
                            }}>
                                {surah.number}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: 'var(--dark-100)', fontSize: '14px' }}>
                                    {surah.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                    {surah.verses} ayat • Juz {surah.juz} • Hal. {surah.page}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <div className={`modal-overlay ${showModal ? 'active' : ''}`} onClick={() => setShowModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Juz {selectedJuz?.number}</h2>
                        <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                    </div>

                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                        <p style={{ color: 'var(--dark-300)', marginBottom: '24px' }}>
                            Halaman {selectedJuz?.startPage} - {selectedJuz?.endPage}
                        </p>

                        <button className="btn btn-primary" onClick={markJuzComplete}>
                            <span>✓</span>
                            <span>Tandai Selesai</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
