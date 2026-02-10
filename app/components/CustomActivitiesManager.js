'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Pagination, { usePagination } from './Pagination';

const CATEGORIES = [
    { value: 'istirahat', label: 'Istirahat', icon: '😴' },
    { value: 'produktifitas', label: 'Produktifitas', icon: '💼' },
    { value: 'sosial', label: 'Sosial', icon: '🤝' },
    { value: 'kesehatan', label: 'Kesehatan', icon: '🏃' },
    { value: 'pendidikan', label: 'Pendidikan', icon: '📚' },
    { value: 'lainnya', label: 'Lainnya', icon: '📌' },
];

const EMOJI_OPTIONS = ['📌', '💼', '😴', '🏃', '📚', '🤝', '🎯', '💡', '🌟', '🎨', '🎵', '🍽️', '☕', '🚗', '✈️', '🏠', '💊', '🧘', '🎮', '📱'];

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

export default function CustomActivitiesManager() {
    const { isAdmin, user } = useAuth();
    const { addToast } = useApp();

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('lainnya');
    const [formIcon, setFormIcon] = useState('📌');
    const [formDescription, setFormDescription] = useState('');
    const [formTargetGroups, setFormTargetGroups] = useState([]); // empty = semua group

    useEffect(() => {
        if (isAdmin) {
            fetchActivities();
        }
    }, [isAdmin]);

    const fetchActivities = async () => {
        if (!isSupabaseConfigured()) return;

        try {
            const { data, error } = await supabase
                .from('custom_activities')
                .select('*')
                .order('category', { ascending: true });

            if (error) throw error;
            if (data) setActivities(data);
        } catch (error) {
            console.error('Error fetching custom activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormCategory('lainnya');
        setFormIcon('📌');
        setFormDescription('');
        setFormTargetGroups([]);
        setEditingId(null);
        setShowForm(false);
    };

    const toggleGroup = (group) => {
        setFormTargetGroups(prev =>
            prev.includes(group)
                ? prev.filter(g => g !== group)
                : [...prev, group]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formName.trim()) {
            addToast('❌ Nama aktivitas harus diisi', 'error');
            return;
        }

        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('custom_activities')
                    .update({
                        name: formName.trim(),
                        category: formCategory,
                        icon: formIcon,
                        description: formDescription.trim(),
                        target_groups: formTargetGroups.length > 0 ? formTargetGroups : null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingId);

                if (error) throw error;
                addToast('✅ Aktivitas berhasil diperbarui', 'success');
            } else {
                // Create new
                const { error } = await supabase
                    .from('custom_activities')
                    .insert({
                        name: formName.trim(),
                        category: formCategory,
                        icon: formIcon,
                        description: formDescription.trim(),
                        target_groups: formTargetGroups.length > 0 ? formTargetGroups : null,
                        created_by: user.id,
                        is_active: true,
                    });

                if (error) throw error;
                addToast('✅ Aktivitas baru berhasil ditambahkan', 'success');
            }

            resetForm();
            fetchActivities();
        } catch (error) {
            console.error('Error saving activity:', error);
            addToast('❌ Gagal menyimpan aktivitas', 'error');
        }
    };

    const handleEdit = (activity) => {
        setFormName(activity.name);
        setFormCategory(activity.category);
        setFormIcon(activity.icon || '📌');
        setFormDescription(activity.description || '');
        setFormTargetGroups(activity.target_groups || []);
        setEditingId(activity.id);
        setShowForm(true);
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('custom_activities')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setActivities(prev => prev.map(a =>
                a.id === id ? { ...a, is_active: !currentStatus } : a
            ));

            addToast(currentStatus ? '⏸️ Aktivitas dinonaktifkan' : '▶️ Aktivitas diaktifkan', 'info');
        } catch (error) {
            console.error('Error toggling activity:', error);
            addToast('❌ Gagal mengubah status', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus aktivitas ini?')) return;

        try {
            const { error } = await supabase
                .from('custom_activities')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setActivities(prev => prev.filter(a => a.id !== id));
            addToast('🗑️ Aktivitas berhasil dihapus', 'success');
        } catch (error) {
            console.error('Error deleting activity:', error);
            addToast('❌ Gagal menghapus aktivitas', 'error');
        }
    };

    // Pagination
    const activitiesPagination = usePagination(activities, 10);

    if (!isAdmin) return null;

    return (
        <div style={{ marginTop: '24px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
            }}>
                <h2 style={{ color: 'var(--dark-100)', fontSize: '16px', fontWeight: '600' }}>
                    📋 Aktivitas Lainnya
                </h2>
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    + Tambah
                </button>
            </div>

            {/* Activity List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--dark-400)' }}>
                    Memuat...
                </div>
            ) : activities.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--dark-400)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                    <p>Belum ada aktivitas custom</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "+ Tambah" untuk membuat aktivitas baru</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activitiesPagination.paginatedItems.map(activity => {
                        const cat = CATEGORIES.find(c => c.value === activity.category) || CATEGORIES[5];
                        return (
                            <div
                                key={activity.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: activity.is_active ? 'var(--dark-800)' : 'var(--dark-900)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${activity.is_active ? 'var(--dark-600)' : 'var(--dark-700)'}`,
                                    opacity: activity.is_active ? 1 : 0.6,
                                }}
                            >
                                <span style={{ fontSize: '24px' }}>{activity.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'var(--dark-100)', fontWeight: '500' }}>
                                        {activity.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                                        {cat.icon} {cat.label}
                                        {activity.description && ` • ${activity.description.substring(0, 30)}...`}
                                    </div>
                                    <div style={{ display: 'flex', gap: '3px', marginTop: '4px', flexWrap: 'wrap' }}>
                                        {!activity.target_groups || activity.target_groups.length === 0 ? (
                                            <span style={{
                                                fontSize: '8px',
                                                padding: '1px 6px',
                                                borderRadius: 'var(--radius-full)',
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                color: '#34d399',
                                                fontWeight: '700',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                            }}>🌐 SEMUA</span>
                                        ) : (
                                            activity.target_groups.map(g => {
                                                const gc = GROUP_COLORS[g];
                                                return gc ? (
                                                    <span key={g} style={{
                                                        fontSize: '8px',
                                                        padding: '1px 5px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: gc.bg,
                                                        color: gc.text,
                                                        fontWeight: '700',
                                                        border: `1px solid ${gc.border}`,
                                                    }}>{g}</span>
                                                ) : null;
                                            })
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleToggleActive(activity.id, activity.is_active)}
                                        style={{
                                            padding: '6px 10px',
                                            background: activity.is_active ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: activity.is_active ? 'var(--gold-400)' : 'var(--success)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {activity.is_active ? '⏸️' : '▶️'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(activity)}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#60a5fa',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(activity.id)}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#f87171',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination controls */}
            {activities.length > 0 && (
                <Pagination
                    currentPage={activitiesPagination.currentPage}
                    totalPages={activitiesPagination.totalPages}
                    totalItems={activitiesPagination.totalItems}
                    itemsPerPage={activitiesPagination.itemsPerPage}
                    onPageChange={activitiesPagination.goToPage}
                    onPerPageChange={activitiesPagination.setPerPage}
                />
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={() => resetForm()}
                >
                    <div
                        style={{
                            background: 'var(--dark-800)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '400px',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ color: 'white', marginBottom: '20px' }}>
                            {editingId ? '✏️ Edit Aktivitas' : '➕ Tambah Aktivitas'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Nama Aktivitas *
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="Contoh: Tidur Siang"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>

                            {/* Category */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Kategori
                                </label>
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '14px',
                                    }}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.icon} {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Icon */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Icon
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setFormIcon(emoji)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                fontSize: '20px',
                                                background: formIcon === emoji ? 'var(--primary)' : 'var(--dark-700)',
                                                border: formIcon === emoji ? '2px solid var(--primary)' : '1px solid var(--dark-600)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Deskripsi (opsional)
                                </label>
                                <textarea
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="Deskripsi singkat aktivitas..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '14px',
                                        resize: 'none',
                                    }}
                                />
                            </div>

                            {/* Target Groups */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Tampilkan untuk Grup
                                </label>
                                <p style={{ fontSize: '10px', color: 'var(--dark-500)', marginBottom: '8px' }}>
                                    Pilih grup yang bisa melihat aktivitas ini. Kosongkan untuk semua grup.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setFormTargetGroups([])}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 'var(--radius-full)',
                                            border: formTargetGroups.length === 0
                                                ? '2px solid rgba(16, 185, 129, 0.4)'
                                                : '2px solid var(--dark-600)',
                                            background: formTargetGroups.length === 0
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : 'var(--dark-700)',
                                            color: formTargetGroups.length === 0
                                                ? '#34d399'
                                                : 'var(--dark-400)',
                                            fontWeight: '600',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🌐 Semua
                                    </button>
                                    {USER_GROUPS.map(group => {
                                        const gc = GROUP_COLORS[group];
                                        const isSelected = formTargetGroups.includes(group);
                                        return (
                                            <button
                                                key={group}
                                                type="button"
                                                onClick={() => toggleGroup(group)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: 'var(--radius-full)',
                                                    border: isSelected
                                                        ? `2px solid ${gc.border}`
                                                        : '2px solid var(--dark-600)',
                                                    background: isSelected ? gc.bg : 'var(--dark-700)',
                                                    color: isSelected ? gc.text : 'var(--dark-400)',
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
                                {formTargetGroups.length > 0 && (
                                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--dark-400)' }}>
                                        Hanya tampil untuk: {formTargetGroups.join(', ')}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--dark-600)',
                                        color: 'var(--dark-200)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {editingId ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
