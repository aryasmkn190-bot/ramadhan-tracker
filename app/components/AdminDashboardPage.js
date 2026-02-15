'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import AdminLeaderboard from './AdminLeaderboard';

const USER_GROUPS = ['PTO CENTRAL', 'PTO HOLDING', 'PTO 1', 'PTO 2', 'PTO 3', 'PTO 4', 'PTO 5', 'PTO 6'];

const GROUP_COLORS = {
    'PTO CENTRAL': { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    'PTO HOLDING': { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a78bfa' },
    'PTO 1': { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
    'PTO 2': { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
    'PTO 3': { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
    'PTO 4': { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
    'PTO 5': { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)', text: '#2dd4bf' },
    'PTO 6': { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
};

export default function AdminDashboardPage() {
    const { profile } = useAuth();
    const { addToast, setCurrentPage } = useApp();

    const [stats, setStats] = useState({
        totalMembers: 0,
        admins: 0,
        newThisWeek: 0,
        totalQuranReadings: 0,
        totalActivities: 0,
        groupCounts: {},
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        if (!isSupabaseConfigured()) return;
        setLoading(true);
        try {
            const [profilesRes, activitiesRes, quranRes] = await Promise.all([
                supabase.from('profiles').select('id, role, user_group, created_at'),
                supabase.from('daily_activities').select('id', { count: 'exact', head: true }).eq('completed', true),
                supabase.from('quran_readings').select('id', { count: 'exact', head: true }),
            ]);

            const profiles = profilesRes.data || [];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const groupCounts = {};
            USER_GROUPS.forEach(g => { groupCounts[g] = 0; });
            let admins = 0;
            let newThisWeek = 0;

            profiles.forEach(p => {
                if (p.role === 'admin') admins++;
                if (p.user_group && groupCounts[p.user_group] !== undefined) {
                    groupCounts[p.user_group]++;
                }
                if (p.created_at && new Date(p.created_at) > weekAgo) {
                    newThisWeek++;
                }
            });


            setStats({
                totalMembers: profiles.length,
                admins,
                newThisWeek,
                totalQuranReadings: quranRes.count || 0,
                totalActivities: activitiesRes.count || 0,
                groupCounts,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="main-content">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ color: 'var(--dark-400)' }}>Memuat dashboard...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Welcome banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--gold-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                }}>👑</div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--dark-100)' }}>
                        Assalamualaikum, {profile?.full_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                        Admin Dashboard • Kelola aplikasi ramadhan tracker
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '16px',
            }}>
                {[
                    { value: stats.totalMembers, label: 'Total Anggota', icon: '👥', color: '#10b981' },
                    { value: stats.admins, label: 'Admin', icon: '👑', color: '#fbbf24' },
                    { value: stats.newThisWeek, label: 'Baru Minggu Ini', icon: '🆕', color: '#60a5fa' },
                ].map((item, i) => (
                    <div key={i} style={{
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '14px 10px',
                        textAlign: 'center',
                        border: '1px solid var(--dark-700)',
                    }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: item.color }}>
                            {item.value}
                        </div>
                        <div style={{
                            fontSize: '9px',
                            color: 'var(--dark-400)',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            marginTop: '2px',
                        }}>
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Activity stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginBottom: '16px',
            }}>
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    textAlign: 'center',
                    border: '1px solid var(--dark-700)',
                }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#fbbf24' }}>
                        {stats.totalQuranReadings}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--dark-400)', fontWeight: '600', textTransform: 'uppercase' }}>
                        Total Sesi Tadarus
                    </div>
                </div>
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    textAlign: 'center',
                    border: '1px solid var(--dark-700)',
                }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399' }}>
                        {stats.totalActivities}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--dark-400)', fontWeight: '600', textTransform: 'uppercase' }}>
                        Total Aktivitas
                    </div>
                </div>
            </div>

            {/* Group breakdown */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>👥</span>
                        Anggota Per Grup
                    </h2>
                    <button
                        className="section-action"
                        onClick={() => setCurrentPage('admin_members')}
                    >
                        Kelola →
                    </button>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                }}>
                    {USER_GROUPS.map(group => {
                        const colors = GROUP_COLORS[group];
                        return (
                            <div key={group} style={{
                                padding: '10px 6px',
                                background: colors.bg,
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                border: `1px solid ${colors.border}`,
                            }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text }}>
                                    {stats.groupCounts[group] || 0}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--dark-400)' }}>
                                    {group}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Quick Links */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>⚡</span>
                        Aksi Cepat
                    </h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                }}>
                    {[
                        { icon: '👥', label: 'Kelola Anggota', page: 'admin_members', color: '#10b981' },
                        { icon: '📢', label: 'Pengumuman', page: 'admin_announcements', color: '#60a5fa' },
                        { icon: '📋', label: 'Custom Aktivitas', page: 'admin_activities', color: '#a78bfa' },
                        { icon: '⚙️', label: 'Pengaturan', page: 'settings', color: '#f59e0b' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(item.page)}
                            style={{
                                padding: '14px',
                                background: 'var(--dark-800)',
                                border: '1px solid var(--dark-700)',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>{item.icon}</span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--dark-200)',
                            }}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Comprehensive Leaderboard */}
            <AdminLeaderboard />
        </main>
    );
}
