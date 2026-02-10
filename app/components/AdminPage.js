'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import CustomActivitiesManager from './CustomActivitiesManager';
import AdminLeaderboard from './AdminLeaderboard';

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

export default function AdminPage() {
    const { isAdmin, user } = useAuth();
    const { addToast } = useApp();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [stats, setStats] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    useEffect(() => {
        if (isAdmin) {
            fetchMembers();
            fetchAdminStats();
        } else {
            setLoading(false);
        }
    }, [isAdmin]);

    const fetchMembers = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data } = await supabase
                .from('profiles')
                .select(`
          *,
          quran_progress(current_juz, pages_read)
        `)
                .order('created_at', { ascending: false });

            if (data) setMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminStats = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, role, created_at, user_group');

            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const totalMembers = profilesData?.length || 0;
            const admins = profilesData?.filter(p => p.role === 'admin').length || 0;
            const newThisWeek = profilesData?.filter(p => p.created_at >= weekAgo).length || 0;

            // Group stats
            const groupCounts = {};
            USER_GROUPS.forEach(g => { groupCounts[g] = 0; });
            profilesData?.forEach(p => {
                if (p.user_group && groupCounts[p.user_group] !== undefined) {
                    groupCounts[p.user_group]++;
                }
            });

            setStats({
                totalMembers,
                admins,
                newThisWeek,
                groupCounts,
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();

        if (!announcementTitle.trim() || !announcementContent.trim()) {
            addToast('❌ Judul dan isi pengumuman harus diisi', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('announcements').insert({
                title: announcementTitle,
                content: announcementContent,
                author_id: user.id,
                is_active: true,
            });

            if (error) throw error;

            addToast('✅ Pengumuman berhasil dibuat!', 'success');
            setAnnouncementTitle('');
            setAnnouncementContent('');
            setShowAnnouncementModal(false);
        } catch (error) {
            console.error('Error creating announcement:', error);
            addToast('❌ Gagal membuat pengumuman', 'error');
        }
    };

    const handleToggleAdmin = async (memberId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'member' : 'admin';

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            ));

            addToast(`✅ Role berhasil diubah menjadi ${newRole}`, 'success');
        } catch (error) {
            console.error('Error updating role:', error);
            addToast('❌ Gagal mengubah role', 'error');
        }
    };

    const handleChangeGroup = async (memberId, newGroup) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ user_group: newGroup })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, user_group: newGroup } : m
            ));

            addToast(`✅ Grup berhasil diubah ke ${newGroup}`, 'success');
            setShowGroupModal(false);
            setEditingMember(null);
        } catch (error) {
            console.error('Error updating group:', error);
            addToast('❌ Gagal mengubah grup', 'error');
        }
    };

    // Filter members by group
    const filteredMembers = useMemo(() => {
        if (selectedGroup === 'all') return members;
        return members.filter(m => m.user_group === selectedGroup);
    }, [members, selectedGroup]);

    if (!isAdmin) {
        return (
            <main className="main-content">
                <div className="empty-state" style={{ marginTop: '40px' }}>
                    <div className="empty-icon">🔒</div>
                    <div className="empty-title">Akses Ditolak</div>
                    <div className="empty-desc">Halaman ini hanya untuk admin</div>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="main-content">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ color: 'var(--dark-400)' }}>Memuat data...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Admin Stats */}
            {stats && (
                <div className="stats-card" style={{ marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '20px' }}>👨‍💼</span>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dark-100)', marginTop: '8px' }}>
                            Dashboard Admin
                        </h2>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{stats.totalMembers}</div>
                            <div className="stat-label">Total Anggota</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.admins}</div>
                            <div className="stat-label">Admin</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.newThisWeek}</div>
                            <div className="stat-label">Baru Minggu Ini</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Overview Stats */}
            {stats?.groupCounts && (
                <section className="section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <span>👥</span>
                            Anggota Per Grup
                        </h2>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        marginBottom: '8px',
                    }}>
                        {USER_GROUPS.map(group => {
                            const colors = GROUP_COLORS[group];
                            const count = stats.groupCounts[group] || 0;
                            return (
                                <button
                                    key={group}
                                    onClick={() => setSelectedGroup(group === selectedGroup ? 'all' : group)}
                                    style={{
                                        padding: '12px 8px',
                                        background: selectedGroup === group ? colors.bg : 'var(--dark-800)',
                                        border: selectedGroup === group
                                            ? `1px solid ${colors.border}`
                                            : '1px solid transparent',
                                        borderRadius: 'var(--radius-lg)',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: colors.text,
                                    }}>
                                        {count}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: 'var(--dark-400)',
                                        marginTop: '2px',
                                    }}>
                                        {group}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Quick Actions */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>⚡</span>
                        Aksi Cepat
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAnnouncementModal(true)}
                        style={{ padding: '16px' }}
                    >
                        <span>📢</span>
                        <span>Buat Pengumuman</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => { fetchMembers(); fetchAdminStats(); }}
                        style={{ padding: '16px' }}
                    >
                        <span>🔄</span>
                        <span>Refresh Data</span>
                    </button>
                </div>
            </section>

            {/* Members List */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>👥</span>
                        Daftar Anggota
                    </h2>
                    <span className="section-action">
                        {selectedGroup !== 'all' ? `${filteredMembers.length}/${members.length}` : members.length} anggota
                    </span>
                </div>

                {/* Group filter pills */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    marginBottom: '12px',
                    paddingBottom: '4px',
                }}>
                    <button
                        onClick={() => setSelectedGroup('all')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: selectedGroup === 'all' ? 'var(--emerald-600)' : 'var(--dark-700)',
                            color: selectedGroup === 'all' ? 'white' : 'var(--dark-400)',
                            fontSize: '11px',
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
                                    padding: '5px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: selectedGroup === group ? colors.bg : 'var(--dark-700)',
                                    color: selectedGroup === group ? colors.text : 'var(--dark-400)',
                                    fontSize: '11px',
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredMembers.map((member) => {
                        const groupColor = GROUP_COLORS[member.user_group];

                        return (
                            <div
                                key={member.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    background: 'var(--dark-800)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: 'var(--radius-full)',
                                    background: member.role === 'admin'
                                        ? 'var(--gold-gradient)'
                                        : 'var(--primary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '15px',
                                    color: 'white',
                                    fontWeight: '600',
                                    flexShrink: 0,
                                }}>
                                    {member.full_name?.charAt(0).toUpperCase() || '?'}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        marginBottom: '2px',
                                        flexWrap: 'wrap',
                                    }}>
                                        <span style={{
                                            fontWeight: '600',
                                            color: 'var(--dark-100)',
                                            fontSize: '13px',
                                        }}>
                                            {member.full_name}
                                        </span>
                                        {member.role === 'admin' && (
                                            <span style={{
                                                fontSize: '8px',
                                                background: 'var(--gold-gradient)',
                                                color: 'var(--dark-900)',
                                                padding: '1px 5px',
                                                borderRadius: 'var(--radius-full)',
                                                fontWeight: '700',
                                            }}>
                                                ADMIN
                                            </span>
                                        )}
                                        {member.user_group && groupColor && (
                                            <span style={{
                                                fontSize: '8px',
                                                background: groupColor.bg,
                                                color: groupColor.text,
                                                padding: '1px 5px',
                                                borderRadius: 'var(--radius-full)',
                                                fontWeight: '700',
                                                border: `1px solid ${groupColor.border}`,
                                            }}>
                                                {member.user_group}
                                            </span>
                                        )}
                                        {!member.user_group && (
                                            <span style={{
                                                fontSize: '8px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#f87171',
                                                padding: '1px 5px',
                                                borderRadius: 'var(--radius-full)',
                                                fontWeight: '700',
                                            }}>
                                                NO GROUP
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--dark-400)' }}>
                                        {member.email} • Juz {member.quran_progress?.[0]?.current_juz || 1}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                    {/* Change group button */}
                                    <button
                                        onClick={() => {
                                            setEditingMember(member);
                                            setShowGroupModal(true);
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '10px',
                                            background: 'var(--dark-700)',
                                            color: 'var(--dark-300)',
                                            border: '1px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                        }}
                                    >
                                        ✏️
                                    </button>

                                    {/* Toggle admin */}
                                    {member.id !== user.id && (
                                        <button
                                            onClick={() => handleToggleAdmin(member.id, member.role)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '10px',
                                                background: member.role === 'admin' ? 'var(--danger)' : 'var(--emerald-600)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                            }}
                                        >
                                            {member.role === 'admin' ? '👤' : '👑'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Announcement Modal */}
            <div
                className={`modal-overlay ${showAnnouncementModal ? 'active' : ''}`}
                onClick={() => setShowAnnouncementModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Buat Pengumuman</h2>
                        <button
                            className="modal-close"
                            onClick={() => setShowAnnouncementModal(false)}
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleCreateAnnouncement}>
                        <div className="form-group">
                            <label className="form-label">Judul</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Judul pengumuman"
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Isi Pengumuman</label>
                            <textarea
                                className="form-input"
                                placeholder="Tulis isi pengumuman..."
                                value={announcementContent}
                                onChange={(e) => setAnnouncementContent(e.target.value)}
                                rows={4}
                                style={{ resize: 'none' }}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            <span>📢</span>
                            <span>Kirim Pengumuman</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Change Group Modal */}
            <div
                className={`modal-overlay ${showGroupModal ? 'active' : ''}`}
                onClick={() => { setShowGroupModal(false); setEditingMember(null); }}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Ubah Grup</h2>
                        <button
                            className="modal-close"
                            onClick={() => { setShowGroupModal(false); setEditingMember(null); }}
                        >
                            ×
                        </button>
                    </div>

                    {editingMember && (
                        <div>
                            <p style={{
                                textAlign: 'center',
                                color: 'var(--dark-300)',
                                fontSize: '13px',
                                marginBottom: '16px',
                            }}>
                                Pilih grup untuk <strong>{editingMember.full_name}</strong>
                            </p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '8px',
                            }}>
                                {USER_GROUPS.map(group => {
                                    const colors = GROUP_COLORS[group];
                                    const isActive = editingMember.user_group === group;
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => handleChangeGroup(editingMember.id, group)}
                                            style={{
                                                padding: '14px 8px',
                                                background: isActive ? colors.bg : 'var(--dark-700)',
                                                border: isActive
                                                    ? `2px solid ${colors.border}`
                                                    : '2px solid var(--dark-600)',
                                                borderRadius: 'var(--radius-lg)',
                                                cursor: 'pointer',
                                                color: isActive ? colors.text : 'var(--dark-300)',
                                                fontWeight: '700',
                                                fontSize: '14px',
                                            }}
                                        >
                                            {group}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Comprehensive Leaderboard */}
            <AdminLeaderboard />

            {/* Custom Activities Manager */}
            <CustomActivitiesManager />
        </main>
    );
}
