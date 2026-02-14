'use client';

import { useApp } from '../contexts/AppContext';

export default function StatsCard() {
    const { getStats, selectedRamadanDay, isSelectedDayToday } = useApp();
    const stats = getStats();

    return (
        <div className="stats-card">
            <div className="stats-header">
                <span className="stats-title">
                    {isSelectedDayToday ? 'Progress Hari Ini' : `Progress Hari ${selectedRamadanDay}`}
                </span>
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
                    <div className="stat-value">{stats.quranPercentage}%</div>
                    <div className="stat-label">Tadarus</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.streak || 0}</div>
                    <div className="stat-label">Streak 🔥</div>
                </div>
            </div>
        </div>
    );
}
