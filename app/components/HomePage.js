'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import StatsCard from './StatsCard';
import ActivityCard from './ActivityCard';
import QuranCard from './QuranCard';
import DaySelector from './DaySelector';
import JadwalShalatCard from './JadwalShalatCard';
import DoaCard from './DoaCard';
import AyatHarianCard from './AyatHarianCard';


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
        announcements,
        activityCategories,
    } = useApp();

    // Build CATEGORY_INFO map from dynamic categories
    const CATEGORY_INFO = useMemo(() => {
        const map = {};
        activityCategories.forEach(cat => {
            map[cat.id] = { label: cat.label, icon: cat.icon };
        });
        // Always ensure 'lainnya' exists as fallback
        if (!map.lainnya) map.lainnya = { label: 'Lainnya', icon: '📌' };
        return map;
    }, [activityCategories]);

    const [showActivityPicker, setShowActivityPicker] = useState(false);

    // Collapsible sections state — persisted to localStorage
    const [collapsedSections, setCollapsedSections] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('collapsedSections');
                return saved ? JSON.parse(saved) : {};
            } catch { return {}; }
        }
        return {};
    });

    const toggleSection = (sectionId) => {
        setCollapsedSections(prev => {
            const next = { ...prev, [sectionId]: !prev[sectionId] };
            try { localStorage.setItem('collapsedSections', JSON.stringify(next)); } catch { }
            return next;
        });
    };

    // Announcement Slider State
    const [announcementIndex, setAnnouncementIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [expandedAnnouncement, setExpandedAnnouncement] = useState(false);

    // Auto-slide announcements
    useEffect(() => {
        if (!announcements || announcements.length <= 1) return;
        const interval = setInterval(() => {
            setAnnouncementIndex(prev => (prev + 1) % announcements.length);
            setExpandedAnnouncement(false);
        }, 10000);
        return () => clearInterval(interval);
    }, [announcements]);

    // Swipe handlers for announcements
    const onAnnouncementTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onAnnouncementTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onAnnouncementTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            setAnnouncementIndex(prev => (prev + 1) % announcements.length);
            setExpandedAnnouncement(false);
        } else if (isRightSwipe) {
            setAnnouncementIndex(prev => (prev - 1 + announcements.length) % announcements.length);
            setExpandedAnnouncement(false);
        }
    };

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
            {/* Announcement Banner Section */}
            {announcements && announcements.length > 0 && (
                <section
                    style={{ marginBottom: '16px' }}
                    onTouchStart={onAnnouncementTouchStart}
                    onTouchMove={onAnnouncementTouchMove}
                    onTouchEnd={onAnnouncementTouchEnd}
                >
                    <div style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                        backdropFilter: 'blur(8px)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Decorative glow */}
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            right: '-20px',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15), transparent)',
                            pointerEvents: 'none',
                        }} />

                        {/* Header row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '18px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(251, 191, 36, 0.2)',
                                    borderRadius: 'var(--radius-md)',
                                }}>📢</span>
                                <div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        color: 'var(--gold-400)',
                                        lineHeight: '1.3',
                                    }}>
                                        {announcements[announcementIndex].title}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        color: 'var(--dark-500)',
                                        marginTop: '2px',
                                    }}>
                                        {new Date(announcements[announcementIndex].created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            </div>

                            {announcements.length > 1 && (
                                <span style={{
                                    fontSize: '10px',
                                    color: 'var(--dark-400)',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: '600',
                                }}>
                                    {announcementIndex + 1}/{announcements.length}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <p
                            onClick={() => {
                                if (announcements[announcementIndex].content.length > 120) {
                                    setExpandedAnnouncement(!expandedAnnouncement);
                                }
                            }}
                            style={{
                                fontSize: '12px',
                                color: 'var(--dark-200)',
                                lineHeight: '1.6',
                                margin: 0,
                                cursor: announcements[announcementIndex].content.length > 120 ? 'pointer' : 'default',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {expandedAnnouncement
                                ? announcements[announcementIndex].content
                                : (announcements[announcementIndex].content.length > 120
                                    ? announcements[announcementIndex].content.substring(0, 120) + '...'
                                    : announcements[announcementIndex].content
                                )
                            }
                        </p>

                        {announcements[announcementIndex].content.length > 120 && (
                            <button
                                onClick={() => setExpandedAnnouncement(!expandedAnnouncement)}
                                style={{
                                    marginTop: '6px',
                                    fontSize: '11px',
                                    color: 'var(--gold-400)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    padding: 0,
                                }}
                            >
                                {expandedAnnouncement ? 'Sembunyikan ▲' : 'Selengkapnya ▼'}
                            </button>
                        )}

                        {/* Dots Indicator */}
                        {announcements.length > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '5px',
                                marginTop: '10px',
                            }}>
                                {announcements.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setAnnouncementIndex(idx);
                                            setExpandedAnnouncement(false);
                                        }}
                                        style={{
                                            width: idx === announcementIndex ? '18px' : '6px',
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: idx === announcementIndex ? 'var(--gold-400)' : 'var(--dark-600)',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

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
                <div className="section-header" onClick={() => toggleSection('prayers')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <h2 className="section-title">
                        <span>🕌</span>
                        Sholat Wajib
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="section-action">
                            {prayers.filter(p => p.completed).length}/{prayers.length}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--dark-400)', transition: 'transform 0.2s ease', transform: collapsedSections.prayers ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                </div>
                <div style={{ overflow: 'hidden', maxHeight: collapsedSections.prayers ? '0px' : '2000px', opacity: collapsedSections.prayers ? 0 : 1, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
                    {prayers.map(prayer => (
                        <ActivityCard key={prayer.id} activity={prayer} />
                    ))}
                </div>
            </section>

            {/* Sholat Sunnah */}
            <section className="section">
                <div className="section-header" onClick={() => toggleSection('sunnah')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <h2 className="section-title">
                        <span>⭐</span>
                        Sholat Sunnah
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="section-action">
                            {sunnah.filter(s => s.completed).length}/{sunnah.length}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--dark-400)', transition: 'transform 0.2s ease', transform: collapsedSections.sunnah ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                </div>
                <div style={{ overflow: 'hidden', maxHeight: collapsedSections.sunnah ? '0px' : '2000px', opacity: collapsedSections.sunnah ? 0 : 1, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
                    {sunnah.map(s => (
                        <ActivityCard key={s.id} activity={s} />
                    ))}
                </div>
            </section>

            {/* Aktivitas Ramadhan */}
            <section className="section">
                <div className="section-header" onClick={() => toggleSection('ramadhan')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <h2 className="section-title">
                        <span>☪️</span>
                        Aktivitas Ramadhan
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="section-action">
                            {activities.filter(a => a.completed).length}/{activities.length}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--dark-400)', transition: 'transform 0.2s ease', transform: collapsedSections.ramadhan ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                </div>
                <div style={{ overflow: 'hidden', maxHeight: collapsedSections.ramadhan ? '0px' : '2000px', opacity: collapsedSections.ramadhan ? 0 : 1, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
                    {activities.map(activity => (
                        <ActivityCard key={activity.id} activity={activity} />
                    ))}
                </div>
            </section>

            {/* Tugas Section — separate from other custom activities */}
            {customByCategory['amanah'] && customByCategory['amanah'].length > 0 && (
                <section className="section">
                    <div className="section-header" onClick={() => toggleSection('tugas')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <h2 className="section-title">
                            <span>🎯</span>
                            Tugas
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="section-action">
                                {customByCategory['amanah'].filter(a => a.completed).length}/{customByCategory['amanah'].length}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--dark-400)', transition: 'transform 0.2s ease', transform: collapsedSections.tugas ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                        </div>
                    </div>
                    <div style={{ overflow: 'hidden', maxHeight: collapsedSections.tugas ? '0px' : '2000px', opacity: collapsedSections.tugas ? 0 : 1, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
                        {customByCategory['amanah'].map(activity => (
                            <div key={activity.id} style={{ position: 'relative' }}>
                                <ActivityCard activity={activity} />
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
                </section>
            )}

            {/* Custom Activities Section (non-amanah) */}
            <section className="section">
                <div className="section-header" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <h2 className="section-title" onClick={() => toggleSection('custom')} style={{ cursor: 'pointer' }}>
                        <span>📋</span>
                        Aktivitas Lainnya
                        <span style={{ fontSize: '12px', color: 'var(--dark-400)', transition: 'transform 0.2s ease', transform: collapsedSections.custom ? 'rotate(-90deg)' : 'rotate(0deg)', marginLeft: '4px' }}>▼</span>
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {addedCustomActivities.filter(a => a.category !== 'amanah').length > 0 && (
                            <span className="section-action">
                                {addedCustomActivities.filter(a => a.category !== 'amanah' && a.completed).length}/{addedCustomActivities.filter(a => a.category !== 'amanah').length}
                            </span>
                        )}
                        {hasAvailableActivities && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowActivityPicker(true); }}
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

                {/* Added custom activities list (non-amanah only) */}
                <div style={{ overflow: 'hidden', maxHeight: collapsedSections.custom ? '0px' : '5000px', opacity: collapsedSections.custom ? 0 : 1, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
                    {(() => {
                        const nonAmanahCategories = Object.entries(customByCategory).filter(([cat]) => cat !== 'amanah');
                        return nonAmanahCategories.length > 0 ? (
                            nonAmanahCategories.map(([category, catActivities]) => {
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
                        );
                    })()}
                </div>
            </section>

            {/* Spillover Activities (overnight from previous day) */}
            {dayActivities.filter(a => a.isSpillover).length > 0 && (
                <section className="section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <span>🔄</span>
                            Aktivitas Lanjutan
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            color: 'var(--emerald-400)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: '600',
                        }}>
                            Otomatis
                        </span>
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--dark-400)',
                        marginBottom: '12px',
                        marginLeft: '4px',
                    }}>
                        Aktivitas dari hari sebelumnya yang melewati tengah malam
                    </div>
                    {dayActivities.filter(a => a.isSpillover).map(activity => (
                        <ActivityCard key={activity.id} activity={activity} />
                    ))}
                </section>
            )}

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
