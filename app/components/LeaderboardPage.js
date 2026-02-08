'use client';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function LeaderboardPage() {
    const { leaderboard, communityStats, fetchLeaderboard, isOnlineMode } = useApp();
    const { user, profile } = useAuth();

    if (!isOnlineMode) {
        return (
            <main className="main-content">
                <div className="empty-state" style={{ marginTop: '40px' }}>
                    <div className="empty-icon">📴</div>
                    <div className="empty-title">Mode Offline</div>
                    <div className="empty-desc">Login untuk melihat leaderboard komunitas</div>
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="main-content">
                <div className="empty-state" style={{ marginTop: '40px' }}>
                    <div className="empty-icon">🔐</div>
                    <div className="empty-title">Login Diperlukan</div>
                    <div className="empty-desc">Masuk untuk melihat leaderboard komunitas</div>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Community Stats */}
            {communityStats && (
                <div className="stats-card" style={{ marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--dark-300)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Statistik Komunitas
                        </span>
                    </div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div className="stat-item">
                            <div className="stat-value">{communityStats.total_members || 0}</div>
                            <div className="stat-label">Anggota</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{communityStats.active_today || 0}</div>
                            <div className="stat-label">Aktif Hari Ini</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{communityStats.total_pages_read || 0}</div>
                            <div className="stat-label">Total Halaman Quran</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{communityStats.total_activities_completed || 0}</div>
                            <div className="stat-label">Total Aktivitas</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quran Leaderboard */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>🏆</span>
                        Leaderboard Tadarus
                    </h2>
                    <button
                        className="section-action"
                        onClick={fetchLeaderboard}
                    >
                        Refresh
                    </button>
                </div>

                {leaderboard.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <div className="empty-title">Belum Ada Data</div>
                        <div className="empty-desc">Mulai tadarus untuk muncul di leaderboard!</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {leaderboard.map((item, index) => {
                            const isCurrentUser = item.id === user?.id;
                            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '14px 16px',
                                        background: isCurrentUser
                                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
                                            : 'var(--dark-700)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: isCurrentUser
                                            ? '1px solid var(--emerald-500)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    {/* Rank */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'var(--radius-md)',
                                        background: index < 3 ? 'var(--gold-gradient)' : 'var(--dark-600)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: index < 3 ? '18px' : '14px',
                                        fontWeight: '700',
                                        color: index < 3 ? 'var(--dark-900)' : 'var(--dark-300)',
                                        boxShadow: index < 3 ? 'var(--shadow-gold)' : 'none',
                                    }}>
                                        {rankEmoji}
                                    </div>

                                    {/* Avatar & Name */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: isCurrentUser ? 'var(--emerald-400)' : 'var(--dark-100)',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            {item.full_name}
                                            {isCurrentUser && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    background: 'var(--emerald-500)',
                                                    color: 'white',
                                                    padding: '2px 6px',
                                                    borderRadius: 'var(--radius-full)',
                                                }}>
                                                    Kamu
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                                            Juz {item.current_juz} • {item.pages_read} halaman
                                        </div>
                                    </div>

                                    {/* Pages */}
                                    <div style={{
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--gold-400)',
                                    }}>
                                        📖 {item.pages_read}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
