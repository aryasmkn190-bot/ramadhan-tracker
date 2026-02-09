'use client';

import { useState, useEffect } from 'react';
import { getRandomDoa, getAllDoa } from '../lib/equran';

export default function DoaCard() {
    const [doa, setDoa] = useState(null);
    const [allDoa, setAllDoa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFull, setShowFull] = useState(false);

    useEffect(() => {
        loadDoa();
    }, []);

    const loadDoa = async () => {
        setLoading(true);
        const all = await getAllDoa();
        setAllDoa(all);

        // Pick random doa
        if (all.length > 0) {
            const randomIndex = Math.floor(Math.random() * all.length);
            setDoa(all[randomIndex]);
        }
        setLoading(false);
    };

    const getNextDoa = () => {
        if (allDoa.length === 0) return;
        const randomIndex = Math.floor(Math.random() * allDoa.length);
        setDoa(allDoa[randomIndex]);
        setShowFull(false);
    };

    if (loading) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(76, 29, 149, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                textAlign: 'center',
            }}>
                <div style={{ color: 'var(--dark-300)' }}>Memuat doa...</div>
            </div>
        );
    }

    if (!doa) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(76, 29, 149, 0.2) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>
                    🤲 Doa Harian
                </h3>
                <button
                    onClick={getNextDoa}
                    style={{
                        background: 'rgba(139, 92, 246, 0.3)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '12px',
                    }}
                >
                    🔄 Doa Lain
                </button>
            </div>

            {/* Doa Title */}
            <div style={{
                background: 'rgba(139, 92, 246, 0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                marginBottom: '12px',
                display: 'inline-block',
            }}>
                <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: '500' }}>
                    {doa.nama || doa.judul}
                </span>
            </div>

            {/* Arabic Text */}
            <div style={{
                textAlign: 'right',
                fontSize: '22px',
                lineHeight: '2',
                color: 'white',
                marginBottom: '16px',
                fontFamily: "'Amiri', serif",
                direction: 'rtl',
            }}>
                {doa.arab}
            </div>

            {/* Latin */}
            {showFull && doa.latin && (
                <div style={{
                    color: 'var(--dark-300)',
                    fontSize: '13px',
                    fontStyle: 'italic',
                    marginBottom: '12px',
                    lineHeight: '1.6',
                }}>
                    {doa.latin}
                </div>
            )}

            {/* Translation */}
            <div style={{
                color: 'var(--dark-200)',
                fontSize: '14px',
                lineHeight: '1.6',
                borderLeft: '3px solid rgba(139, 92, 246, 0.5)',
                paddingLeft: '12px',
            }}>
                "{doa.arti || doa.terjemah}"
            </div>

            {/* Source */}
            {doa.sumber && (
                <div style={{
                    color: 'var(--dark-400)',
                    fontSize: '11px',
                    marginTop: '12px',
                }}>
                    📖 {doa.sumber}
                </div>
            )}

            {/* Toggle button */}
            {doa.latin && (
                <button
                    onClick={() => setShowFull(!showFull)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#a78bfa',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginTop: '12px',
                        padding: 0,
                    }}
                >
                    {showFull ? '▲ Sembunyikan Latin' : '▼ Tampilkan Latin'}
                </button>
            )}
        </div>
    );
}
