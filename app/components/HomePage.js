'use client';

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
        selectedRamadanDay,
        isSelectedDayToday,
    } = useApp();

    const dayActivities = getSelectedDayActivities();

    const prayers = dayActivities.filter(a => DEFAULT_PRAYERS.some(p => p.id === a.id));
    const sunnah = dayActivities.filter(a => DEFAULT_SUNNAH.some(s => s.id === a.id));
    const activities = dayActivities.filter(a => DEFAULT_ACTIVITIES.some(act => act.id === a.id));

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

            {/* Quran Progress - only show on today OR allow updates anytime */}
            {/* Since we allow filling past days, maybe allow updating Quran progress anytime? */}
            {/* Let's keep it restricted to 'today' for progress tracking accuracy, or allow always */}

            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>📖</span>
                        Tadarus Al-Quran
                    </h2>
                </div>
                <QuranCard />
            </section>

            {/* Note for future days */}
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
        </main>
    );
}
