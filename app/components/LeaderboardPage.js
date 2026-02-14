'use client';

import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const USER_GROUPS = ['CHP', 'MR1', 'MR2', 'MR3', 'MR4', 'SMD1', 'SMD2'];

const GROUP_COLORS = {
    CHP: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    MR1: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
    MR2: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
    MR3: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a78bfa' },
    MR4: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
    SMD1: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
    SMD2: { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)', text: '#2dd4bf' },
};

export default function LeaderboardPage() {
    const { leaderboard, communityStats, fetchLeaderboard } = useApp();
    const { user, profile } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState('all');

    // Filter leaderboard by group
    const filteredLeaderboard = useMemo(() => {
        if (selectedGroup === 'all') return leaderboard;
        return leaderboard.filter(item => item.user_group === selectedGroup);
    }, [leaderboard, selectedGroup]);

    const groupStats = useMemo(() => {
        const stats = {};
        USER_GROUPS.forEach(group => {
            const groupMembers = leaderboard.filter(item => item.user_group === group);
            const totalSessions = groupMembers.reduce((sum, m) => sum + (m.sessions || 0), 0);
            const avgSessions = groupMembers.length > 0 ? Math.round(totalSessions / groupMembers.length) : 0;
            stats[group] = {
                members: groupMembers.length,
                totalSessions,
                avgSessions,
            };
        });
        return stats;
    }, [leaderboard]);

    const rankedGroups = useMemo(() => {
        return USER_GROUPS
            .map(group => ({ group, ...groupStats[group] }))
            .sort((a, b) => b.totalSessions - a.totalSessions);
    }, [groupStats]);

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
                            <div className="stat-value">{communityStats.total_sessions || communityStats.total_pages_read || 0}</div>
                            <div className="stat-label">Total Sesi Tadarus</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{communityStats.total_activities_completed || 0}</div>
                            <div className="stat-label">Total Aktivitas</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Ranking */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>🏅</span>
                        Peringkat Grup
                    </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                    {rankedGroups.map((item, index) => {
                        const colors = GROUP_COLORS[item.group];
                        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                        const maxSessions = rankedGroups[0]?.totalSessions || 1;
                        const barWidth = Math.max(5, (item.totalSessions / maxSessions) * 100);

                        return (
                            <button
                                key={item.group}
                                onClick={() => setSelectedGroup(item.group === selectedGroup ? 'all' : item.group)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    background: selectedGroup === item.group
                                        ? colors.bg
                                        : 'var(--dark-800)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: selectedGroup === item.group
                                        ? `1px solid ${colors.border}`
                                        : '1px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {/* Rank */}
                                <div style={{
                                    width: '28px',
                                    textAlign: 'center',
                                    fontSize: rankEmoji ? '16px' : '13px',
                                    fontWeight: '700',
                                    color: rankEmoji ? undefined : 'var(--dark-400)',
                                }}>
                                    {rankEmoji || `#${index + 1}`}
                                </div>

                                {/* Group info + bar */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                    }}>
                                        <span style={{
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            color: colors.text,
                                        }}>
                                            {item.group}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-400)',
                                        }}>
                                            {item.members} anggota • {item.totalSessions} sesi
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{
                                        height: '6px',
                                        background: 'var(--dark-700)',
                                        borderRadius: '3px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${barWidth}%`,
                                            height: '100%',
                                            background: colors.text,
                                            borderRadius: '3px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Group Filter Tabs for Individual Leaderboard */}
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

                {/* Group filter pills */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    marginBottom: '14px',
                    paddingBottom: '4px',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    <button
                        onClick={() => setSelectedGroup('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: selectedGroup === 'all' ? 'var(--emerald-600)' : 'var(--dark-700)',
                            color: selectedGroup === 'all' ? 'white' : 'var(--dark-400)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        Semua
                    </button>
                    {USER_GROUPS.map(group => {
                        const colors = GROUP_COLORS[group];
                        return (
                            <button
                                key={group}
                                onClick={() => setSelectedGroup(group)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: selectedGroup === group ? colors.bg : 'var(--dark-700)',
                                    color: selectedGroup === group ? colors.text : 'var(--dark-400)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {group}
                            </button>
                        );
                    })}
                </div>

                {filteredLeaderboard.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <div className="empty-title">Belum Ada Data</div>
                        <div className="empty-desc">
                            {selectedGroup !== 'all'
                                ? `Belum ada anggota grup ${selectedGroup} di leaderboard`
                                : 'Mulai tadarus untuk muncul di leaderboard!'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredLeaderboard.map((item, index) => {
                            const isCurrentUser = item.id === user?.id;
                            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                            const groupColor = GROUP_COLORS[item.user_group];

                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 14px',
                                        background: isCurrentUser
                                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
                                            : 'var(--dark-800)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: isCurrentUser
                                            ? '1px solid var(--emerald-500)'
                                            : '1px solid transparent',
                                    }}
                                >
                                    {/* Rank */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: 'var(--radius-md)',
                                        background: index < 3 ? 'var(--gold-gradient)' : 'var(--dark-700)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: index < 3 ? '16px' : '13px',
                                        fontWeight: '700',
                                        color: index < 3 ? 'var(--dark-900)' : 'var(--dark-300)',
                                        boxShadow: index < 3 ? 'var(--shadow-gold)' : 'none',
                                        flexShrink: 0,
                                    }}>
                                        {rankEmoji}
                                    </div>

                                    {/* Name & Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: isCurrentUser ? 'var(--emerald-400)' : 'var(--dark-100)',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            flexWrap: 'wrap',
                                        }}>
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {item.full_name}
                                            </span>
                                            {isCurrentUser && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    background: 'var(--emerald-500)',
                                                    color: 'white',
                                                    padding: '1px 6px',
                                                    borderRadius: 'var(--radius-full)',
                                                }}>
                                                    Kamu
                                                </span>
                                            )}
                                            {item.user_group && groupColor && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    background: groupColor.bg,
                                                    color: groupColor.text,
                                                    padding: '1px 6px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontWeight: '700',
                                                    border: `1px solid ${groupColor.border}`,
                                                }}>
                                                    {item.user_group}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                            {item.sessions || 0} sesi tadarus
                                        </div>
                                    </div>

                                    {/* Pages badge */}
                                    <div style={{
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        padding: '5px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: 'var(--gold-400)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}>
                                        📖 {item.sessions || 0}x
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
