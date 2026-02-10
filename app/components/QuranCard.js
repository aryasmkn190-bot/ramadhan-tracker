'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';

export default function QuranCard() {
    const { quranProgress, addPagesRead, resetQuranProgress } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [pages, setPages] = useState('');

    const totalPages = 604; // Total pages in Al-Quran
    const progressPercentage = Math.round((quranProgress.pagesRead / totalPages) * 100);

    const handleAddPages = () => {
        const pageCount = parseInt(pages);
        if (pageCount > 0) {
            addPagesRead(pageCount);
            setPages('');
            setShowModal(false);
        }
    };

    const handleReset = () => {
        resetQuranProgress();
        setShowResetConfirm(false);
    };

    return (
        <>
            <div className="quran-card">
                <div className="quran-header">
                    <div className="quran-title">
                        <span>📖</span>
                        <span>Progress Al-Quran</span>
                    </div>
                    <span className="quran-juz">Juz {quranProgress.currentJuz}/30</span>
                </div>

                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>

                <div className="progress-labels">
                    <span className="progress-current">{quranProgress.pagesRead} halaman</span>
                    <span>{totalPages} halaman</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="add-quran-btn"
                        onClick={() => setShowModal(true)}
                        style={{ flex: 1 }}
                    >
                        <span>➕</span>
                        <span>Tambah Halaman</span>
                    </button>

                    {quranProgress.pagesRead > 0 && (
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Reset progress"
                        >
                            🔄
                        </button>
                    )}
                </div>
            </div>

            {/* Add Pages Modal */}
            <div className={`modal-overlay ${showModal ? 'active' : ''}`} onClick={() => setShowModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Tambah Tadarus</h2>
                        <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Jumlah Halaman</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Contoh: 10"
                            value={pages}
                            onChange={(e) => setPages(e.target.value)}
                            min="1"
                        />
                    </div>

                    <button className="btn btn-primary" onClick={handleAddPages}>
                        <span>📖</span>
                        <span>Simpan Progress</span>
                    </button>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
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
                            Progress saat ini: <strong>{quranProgress.pagesRead} halaman</strong>
                        </p>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px' }}>
                            Tindakan ini akan mereset progress Al-Quran Anda kembali ke 0.
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
                            onClick={handleReset}
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
