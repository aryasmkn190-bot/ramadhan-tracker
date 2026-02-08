'use client';

import { useApp } from '../contexts/AppContext';
import StatsCard from './StatsCard';
import ActivityCard from './ActivityCard';
import QuranCard from './QuranCard';

export default function HomePage() {
    const { getTodayActivities, DEFAULT_PRAYERS, DEFAULT_SUNNAH, DEFAULT_ACTIVITIES } = useApp();
    const todayActivities = getTodayActivities();

    const prayers = todayActivities.filter(a => DEFAULT_PRAYERS.some(p => p.id === a.id));
    const sunnah = todayActivities.filter(a => DEFAULT_SUNNAH.some(s => s.id === a.id));
    const activities = todayActivities.filter(a => DEFAULT_ACTIVITIES.some(act => act.id === a.id));

    return (
        <main className="main-content">
            <StatsCard />

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

            {/* Quran Progress */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>📖</span>
                        Tadarus Al-Quran
                    </h2>
                </div>
                <QuranCard />
            </section>
        </main>
    );
}
