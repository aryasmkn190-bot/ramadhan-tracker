'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Pagination, { usePagination } from './Pagination';
import { USER_GROUPS, GROUP_COLORS } from '../data/userGroups';

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
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [deletingMember, setDeletingMember] = useState(null);

    // Bulk selection
    const [selectedMembers, setSelectedMembers] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Edit form
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [editRole, setEditRole] = useState('member');
    const [editManagedGroups, setEditManagedGroups] = useState([]);
    const [editLabels, setEditLabels] = useState([]);
    const [newLabelInput, setNewLabelInput] = useState('');

    // Password change
    const [editPassword, setEditPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Import
    const [importText, setImportText] = useState('');
    const [importGroup, setImportGroup] = useState('PTO CENTRAL');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null); // { skippedUsers, successCount, failCount, skippedCount }
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
                .select(`*`)
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
        setEditManagedGroups(member.managed_groups || []);
        setEditLabels(member.labels || []);
        setNewLabelInput('');
        setEditPassword('');
        setShowPassword(false);
        setShowEditModal(true);
    };

    // Toggle a group in managed_groups
    const toggleManagedGroup = (group) => {
        setEditManagedGroups(prev => {
            if (prev.includes(group)) {
                return prev.filter(g => g !== group);
            } else {
                return [...prev, group];
            }
        });
    };

    // Toggle a label
    const toggleLabel = (label) => {
        setEditLabels(prev => {
            if (prev.includes(label)) {
                return prev.filter(l => l !== label);
            } else {
                return [...prev, label];
            }
        });
    };

    // Add a new label
    const addNewLabel = () => {
        const label = newLabelInput.trim().toUpperCase();
        if (label && !editLabels.includes(label)) {
            setEditLabels(prev => [...prev, label]);
        }
        setNewLabelInput('');
    };

    // Get all unique labels from all members
    const allLabels = useMemo(() => {
        const labelSet = new Set();
        members.forEach(m => {
            if (m.labels && Array.isArray(m.labels)) {
                m.labels.forEach(l => labelSet.add(l));
            }
        });
        return Array.from(labelSet).sort();
    }, [members]);

    const handleSaveEdit = async () => {
        if (!editingMember) return;
        try {
            const updateData = {
                full_name: editName,
                user_group: editGroup || null,
                role: editRole,
                managed_groups: editRole === 'group_admin' ? editManagedGroups : null,
                labels: editLabels.length > 0 ? editLabels : [],
            };
            console.log('Updating profile:', editingMember.id, updateData);

            const { data, error, count } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', editingMember.id)
                .select();

            console.log('Update result:', { data, error, count });

            if (error) {
                console.error('Supabase update error:', error.message, error.details, error.hint, error.code);
                addToast(`❌ Gagal memperbarui: ${error.message || 'Unknown error'}`, 'error');
                return;
            }

            if (!data || data.length === 0) {
                console.warn('No rows updated - likely RLS policy blocking the update');
                addToast('⚠️ Update gagal - periksa izin admin di database (RLS policy)', 'error');
                return;
            }

            setMembers(prev => prev.map(m =>
                m.id === editingMember.id
                    ? { ...m, full_name: editName, user_group: editGroup || null, role: editRole, managed_groups: editRole === 'group_admin' ? editManagedGroups : null, labels: editLabels.length > 0 ? editLabels : [] }
                    : m
            ));

            addToast('✅ Data anggota berhasil diperbarui', 'success');
            setShowEditModal(false);
            setEditingMember(null);
        } catch (error) {
            const msg = error?.message || error?.toString() || 'Unknown error';
            console.error('Error updating member:', msg, error);
            addToast(`❌ Gagal memperbarui data: ${msg}`, 'error');
        }
    };

    // Change user password (admin only)
    const handleChangePassword = async () => {
        if (!editingMember || !editPassword) return;
        if (editPassword.length < 6) {
            addToast('❌ Password minimal 6 karakter', 'error');
            return;
        }

        setChangingPassword(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    targetUserId: editingMember.id,
                    newPassword: editPassword,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal mengubah password');
            }

            addToast(`🔑 Password ${editingMember.full_name} berhasil diubah`, 'success');
            setEditPassword('');
            setShowPassword(false);
        } catch (error) {
            console.error('Error changing password:', error);
            addToast(`❌ Gagal mengubah password: ${error.message}`, 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    // Delete member
    const openDeleteModal = (member) => {
        setDeletingMember(member);
        setShowDeleteModal(true);
    };

    // Toggle single member selection
    const toggleMemberSelection = (memberId) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    // Select/deselect all visible members (excluding self)
    const toggleSelectAll = () => {
        const selectableIds = membersPagination.paginatedItems
            .filter(m => m.id !== user.id)
            .map(m => m.id);

        const allSelected = selectableIds.every(id => selectedMembers.has(id));

        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (allSelected) {
                selectableIds.forEach(id => next.delete(id));
            } else {
                selectableIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    // Select all members in the current filtered group (excluding self)
    const selectAllInGroup = () => {
        const selectableIds = filteredMembers
            .filter(m => m.id !== user.id)
            .map(m => m.id);

        setSelectedMembers(new Set(selectableIds));
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedMembers(new Set());
    };

    // Bulk delete handler
    const handleBulkDelete = async () => {
        if (selectedMembers.size === 0) return;

        setBulkDeleting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/delete-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ userIds: Array.from(selectedMembers) }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Bulk delete failed');
            }

            // Remove deleted members from state
            setMembers(prev => prev.filter(m => !selectedMembers.has(m.id)));
            setSelectedMembers(new Set());
            setShowBulkDeleteModal(false);

            let toastMsg = `🗑️ ${result.successCount} anggota berhasil dihapus`;
            if (result.failCount > 0) toastMsg += `, ${result.failCount} gagal`;
            addToast(toastMsg, result.successCount > 0 ? 'success' : 'error');

        } catch (error) {
            console.error('Bulk delete error:', error);
            addToast(`❌ Gagal menghapus: ${error.message}`, 'error');
        } finally {
            setBulkDeleting(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!deletingMember) return;
        try {
            // Delete related data first
            await supabase.from('daily_activities').delete().eq('user_id', deletingMember.id);
            await supabase.from('quran_readings').delete().eq('user_id', deletingMember.id);

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

    // Import progress
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    // Helper: process a single user import line
    const importSingleUser = async (line, group, adminSession) => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) {
            return { success: false, reason: 'format_invalid' };
        }

        const [name, email, password] = parts;
        const pwd = password || 'Ramadhan2026!';
        let userId = null;
        let needSessionRestore = false;

        // Create user via Supabase auth admin API (doesn't affect current session)
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: pwd,
            email_confirm: true,
            user_metadata: { full_name: name, user_group: group },
        });

        if (error) {
            // Admin API not available from client - use signUp as fallback
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: pwd,
                options: {
                    data: { full_name: name, user_group: group },
                },
            });

            if (signUpError) {
                console.error('SignUp error:', signUpError);
                return { success: false, reason: signUpError.message };
            }
            userId = signUpData?.user?.id;
            needSessionRestore = true;

            // Immediately restore admin session after signUp
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
            await new Promise(resolve => setTimeout(resolve, 300));

            // Now update the profile with user_group
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: name,
                    user_group: group,
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
                    user_group: group,
                    role: 'member',
                }, { onConflict: 'id' });
            }
        }

        return { success: true, needSessionRestore };
    };

    // Import users - uses server API (service_role) with client-side fallback
    const handleImport = async () => {
        const lines = importText.trim().split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            addToast('❌ Tidak ada data untuk diimpor', 'error');
            return;
        }

        setImporting(true);
        setImportProgress({ current: 0, total: lines.length });

        // Parse lines into user objects
        const users = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name: parts[0] || '',
                email: parts[1] || '',
                password: parts[2] || '',
            };
        }).filter(u => u.name && u.email);

        if (users.length === 0) {
            addToast('❌ Format data tidak valid', 'error');
            setImporting(false);
            setImportProgress({ current: 0, total: 0 });
            return;
        }

        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();

        // Try server-side API route first (uses service_role key)
        try {
            const response = await fetch('/api/import-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ users, group: importGroup }),
            });

            const result = await response.json();

            // If server says service_role not configured, use client-side fallback
            if (result.fallback) {
                console.warn('Service role key not configured, using client-side fallback...');
                await handleImportClientFallback(lines, session);
                return;
            }

            if (!response.ok) {
                throw new Error(result.error || 'Server import failed');
            }

            // Server import succeeded
            setImportProgress({ current: result.total, total: result.total });
            setImporting(false);
            setImportProgress({ current: 0, total: 0 });

            // Build toast message with skip info
            let toastMsg = `📥 Import selesai: ${result.successCount} berhasil`;
            if (result.skippedCount > 0) toastMsg += `, ${result.skippedCount} di-skip`;
            if (result.failCount > 0) toastMsg += `, ${result.failCount} gagal`;

            addToast(toastMsg, result.successCount > 0 ? 'success' : 'error');

            if (result.errors?.length > 0) {
                console.warn('Import errors:', result.errors);
            }

            // Store result for displaying skipped users report
            setImportResult(result);

            if (result.successCount > 0) {
                setImportText('');
                fetchMembers();
            }
        } catch (apiError) {
            console.error('API import error, using fallback:', apiError);
            addToast('⚠️ Server API gagal, menggunakan metode alternatif...', 'warning');
            await handleImportClientFallback(lines, session);
        }
    };

    // Client-side fallback (uses signUp - slower, rate-limited)
    const handleImportClientFallback = async (lines, adminSession) => {
        let successCount = 0;
        let failCount = 0;

        const BATCH_SIZE = 5;
        for (let i = 0; i < lines.length; i += BATCH_SIZE) {
            const batch = lines.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(line => importSingleUser(line, importGroup, adminSession))
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    failCount++;
                    if (result.status === 'rejected') {
                        console.error('Import batch error:', result.reason);
                    }
                }
            }

            setImportProgress({ current: Math.min(i + BATCH_SIZE, lines.length), total: lines.length });
        }

        // Restore admin session
        if (adminSession) {
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }

        setImporting(false);
        setImportProgress({ current: 0, total: 0 });
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
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '16px',
            }}>
                {USER_GROUPS.map(group => {
                    const colors = GROUP_COLORS[group];
                    const shortLabel = group
                        .replace('PTO HOLDING ', 'HOLD ')
                        .replace('PTO CENTRAL', 'CENTRAL')
                        .replace('PTO ', 'PTO ');
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
                            <div style={{
                                fontSize: '9px', fontWeight: '600', color: 'var(--dark-400)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {shortLabel}
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
                    onClick={() => { setImportResult(null); setShowImportModal(true); }}
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

            {/* Select All Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--dark-800)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '6px',
            }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--dark-300)',
                    fontWeight: '600',
                }}>
                    <input
                        type="checkbox"
                        checked={membersPagination.paginatedItems.filter(m => m.id !== user.id).length > 0 &&
                            membersPagination.paginatedItems.filter(m => m.id !== user.id).every(m => selectedMembers.has(m.id))}
                        onChange={toggleSelectAll}
                        style={{
                            width: '16px',
                            height: '16px',
                            accentColor: 'var(--emerald-500)',
                            cursor: 'pointer',
                        }}
                    />
                    Pilih Semua
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedMembers.size > 0 && (
                        <span style={{
                            fontSize: '11px',
                            color: 'var(--emerald-400)',
                            fontWeight: '600',
                        }}>
                            {selectedMembers.size} dipilih
                        </span>
                    )}
                    {selectedGroup !== 'all' && (
                        <button
                            onClick={selectAllInGroup}
                            style={{
                                padding: '4px 10px',
                                background: 'var(--dark-700)',
                                border: '1px solid var(--dark-600)',
                                borderRadius: 'var(--radius-full)',
                                color: 'var(--dark-300)',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            Pilih Semua {selectedGroup}
                        </button>
                    )}
                    {selectedMembers.size > 0 && (
                        <button
                            onClick={clearSelection}
                            style={{
                                padding: '4px 10px',
                                background: 'var(--dark-700)',
                                border: '1px solid var(--dark-600)',
                                borderRadius: 'var(--radius-full)',
                                color: 'var(--dark-400)',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            Batal Pilih
                        </button>
                    )}
                </div>
            </div>

            {/* Floating bulk action bar */}
            {selectedMembers.size > 0 && (
                <div style={{
                    position: 'sticky',
                    top: '0',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '6px',
                    backdropFilter: 'blur(12px)',
                }}>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#f87171',
                    }}>
                        🗑️ {selectedMembers.size} anggota dipilih
                    </span>
                    <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        🗑️ Hapus Semua
                    </button>
                </div>
            )}

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {membersPagination.paginatedItems.map(member => {
                    const groupColor = GROUP_COLORS[member.user_group];
                    const isSelf = member.id === user.id;
                    const isSelected = selectedMembers.has(member.id);

                    return (
                        <div
                            key={member.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                background: isSelected
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.05))'
                                    : isSelf
                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))'
                                        : 'var(--dark-800)',
                                borderRadius: 'var(--radius-lg)',
                                border: isSelected
                                    ? '1px solid rgba(239, 68, 68, 0.3)'
                                    : isSelf
                                        ? '1px solid rgba(16, 185, 129, 0.2)'
                                        : '1px solid transparent',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {/* Checkbox */}
                            {!isSelf ? (
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMemberSelection(member.id)}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        accentColor: '#ef4444',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                    }}
                                />
                            ) : (
                                <div style={{ width: '16px', flexShrink: 0 }} />
                            )}
                            {/* Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-full)',
                                background: member.role === 'admin' ? 'var(--gold-gradient)' : member.role === 'group_admin' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'var(--primary-gradient)',
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
                                    {member.role === 'group_admin' && (
                                        <span style={{
                                            fontSize: '8px',
                                            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                                            color: 'white',
                                            padding: '1px 5px',
                                            borderRadius: 'var(--radius-full)',
                                            fontWeight: '700',
                                        }}>GROUP ADMIN</span>
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
                                <div style={{ fontSize: '10px', color: 'var(--dark-400)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    {member.email}
                                    {member.labels && member.labels.length > 0 && member.labels.map(label => (
                                        <span key={label} style={{
                                            fontSize: '7px',
                                            fontWeight: '700',
                                            padding: '1px 5px',
                                            borderRadius: 'var(--radius-full)',
                                            background: 'rgba(251, 191, 36, 0.12)',
                                            color: '#fbbf24',
                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                        }}>🏷️ {label}</span>
                                    ))}
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
                                        const shortLabel = group
                                            .replace('PTO HOLDING ', 'HOLD ')
                                            .replace('PTO CENTRAL', 'CENTRAL')
                                            .replace('PTO ', 'PTO ');
                                        return (
                                            <button
                                                key={group}
                                                onClick={() => setEditGroup(group)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: editGroup === group ? colors.bg : 'var(--dark-700)',
                                                    border: editGroup === group ? `2px solid ${colors.border}` : '2px solid var(--dark-600)',
                                                    borderRadius: 'var(--radius-full)',
                                                    color: editGroup === group ? colors.text : 'var(--dark-400)',
                                                    fontWeight: '600',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {shortLabel}
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
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        👤 Member
                                    </button>
                                    <button
                                        onClick={() => setEditRole('group_admin')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: editRole === 'group_admin' ? 'rgba(168, 85, 247, 0.15)' : 'var(--dark-700)',
                                            border: editRole === 'group_admin' ? '2px solid rgba(168, 85, 247, 0.3)' : '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: editRole === 'group_admin' ? '#a78bfa' : 'var(--dark-400)',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🛡️ Group Admin
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
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        👑 Admin
                                    </button>
                                </div>
                            </div>

                            {/* Managed Groups - only visible for group_admin */}
                            {editRole === 'group_admin' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🛡️ Grup yang Dikelola
                                    </label>
                                    <div style={{ fontSize: '10px', color: 'var(--dark-500)', marginBottom: '8px' }}>
                                        Pilih grup yang bisa direkap oleh group admin ini
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {USER_GROUPS.map(group => {
                                            const colors = GROUP_COLORS[group];
                                            const isSelected = editManagedGroups.includes(group);
                                            const shortLabel = group
                                                .replace('PTO HOLDING ', 'HOLD ')
                                                .replace('PTO CENTRAL', 'CENTRAL')
                                                .replace('PTO ', 'PTO ');
                                            return (
                                                <button
                                                    key={group}
                                                    onClick={() => toggleManagedGroup(group)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        background: isSelected ? colors.bg : 'var(--dark-700)',
                                                        border: isSelected ? `2px solid ${colors.border}` : '2px solid var(--dark-600)',
                                                        borderRadius: 'var(--radius-full)',
                                                        color: isSelected ? colors.text : 'var(--dark-400)',
                                                        fontWeight: '600',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {isSelected && '✓ '}{shortLabel}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {editManagedGroups.length > 0 && (
                                        <div style={{ fontSize: '10px', color: '#a78bfa', marginTop: '6px' }}>
                                            ✅ {editManagedGroups.length} grup dipilih: {editManagedGroups.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Labels */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🏷️ Label
                                </label>
                                <div style={{ fontSize: '10px', color: 'var(--dark-500)', marginBottom: '8px' }}>
                                    Label untuk mengelompokkan user lintas grup
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {allLabels.map(label => {
                                        const isSelected = editLabels.includes(label);
                                        return (
                                            <button
                                                key={label}
                                                onClick={() => toggleLabel(label)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'var(--dark-700)',
                                                    border: isSelected ? '2px solid rgba(251, 191, 36, 0.3)' : '2px solid var(--dark-600)',
                                                    borderRadius: 'var(--radius-full)',
                                                    color: isSelected ? '#fbbf24' : 'var(--dark-400)',
                                                    fontWeight: '600',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {isSelected && '✓ '}{label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={newLabelInput}
                                        onChange={e => setNewLabelInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewLabel(); } }}
                                        placeholder="Label baru (cth: ANU)"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'var(--dark-700)',
                                            border: '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--dark-100)',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <button
                                        onClick={addNewLabel}
                                        disabled={!newLabelInput.trim()}
                                        style={{
                                            padding: '8px 14px',
                                            background: newLabelInput.trim() ? 'rgba(251, 191, 36, 0.15)' : 'var(--dark-700)',
                                            border: newLabelInput.trim() ? '2px solid rgba(251, 191, 36, 0.3)' : '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: newLabelInput.trim() ? '#fbbf24' : 'var(--dark-500)',
                                            fontWeight: '600',
                                            fontSize: '11px',
                                            cursor: newLabelInput.trim() ? 'pointer' : 'default',
                                        }}
                                    >
                                        + Tambah
                                    </button>
                                </div>
                                {editLabels.length > 0 && (
                                    <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '6px' }}>
                                        🏷️ Label aktif: {editLabels.join(', ')}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary"
                                style={{ marginTop: '4px' }}
                            >
                                <span>💾</span>
                                <span>Simpan Perubahan</span>
                            </button>

                            {/* Password Change Section */}
                            <div style={{
                                marginTop: '16px',
                                paddingTop: '16px',
                                borderTop: '1px solid var(--dark-600)',
                            }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🔑 Ubah Password
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={editPassword}
                                            onChange={e => setEditPassword(e.target.value)}
                                            placeholder="Password baru (min. 6 karakter)"
                                            style={{
                                                width: '100%',
                                                padding: '10px 40px 10px 14px',
                                                background: 'var(--dark-700)',
                                                border: '2px solid var(--dark-600)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--dark-100)',
                                                fontSize: '14px',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: '4px',
                                            }}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={!editPassword || editPassword.length < 6 || changingPassword}
                                        style={{
                                            padding: '10px 16px',
                                            background: editPassword && editPassword.length >= 6 && !changingPassword
                                                ? 'rgba(251, 191, 36, 0.15)'
                                                : 'var(--dark-700)',
                                            border: editPassword && editPassword.length >= 6 && !changingPassword
                                                ? '2px solid rgba(251, 191, 36, 0.3)'
                                                : '2px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: editPassword && editPassword.length >= 6 && !changingPassword
                                                ? '#fbbf24'
                                                : 'var(--dark-500)',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            cursor: editPassword && editPassword.length >= 6 && !changingPassword
                                                ? 'pointer'
                                                : 'not-allowed',
                                            whiteSpace: 'nowrap',
                                            opacity: changingPassword ? 0.7 : 1,
                                        }}
                                    >
                                        {changingPassword ? '⏳' : '🔑'} Ubah
                                    </button>
                                </div>
                                {editPassword && editPassword.length < 6 && (
                                    <div style={{ fontSize: '10px', color: '#f87171', marginTop: '4px' }}>
                                        ⚠️ Password minimal 6 karakter
                                    </div>
                                )}
                            </div>
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

            {/* Bulk Delete Confirmation Modal */}
            <div
                className={`modal-overlay ${showBulkDeleteModal ? 'active' : ''}`}
                onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f87171', marginBottom: '8px' }}>
                            Hapus {selectedMembers.size} Anggota?
                        </h2>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px', marginBottom: '12px' }}>
                            Semua data aktivitas, progress Quran, dan profil dari <strong style={{ color: '#f87171' }}>{selectedMembers.size} anggota</strong> akan dihapus permanen.
                        </p>

                        {/* List of selected members */}
                        <div style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px',
                            marginBottom: '20px',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                        }}>
                            {members.filter(m => selectedMembers.has(m.id)).map(m => (
                                <div key={m.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                }}>
                                    <span style={{ color: 'var(--dark-200)', fontWeight: '600' }}>{m.full_name}</span>
                                    <span style={{ color: 'var(--dark-500)' }}>{m.user_group || 'No Group'}</span>
                                </div>
                            ))}
                        </div>

                        <p style={{ color: '#f87171', fontSize: '11px', fontWeight: '700', marginBottom: '20px' }}>
                            ⚠️ Aksi ini TIDAK BISA dibatalkan!
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowBulkDeleteModal(false)}
                                disabled={bulkDeleting}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                style={{ flex: 1, background: '#dc2626', opacity: bulkDeleting ? 0.6 : 1 }}
                            >
                                {bulkDeleting ? '⏳ Menghapus...' : `🗑️ Hapus ${selectedMembers.size} Anggota`}
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
                                    const shortLabel = group
                                        .replace('PTO HOLDING ', 'HOLD ')
                                        .replace('PTO CENTRAL', 'CENTRAL')
                                        .replace('PTO ', 'PTO ');
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => setImportGroup(group)}
                                            style={{
                                                padding: '6px 10px',
                                                background: importGroup === group ? colors.bg : 'var(--dark-700)',
                                                border: importGroup === group ? `2px solid ${colors.border}` : '2px solid var(--dark-600)',
                                                borderRadius: 'var(--radius-full)',
                                                color: importGroup === group ? colors.text : 'var(--dark-400)',
                                                fontWeight: '600',
                                                fontSize: '10px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {shortLabel}
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

                        {/* Import progress bar */}
                        {importing && importProgress.total > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: 'var(--dark-300)',
                                    fontWeight: '600',
                                }}>
                                    <span>⏳ Mengimport user...</span>
                                    <span>{importProgress.current} / {importProgress.total}</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: 'var(--dark-700)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                                        height: '100%',
                                        background: 'var(--primary-gradient)',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '10px',
                                    color: 'var(--dark-400)',
                                }}>
                                    {Math.round((importProgress.current / importProgress.total) * 100)}% — diproses 5 user per batch
                                </div>
                            </div>
                        )}

                        {/* Skipped users report */}
                        {importResult && importResult.skippedCount > 0 && (
                            <div style={{
                                background: 'rgba(251, 191, 36, 0.08)',
                                border: '1px solid rgba(251, 191, 36, 0.25)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#fbbf24',
                                }}>
                                    ⚠️ {importResult.skippedCount} user di-skip (sudah terdaftar)
                                </div>
                                <div style={{
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                }}>
                                    {importResult.skippedUsers?.map((u, i) => (
                                        <div key={i} style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-300)',
                                            padding: '4px 8px',
                                            background: 'rgba(251, 191, 36, 0.05)',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                        }}>
                                            <span style={{ fontWeight: '600' }}>{u.name}</span>
                                            <span style={{ color: 'var(--dark-500)' }}>{u.email}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Import result summary */}
                        {importResult && (
                            <div style={{
                                background: 'var(--dark-700)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                            }}>
                                <span style={{ color: '#34d399' }}>✅ {importResult.successCount} berhasil</span>
                                {importResult.skippedCount > 0 && (
                                    <span style={{ color: '#fbbf24' }}>⏭️ {importResult.skippedCount} skip</span>
                                )}
                                {importResult.failCount > 0 && (
                                    <span style={{ color: '#f87171' }}>❌ {importResult.failCount} gagal</span>
                                )}
                            </div>
                        )}

                        {/* Failed users report */}
                        {importResult && importResult.errors?.length > 0 && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#f87171',
                                }}>
                                    ❌ {importResult.errors.length} user gagal diimport
                                </div>
                                <div style={{
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                }}>
                                    {importResult.errors.map((err, i) => (
                                        <div key={i} style={{
                                            fontSize: '11px',
                                            color: 'var(--dark-300)',
                                            padding: '6px 8px',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            borderRadius: 'var(--radius-sm)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: '600' }}>{err.email}</span>
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#f87171' }}>
                                                {err.error}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
        </main >
    );
}
