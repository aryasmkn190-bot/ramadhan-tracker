'use client';

import { useApp } from '../contexts/AppContext';

export default function HistoryPage() {
    const { getHistory, getStats } = useApp();
    const history = getHistory();
    const stats = getStats();

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('id-ID', options);
    };

    return (
        <main className="main-content">
            {/* Stats Overview */}
            <div className="stats-card">
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div className="streak-container">
                        <div className="streak-flame">🔥</div>
                        <div className="streak-count">{stats.totalCompleted}</div>
                        <div className="streak-label">Total Aktivitas Selesai</div>
                    </div>
                </div>

                <div className="stats-grid" style={{ marginTop: '20px' }}>
                    <div className="stat-item">
                        <div className="stat-value">{stats.currentDay}</div>
                        <div className="stat-label">Hari</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.quranPages}</div>
                        <div className="stat-label">Halaman Quran</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{history.length}</div>
                        <div className="stat-label">Hari Tercatat</div>
                    </div>
                </div>
            </div>

            {/* History Section */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>📅</span>
                        Riwayat Aktivitas
                    </h2>
                </div>

                {history.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <div className="empty-title">Belum Ada Riwayat</div>
                        <div className="empty-desc">Mulai catat aktivitas ibadahmu hari ini!</div>
                    </div>
                ) : (
                    history.map((day, index) => (
                        <div key={day.date} className="history-card">
                            <div className="history-date">
                                <span>📅</span>
                                <span>{formatDate(day.date)}</span>
                            </div>

                            {day.activities.length > 0 && (
                                <div className="history-items">
                                    {day.activities.map((activity, i) => (
                                        <span key={i} className="history-badge">{activity}</span>
                                    ))}
                                </div>
                            )}

                            {day.missed.length > 0 && (
                                <div className="history-items" style={{ marginTop: '8px' }}>
                                    {day.missed.map((activity, i) => (
                                        <span key={i} className="history-badge missed">{activity}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </section>
        </main>
    );
}
