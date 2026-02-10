'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Pagination, { usePagination } from './Pagination';

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

export default function AdminMembersPage() {
    const { user } = useAuth();
    const { addToast } = useApp();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [deletingMember, setDeletingMember] = useState(null);

    // Edit form
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [editRole, setEditRole] = useState('member');

    // Import
    const [importText, setImportText] = useState('');
    const [importGroup, setImportGroup] = useState('CHP');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        if (!isSupabaseConfigured()) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select(`*, quran_progress(current_juz, pages_read)`)
                .order('full_name', { ascending: true });
            if (data) setMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter
    const filteredMembers = useMemo(() => {
        let result = members;
        if (selectedGroup !== 'all') {
            result = result.filter(m => m.user_group === selectedGroup);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.full_name?.toLowerCase().includes(q) ||
                m.email?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [members, selectedGroup, searchQuery]);

    // Stats
    const groupStats = useMemo(() => {
        const stats = { all: members.length };
        USER_GROUPS.forEach(g => {
            stats[g] = members.filter(m => m.user_group === g).length;
        });
        stats.noGroup = members.filter(m => !m.user_group).length;
        return stats;
    }, [members]);

    // Pagination
    const membersPagination = usePagination(filteredMembers, 10);

    // Edit member
    const openEditModal = (member) => {
        setEditingMember(member);
        setEditName(member.full_name || '');
        setEditEmail(member.email || '');
        setEditGroup(member.user_group || '');
        setEditRole(member.role || 'member');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingMember) return;
        try {
            const updateData = {
                full_name: editName,
                user_group: editGroup || null,
                role: editRole,
            };
            console.log('Updating profile:', editingMember.id, updateData);

            const { data, error, count } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', editingMember.id)
                .select();

            console.log('Update result:', { data, error, count });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn('No rows updated - likely RLS policy blocking the update');
                addToast('⚠️ Update gagal - periksa izin admin di database (RLS policy)', 'error');
                return;
            }

            setMembers(prev => prev.map(m =>
                m.id === editingMember.id
                    ? { ...m, full_name: editName, user_group: editGroup || null, role: editRole }
                    : m
            ));

            addToast('✅ Data anggota berhasil diperbarui', 'success');
            setShowEditModal(false);
            setEditingMember(null);
        } catch (error) {
            console.error('Error updating member:', error);
            addToast('❌ Gagal memperbarui data', 'error');
        }
    };

    // Delete member
    const openDeleteModal = (member) => {
        setDeletingMember(member);
        setShowDeleteModal(true);
    };

    const handleDeleteMember = async () => {
        if (!deletingMember) return;
        try {
            // Delete related data first
            await supabase.from('daily_activities').delete().eq('user_id', deletingMember.id);
            await supabase.from('quran_progress').delete().eq('user_id', deletingMember.id);
            await supabase.from('quran_reading_log').delete().eq('user_id', deletingMember.id);

            // Delete profile
            const { error } = await supabase.from('profiles').delete().eq('id', deletingMember.id);
            if (error) throw error;

            setMembers(prev => prev.filter(m => m.id !== deletingMember.id));
            addToast(`✅ ${deletingMember.full_name} berhasil dihapus`, 'success');
            setShowDeleteModal(false);
            setDeletingMember(null);
        } catch (error) {
            console.error('Error deleting member:', error);
            addToast('❌ Gagal menghapus anggota', 'error');
        }
    };

    // Import users
    const handleImport = async () => {
        const lines = importText.trim().split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            addToast('❌ Tidak ada data untuk diimpor', 'error');
            return;
        }

        setImporting(true);
        let successCount = 0;
        let failCount = 0;

        // Save admin session before import (signUp can hijack the session)
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        let sessionWasHijacked = false;

        for (const line of lines) {
            try {
                // Format: name,email,password or name,email
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 2) {
                    failCount++;
                    continue;
                }

                const [name, email, password] = parts;
                const pwd = password || 'Ramadhan2026!';
                let userId = null;

                // Create user via Supabase auth admin API (doesn't affect current session)
                const { data, error } = await supabase.auth.admin.createUser({
                    email,
                    password: pwd,
                    email_confirm: true,
                    user_metadata: { full_name: name, user_group: importGroup },
                });

                if (error) {
                    // Admin API not available from client - use signUp as fallback
                    // signUp will change the session, so we'll need to restore it
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password: pwd,
                        options: {
                            data: { full_name: name, user_group: importGroup },
                        },
                    });

                    if (signUpError) {
                        console.error('SignUp error:', signUpError);
                        failCount++;
                        continue;
                    }
                    userId = signUpData?.user?.id;
                    sessionWasHijacked = true;

                    // Immediately restore admin session after each signUp
                    if (adminSession) {
                        await supabase.auth.setSession({
                            access_token: adminSession.access_token,
                            refresh_token: adminSession.refresh_token,
                        });
                    }
                } else {
                    userId = data?.user?.id;
                }

                if (userId) {
                    // Wait briefly for the database trigger to create the profile
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Now update the profile with user_group (trigger may have created it without group)
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            full_name: name,
                            user_group: importGroup,
                            role: 'member',
                        })
                        .eq('id', userId);

                    if (updateError) {
                        console.warn('Profile update after import failed:', updateError);
                        // Try upsert as fallback
                        await supabase.from('profiles').upsert({
                            id: userId,
                            full_name: name,
                            email,
                            user_group: importGroup,
                            role: 'member',
                        }, { onConflict: 'id' });
                    }
                }

                successCount++;
            } catch (error) {
                console.error('Import error for line:', line, error);
                failCount++;
            }
        }

        // Final session restore - make sure admin is still logged in
        if (sessionWasHijacked && adminSession) {
            console.log('Restoring admin session after import...');
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }

        setImporting(false);
        addToast(
            `📥 Import selesai: ${successCount} berhasil, ${failCount} gagal`,
            successCount > 0 ? 'success' : 'error'
        );

        if (successCount > 0) {
            setImportText('');
            setShowImportModal(false);
            fetchMembers();
        }
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setImportText(event.target.result);
        };
        reader.readAsText(file);
    };

    if (loading) {
        return (
            <main className="main-content">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ color: 'var(--dark-400)' }}>Memuat data anggota...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Header Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '16px',
            }}>
                {USER_GROUPS.map(group => {
                    const colors = GROUP_COLORS[group];
                    return (
                        <button
                            key={group}
                            onClick={() => setSelectedGroup(group === selectedGroup ? 'all' : group)}
                            style={{
                                padding: '10px 6px',
                                background: selectedGroup === group ? colors.bg : 'var(--dark-800)',
                                border: selectedGroup === group
                                    ? `1px solid ${colors.border}` : '1px solid transparent',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text }}>
                                {groupStats[group]}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--dark-400)' }}>
                                {group}
                            </div>
                        </button>
                    );
                })}
                <button
                    onClick={() => setSelectedGroup('all')}
                    style={{
                        padding: '10px 6px',
                        background: selectedGroup === 'all' ? 'var(--emerald-600)' : 'var(--dark-800)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '16px', fontWeight: '700', color: selectedGroup === 'all' ? 'white' : 'var(--dark-300)' }}>
                        {groupStats.all}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: selectedGroup === 'all' ? 'rgba(255,255,255,0.7)' : 'var(--dark-400)' }}>
                        SEMUA
                    </div>
                </button>
            </div>

            {/* Search + Actions */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="🔍 Cari anggota..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'var(--dark-800)',
                            border: '1px solid var(--dark-600)',
                            borderRadius: 'var(--radius-lg)',
                            color: 'var(--dark-100)',
                            fontSize: '13px',
                        }}
                    />
                </div>
                <button
                    onClick={() => setShowImportModal(true)}
                    style={{
                        padding: '10px 14px',
                        background: 'var(--emerald-600)',
                        border: 'none',
                        borderRadius: 'var(--radius-lg)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    📥 Import
                </button>
                <button
                    onClick={fetchMembers}
                    style={{
                        padding: '10px 12px',
                        background: 'var(--dark-800)',
                        border: '1px solid var(--dark-600)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--dark-300)',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    🔄
                </button>
            </div>

            {/* Pagination controls top */}
            <Pagination
                currentPage={membersPagination.currentPage}
                totalPages={membersPagination.totalPages}
                totalItems={membersPagination.totalItems}
                itemsPerPage={membersPagination.itemsPerPage}
                onPageChange={membersPagination.goToPage}
                onPerPageChange={membersPagination.setPerPage}
            />

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {membersPagination.paginatedItems.map(member => {
                    const groupColor = GROUP_COLORS[member.user_group];
                    const isSelf = member.id === user.id;

                    return (
                        <div
                            key={member.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                background: isSelf
                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))'
                                    : 'var(--dark-800)',
                                borderRadius: 'var(--radius-lg)',
                                border: isSelf
                                    ? '1px solid rgba(16, 185, 129, 0.2)'
                                    : '1px solid transparent',
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-full)',
                                background: member.role === 'admin' ? 'var(--gold-gradient)' : 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
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
                                    gap: '4px',
                                    marginBottom: '2px',
                                    flexWrap: 'wrap',
                                }}>
                                    <span style={{
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        color: 'var(--dark-100)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
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
                                        }}>ADMIN</span>
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
                                        }}>{member.user_group}</span>
                                    )}
                                    {!member.user_group && (
                                        <span style={{
                                            fontSize: '8px',
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#f87171',
                                            padding: '1px 5px',
                                            borderRadius: 'var(--radius-full)',
                                            fontWeight: '700',
                                        }}>NO GROUP</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--dark-400)' }}>
                                    {member.email}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button
                                    onClick={() => openEditModal(member)}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >✏️</button>
                                {!isSelf && (
                                    <button
                                        onClick={() => openDeleteModal(member)}
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                        }}
                                    >🗑️</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination controls bottom */}
            <Pagination
                currentPage={membersPagination.currentPage}
                totalPages={membersPagination.totalPages}
                totalItems={membersPagination.totalItems}
                itemsPerPage={membersPagination.itemsPerPage}
                onPageChange={membersPagination.goToPage}
                onPerPageChange={membersPagination.setPerPage}
            />

            {/* Edit Modal */}
            <div
                className={`modal-overlay ${showEditModal ? 'active' : ''}`}
                onClick={() => setShowEditModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">Edit Anggota</h2>
                        <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                    </div>

                    {editingMember && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'var(--dark-700)',
                                        border: '2px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--dark-100)',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'var(--dark-700)',
                                        border: '2px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--dark-500)',
                                        fontSize: '14px',
                                        opacity: 0.6,
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Grup
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {USER_GROUPS.map(group => {
                                        const colors = GROUP_COLORS[group];
                                        return (
                                            <button
                                                key={group}
                                                onClick={() => setEditGroup(group)}
                                                style={{
                                                    padding: '8px 14px',
                                                    background: editGroup === group ? colors.bg : 'var(--dark-700)',
                                                    border: editGroup === group ? `2px solid ${colors.border}` : '2px solid var(--dark-600)',
                                                    borderRadius: 'var(--radius-full)',
                                                    color: editGroup === group ? colors.text : 'var(--dark-400)',
                                                    fontWeight: '600',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {group}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Role
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setEditRole('member')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: editRole === 'member' ? 'rgba(16, 185, 129, 0.15)' : 'var(--dark-700)',
                                            border: editRole === 'member' ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: editRole === 'member' ? '#34d399' : 'var(--dark-400)',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        👤 Member
                                    </button>
                                    <button
                                        onClick={() => setEditRole('admin')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: editRole === 'admin' ? 'rgba(251, 191, 36, 0.15)' : 'var(--dark-700)',
                                            border: editRole === 'admin' ? '2px solid rgba(251, 191, 36, 0.3)' : '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: editRole === 'admin' ? '#fbbf24' : 'var(--dark-400)',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        👑 Admin
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary"
                                style={{ marginTop: '4px' }}
                            >
                                <span>💾</span>
                                <span>Simpan Perubahan</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <div
                className={`modal-overlay ${showDeleteModal ? 'active' : ''}`}
                onClick={() => setShowDeleteModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '8px' }}>
                            Hapus Anggota?
                        </h2>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px', marginBottom: '6px' }}>
                            <strong style={{ color: 'var(--dark-200)' }}>{deletingMember?.full_name}</strong>
                        </p>
                        <p style={{ color: 'var(--dark-500)', fontSize: '12px', marginBottom: '24px' }}>
                            Semua data aktivitas, progress Quran, dan profil akan dihapus permanen.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDeleteMember}
                                style={{ flex: 1, background: 'var(--danger)' }}
                            >
                                🗑️ Hapus
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            <div
                className={`modal-overlay ${showImportModal ? 'active' : ''}`}
                onClick={() => setShowImportModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div className="modal-header">
                        <h2 className="modal-title">📥 Import Anggota</h2>
                        <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Group selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Grup untuk semua user yang diimport
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {USER_GROUPS.map(group => {
                                    const colors = GROUP_COLORS[group];
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => setImportGroup(group)}
                                            style={{
                                                padding: '6px 12px',
                                                background: importGroup === group ? colors.bg : 'var(--dark-700)',
                                                border: importGroup === group ? `2px solid ${colors.border}` : '2px solid var(--dark-600)',
                                                borderRadius: 'var(--radius-full)',
                                                color: importGroup === group ? colors.text : 'var(--dark-400)',
                                                fontWeight: '600',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {group}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Format instruction */}
                        <div style={{
                            background: 'var(--dark-700)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 12px',
                            fontSize: '11px',
                            color: 'var(--dark-400)',
                            lineHeight: 1.6,
                        }}>
                            <strong style={{ color: 'var(--dark-200)' }}>Format (1 baris per user):</strong><br />
                            Nama,email,password<br />
                            <span style={{ color: 'var(--dark-500)' }}>
                                Jika password kosong, default: Ramadhan2026!
                            </span>
                        </div>

                        {/* File upload */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '12px',
                                background: 'var(--dark-700)',
                                border: '2px dashed var(--dark-500)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--dark-300)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                            }}
                        >
                            📁 Upload file CSV/TXT
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileImport}
                            style={{ display: 'none' }}
                        />

                        {/* Text area */}
                        <textarea
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            placeholder={`Ahmad,ahmad@email.com,password123\nBudi,budi@email.com\nCitra,citra@email.com,mypass`}
                            rows={6}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--dark-700)',
                                border: '2px solid var(--dark-600)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--dark-100)',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                resize: 'none',
                            }}
                        />

                        <button
                            onClick={handleImport}
                            className="btn btn-primary"
                            disabled={importing || !importText.trim()}
                            style={{ opacity: importing || !importText.trim() ? 0.6 : 1 }}
                        >
                            <span>{importing ? '⏳' : '📥'}</span>
                            <span>{importing ? 'Mengimport...' : `Import ke Grup ${importGroup}`}</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
