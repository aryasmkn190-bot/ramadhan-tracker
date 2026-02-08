'use client';

import { useApp } from '../contexts/AppContext';

export default function StatsCard() {
    const { getStats, currentRamadanDay } = useApp();
    const stats = getStats();

    return (
        <div className="stats-card">
            <div className="stats-header">
                <span className="stats-title">Progress Hari Ini</span>
                <span className="stats-day-badge">
                    {stats.percentage}% Tercapai
                </span>
            </div>
            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-value">{stats.completedToday}</div>
                    <div className="stat-label">Selesai</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.quranJuz}</div>
                    <div className="stat-label">Juz Quran</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{currentRamadanDay}</div>
                    <div className="stat-label">Hari Ramadhan</div>
                </div>
            </div>
        </div>
    );
}
