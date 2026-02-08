'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';

export default function QuranCard() {
    const { quranProgress, addPagesRead } = useApp();
    const [showModal, setShowModal] = useState(false);
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

                <button
                    className="add-quran-btn"
                    onClick={() => setShowModal(true)}
                >
                    <span>➕</span>
                    <span>Tambah Halaman Hari Ini</span>
                </button>
            </div>

            {/* Modal */}
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
        </>
    );
}
