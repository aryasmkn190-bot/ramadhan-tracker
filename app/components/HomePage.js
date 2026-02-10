'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import StatsCard from './StatsCard';
import ActivityCard from './ActivityCard';
import QuranCard from './QuranCard';
import DaySelector from './DaySelector';
import JadwalShalatCard from './JadwalShalatCard';
import DoaCard from './DoaCard';
import AyatHarianCard from './AyatHarianCard';

// Category labels and icons for custom activities
const CATEGORY_INFO = {
    istirahat: { label: 'Istirahat', icon: '😴' },
    produktifitas: { label: 'Produktifitas', icon: '💼' },
    sosial: { label: 'Sosial', icon: '🤝' },
    kesehatan: { label: 'Kesehatan', icon: '🏃' },
    pendidikan: { label: 'Pendidikan', icon: '📚' },
    lainnya: { label: 'Lainnya', icon: '📌' },
};

export default function HomePage() {
    const {
        getSelectedDayActivities,
        DEFAULT_PRAYERS,
        DEFAULT_SUNNAH,
        DEFAULT_ACTIVITIES,
        customActivities,
        selectedRamadanDay,
        isSelectedDayToday,
        toggleActivity,
        addCustomActivityToDay,
        removeCustomActivityFromDay,
        getAddedCustomActivitiesForDay,
    } = useApp();

    const [showActivityPicker, setShowActivityPicker] = useState(false);

    const dayActivities = getSelectedDayActivities();

    // Filter default activities
    const prayers = dayActivities.filter(a => DEFAULT_PRAYERS.some(p => p.id === a.id));
    const sunnah = dayActivities.filter(a => DEFAULT_SUNNAH.some(s => s.id === a.id));
    const activities = dayActivities.filter(a => DEFAULT_ACTIVITIES.some(act => act.id === a.id));

    // Custom activities that user has ADDED for this day (with status)
    const addedCustomActivities = dayActivities.filter(a => a.isCustom);

    // All available custom activities from admin (for the picker)
    const addedIds = addedCustomActivities.map(a => a.id);

    // Group added custom activities by category
    const customByCategory = addedCustomActivities.reduce((acc, act) => {
        const cat = act.category || 'lainnya';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(act);
        return acc;
    }, {});

    // Group available activities by category for picker
    const availableByCategory = customActivities.reduce((acc, act) => {
        const cat = act.category || 'lainnya';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(act);
        return acc;
    }, {});

    // Check if there are any custom activities from admin
    const hasAvailableActivities = customActivities.length > 0;

    return (
        <main className="main-content">
            {/* Day Selector (1-30 Ramadhan) */}
            <DaySelector />

            {/* Stats Card */}
            <StatsCard />

            {/* Daily Content (Always visible) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <JadwalShalatCard />
                <AyatHarianCard />
                <DoaCard />
            </div>

            {/* Sholat Wajib */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>🕌</span>
                        Sholat Wajib
                    </h2>
                    <span className="section-action">
                        {prayers.filter(p => p.completed).length}/{prayers.length}
                    </span>
                </div>
                {prayers.map(prayer => (
                    <ActivityCard key={prayer.id} activity={prayer} />
                ))}
            </section>

            {/* Sholat Sunnah */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>⭐</span>
                        Sholat Sunnah
                    </h2>
                    <span className="section-action">
                        {sunnah.filter(s => s.completed).length}/{sunnah.length}
                    </span>
                </div>
                {sunnah.map(s => (
                    <ActivityCard key={s.id} activity={s} />
                ))}
            </section>

            {/* Aktivitas Ramadhan */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>☪️</span>
                        Aktivitas Ramadhan
                    </h2>
                    <span className="section-action">
                        {activities.filter(a => a.completed).length}/{activities.length}
                    </span>
                </div>
                {activities.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </section>

            {/* Custom Activities Section */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>📋</span>
                        Aktivitas Lainnya
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {addedCustomActivities.length > 0 && (
                            <span className="section-action">
                                {addedCustomActivities.filter(a => a.completed).length}/{addedCustomActivities.length}
                            </span>
                        )}
                        {hasAvailableActivities && (
                            <button
                                onClick={() => setShowActivityPicker(true)}
                                style={{
                                    padding: '6px 14px',
                                    background: 'var(--primary-gradient)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <span>+</span>
                                <span>Tambahkan</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Added custom activities list */}
                {addedCustomActivities.length > 0 ? (
                    Object.entries(customByCategory).map(([category, catActivities]) => {
                        const categoryInfo = CATEGORY_INFO[category] || CATEGORY_INFO.lainnya;
                        return (
                            <div key={category} style={{ marginBottom: '8px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--dark-500)',
                                    marginBottom: '6px',
                                    marginLeft: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <span>{categoryInfo.icon}</span>
                                    <span>{categoryInfo.label}</span>
                                </div>
                                {catActivities.map(activity => (
                                    <div key={activity.id} style={{ position: 'relative' }}>
                                        <ActivityCard activity={activity} />
                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomActivityFromDay(activity.id);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: '48px',
                                                transform: 'translateY(-50%)',
                                                width: '28px',
                                                height: '28px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: 'var(--radius-full)',
                                                color: '#f87171',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            title="Hapus dari hari ini"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                ) : (
                    <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--dark-500)',
                        fontSize: '13px',
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                        {hasAvailableActivities ? (
                            <p>Klik <strong>"+ Tambahkan"</strong> untuk menambahkan aktivitas ke hari ini</p>
                        ) : (
                            <p>Belum ada aktivitas custom dari admin</p>
                        )}
                    </div>
                )}
            </section>

            {/* Tadarus Al-Quran */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>📖</span>
                        Tadarus Al-Quran
                    </h2>
                </div>
                <QuranCard />
            </section>

            {/* Note for other days */}
            {!isSelectedDayToday && (
                <div style={{
                    padding: '16px',
                    background: 'var(--dark-700)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    marginTop: '8px',
                }}>
                    <p style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
                        📌 Anda sedang melihat hari lain (Hari {selectedRamadanDay})
                    </p>
                </div>
            )}

            {/* Activity Picker Modal */}
            {showActivityPicker && (
                <div
                    className="modal-overlay active"
                    onClick={() => setShowActivityPicker(false)}
                >
                    <div
                        className="modal-content"
                        style={{
                            maxHeight: '80vh',
                            paddingBottom: '24px',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-handle" />

                        <div className="modal-header">
                            <h2 className="modal-title">Tambah Aktivitas — Hari {selectedRamadanDay}</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowActivityPicker(false)}
                            >
                                ×
                            </button>
                        </div>

                        <p style={{
                            color: 'var(--dark-400)',
                            fontSize: '13px',
                            textAlign: 'center',
                            marginBottom: '20px',
                        }}>
                            Pilih aktivitas untuk ditambahkan ke hari ini
                        </p>

                        <div style={{
                            overflowY: 'auto',
                            maxHeight: 'calc(80vh - 200px)',
                            paddingRight: '4px',
                        }}>
                            {Object.entries(availableByCategory).map(([category, catActivities]) => {
                                const categoryInfo = CATEGORY_INFO[category] || CATEGORY_INFO.lainnya;
                                return (
                                    <div key={category} style={{ marginBottom: '20px' }}>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'var(--dark-200)',
                                            marginBottom: '10px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <span style={{ fontSize: '16px' }}>{categoryInfo.icon}</span>
                                            <span>{categoryInfo.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {catActivities.map(activity => {
                                                const isAdded = addedIds.includes(activity.id);

                                                return (
                                                    <button
                                                        key={activity.id}
                                                        onClick={() => {
                                                            if (isAdded) {
                                                                removeCustomActivityFromDay(activity.id);
                                                            } else {
                                                                addCustomActivityToDay(activity.id);
                                                            }
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '14px',
                                                            padding: '14px 16px',
                                                            background: isAdded
                                                                ? 'rgba(16, 185, 129, 0.12)'
                                                                : 'var(--dark-700)',
                                                            border: isAdded
                                                                ? '2px solid var(--success)'
                                                                : '2px solid transparent',
                                                            borderRadius: 'var(--radius-lg)',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontSize: '28px',
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'var(--dark-600)',
                                                            borderRadius: 'var(--radius-md)',
                                                        }}>
                                                            {activity.icon}
                                                        </span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{
                                                                color: isAdded ? 'var(--success)' : 'var(--dark-100)',
                                                                fontWeight: '600',
                                                                fontSize: '14px',
                                                            }}>
                                                                {activity.name}
                                                            </div>
                                                            {activity.description && (
                                                                <div style={{
                                                                    fontSize: '12px',
                                                                    color: 'var(--dark-400)',
                                                                    marginTop: '3px',
                                                                }}>
                                                                    {activity.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 'var(--radius-full)',
                                                            background: isAdded
                                                                ? 'rgba(239, 68, 68, 0.15)'
                                                                : 'rgba(16, 185, 129, 0.15)',
                                                            color: isAdded ? '#f87171' : 'var(--success)',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            flexShrink: 0,
                                                        }}>
                                                            {isAdded ? 'Hapus' : 'Tambah'}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowActivityPicker(false)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--primary-gradient)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginTop: '16px',
                                fontSize: '14px',
                            }}
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
