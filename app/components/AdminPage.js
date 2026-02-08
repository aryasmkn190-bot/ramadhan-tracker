'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function AdminPage() {
    const { isAdmin, user } = useAuth();
    const { addToast, isOnlineMode } = useApp();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (isAdmin && isOnlineMode) {
            fetchMembers();
            fetchAdminStats();
        } else {
            setLoading(false);
        }
    }, [isAdmin, isOnlineMode]);

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
            // Get member counts
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, role, created_at');

            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const totalMembers = profilesData?.length || 0;
            const admins = profilesData?.filter(p => p.role === 'admin').length || 0;
            const newThisWeek = profilesData?.filter(p => p.created_at >= weekAgo).length || 0;

            setStats({
                totalMembers,
                admins,
                newThisWeek,
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

    if (!isOnlineMode) {
        return (
            <main className="main-content">
                <div className="empty-state" style={{ marginTop: '40px' }}>
                    <div className="empty-icon">📴</div>
                    <div className="empty-title">Mode Offline</div>
                    <div className="empty-desc">Fitur admin hanya tersedia dalam mode online</div>
                </div>
            </main>
        );
    }

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
                <div className="stats-card" style={{ marginBottom: '24px' }}>
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
                        onClick={fetchMembers}
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
                    <span className="section-action">{members.length} anggota</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {members.map((member) => (
                        <div
                            key={member.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px',
                                background: 'var(--dark-700)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-full)',
                                background: member.role === 'admin'
                                    ? 'var(--gold-gradient)'
                                    : 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                color: 'white',
                                fontWeight: '600',
                            }}>
                                {member.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '2px',
                                }}>
                                    <span style={{ fontWeight: '600', color: 'var(--dark-100)', fontSize: '14px' }}>
                                        {member.full_name}
                                    </span>
                                    {member.role === 'admin' && (
                                        <span style={{
                                            fontSize: '9px',
                                            background: 'var(--gold-gradient)',
                                            color: 'var(--dark-900)',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-full)',
                                            fontWeight: '700',
                                        }}>
                                            ADMIN
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                                    {member.email} • Juz {member.quran_progress?.[0]?.current_juz || 1}
                                </div>
                            </div>

                            {/* Action */}
                            {member.id !== user.id && (
                                <button
                                    onClick={() => handleToggleAdmin(member.id, member.role)}
                                    style={{
                                        padding: '6px 10px',
                                        fontSize: '11px',
                                        background: member.role === 'admin' ? 'var(--danger)' : 'var(--emerald-600)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                    }}
                                >
                                    {member.role === 'admin' ? 'Hapus Admin' : 'Jadikan Admin'}
                                </button>
                            )}
                        </div>
                    ))}
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
        </main>
    );
}
