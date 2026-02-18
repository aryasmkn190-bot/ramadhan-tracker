'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Pagination, { usePagination } from './Pagination';

const EMOJI_OPTIONS = ['📌', '💼', '😴', '🏃', '📚', '🤝', '🎯', '💡', '🌟', '🎨', '🎵', '🍽️', '☕', '🚗', '✈️', '🏠', '💊', '🧘', '🎮', '📱', '🛒', '🔧', '📝', '🎓', '🕌', '💰', '🌙', '⭐'];

export default function CategoryManager() {
    const { isAdmin } = useAuth();
    const { activityCategories, setActivityCategories, addToast } = useApp();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formId, setFormId] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formIcon, setFormIcon] = useState('📌');
    const [loading, setLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const categoryPagination = usePagination(activityCategories, 5);

    const resetForm = () => {
        setFormId('');
        setFormLabel('');
        setFormIcon('📌');
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formLabel.trim()) {
            addToast('❌ Nama kategori harus diisi', 'error');
            return;
        }

        setLoading(true);

        try {
            if (editingId) {
                // Update existing — only label and icon change, ID stays the same
                const { error } = await supabase
                    .from('activity_categories')
                    .update({
                        label: formLabel.trim(),
                        icon: formIcon,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingId);

                if (error) throw error;

                // Update local state
                setActivityCategories(prev =>
                    prev.map(c => c.id === editingId
                        ? { ...c, label: formLabel.trim(), icon: formIcon }
                        : c
                    )
                );

                addToast('✅ Kategori berhasil diperbarui', 'success');
            } else {
                // Create new
                const newId = formId.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

                if (!newId) {
                    addToast('❌ ID kategori harus diisi (huruf, angka, underscore)', 'error');
                    setLoading(false);
                    return;
                }

                // Check if ID already exists
                if (activityCategories.some(c => c.id === newId)) {
                    addToast('❌ ID kategori sudah ada', 'error');
                    setLoading(false);
                    return;
                }

                const maxOrder = activityCategories.length > 0
                    ? Math.max(...activityCategories.map(c => c.sort_order || 0))
                    : 0;

                const { error } = await supabase
                    .from('activity_categories')
                    .insert({
                        id: newId,
                        label: formLabel.trim(),
                        icon: formIcon,
                        sort_order: maxOrder + 1,
                    });

                if (error) throw error;

                // Update local state
                setActivityCategories(prev => [
                    ...prev,
                    { id: newId, label: formLabel.trim(), icon: formIcon, sort_order: maxOrder + 1 }
                ]);

                addToast('✅ Kategori baru berhasil ditambahkan', 'success');
            }

            resetForm();
        } catch (error) {
            console.error('Error saving category:', error);
            addToast('❌ Gagal menyimpan kategori: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setFormLabel(cat.label);
        setFormIcon(cat.icon);
        setShowForm(true);
    };

    const handleDelete = async (catId) => {
        // Check if any activities use this category
        try {
            const { data: usedActivities } = await supabase
                .from('custom_activities')
                .select('id')
                .eq('category', catId)
                .limit(1);

            if (usedActivities && usedActivities.length > 0) {
                addToast('❌ Kategori masih digunakan oleh aktivitas. Pindahkan aktivitas ke kategori lain terlebih dahulu.', 'error');
                setDeleteConfirmId(null);
                return;
            }
        } catch (e) {
            // Continue with delete if check fails
        }

        try {
            const { error } = await supabase
                .from('activity_categories')
                .delete()
                .eq('id', catId);

            if (error) throw error;

            setActivityCategories(prev => prev.filter(c => c.id !== catId));
            addToast('🗑️ Kategori berhasil dihapus', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            addToast('❌ Gagal menghapus kategori', 'error');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleMoveUp = async (index) => {
        if (index <= 0) return;
        const items = [...activityCategories];
        const prev = items[index - 1];
        const curr = items[index];

        try {
            await Promise.all([
                supabase.from('activity_categories').update({ sort_order: prev.sort_order }).eq('id', curr.id),
                supabase.from('activity_categories').update({ sort_order: curr.sort_order }).eq('id', prev.id),
            ]);

            // Swap
            const tempOrder = curr.sort_order;
            items[index] = { ...curr, sort_order: prev.sort_order };
            items[index - 1] = { ...prev, sort_order: tempOrder };
            setActivityCategories(items);
        } catch (e) {
            addToast('❌ Gagal mengubah urutan', 'error');
        }
    };

    const handleMoveDown = async (index) => {
        if (index >= activityCategories.length - 1) return;
        const items = [...activityCategories];
        const next = items[index + 1];
        const curr = items[index];

        try {
            await Promise.all([
                supabase.from('activity_categories').update({ sort_order: next.sort_order }).eq('id', curr.id),
                supabase.from('activity_categories').update({ sort_order: curr.sort_order }).eq('id', next.id),
            ]);

            const tempOrder = curr.sort_order;
            items[index] = { ...curr, sort_order: next.sort_order };
            items[index + 1] = { ...next, sort_order: tempOrder };
            setActivityCategories(items);
        } catch (e) {
            addToast('❌ Gagal mengubah urutan', 'error');
        }
    };

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
                    🏷️ Kategori Aktivitas
                </h2>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
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

            {/* Category List */}
            {activityCategories.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--dark-400)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</div>
                    <p>Belum ada kategori</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {categoryPagination.paginatedItems.map((cat) => {
                        // Find original index in full array for reorder
                        const originalIndex = activityCategories.findIndex(c => c.id === cat.id);
                        return (
                            <div
                                key={cat.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: 'var(--dark-800)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--dark-600)',
                                }}
                            >
                                <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'var(--dark-100)', fontWeight: '500' }}>
                                        {cat.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '2px' }}>
                                        ID: {cat.id}
                                    </div>
                                </div>

                                {/* Reorder buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button
                                        onClick={() => handleMoveUp(originalIndex)}
                                        disabled={originalIndex === 0}
                                        style={{
                                            padding: '2px 6px',
                                            background: originalIndex === 0 ? 'var(--dark-700)' : 'rgba(59, 130, 246, 0.2)',
                                            color: originalIndex === 0 ? 'var(--dark-600)' : '#60a5fa',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            cursor: originalIndex === 0 ? 'default' : 'pointer',
                                        }}
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(originalIndex)}
                                        disabled={originalIndex === activityCategories.length - 1}
                                        style={{
                                            padding: '2px 6px',
                                            background: originalIndex === activityCategories.length - 1 ? 'var(--dark-700)' : 'rgba(59, 130, 246, 0.2)',
                                            color: originalIndex === activityCategories.length - 1 ? 'var(--dark-600)' : '#60a5fa',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            cursor: originalIndex === activityCategories.length - 1 ? 'default' : 'pointer',
                                        }}
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleEdit(cat)}
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
                                        onClick={() => setDeleteConfirmId(cat.id)}
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

            {/* Pagination */}
            <Pagination
                currentPage={categoryPagination.currentPage}
                totalPages={categoryPagination.totalPages}
                totalItems={categoryPagination.totalItems}
                itemsPerPage={categoryPagination.itemsPerPage}
                onPageChange={categoryPagination.goToPage}
                onPerPageChange={categoryPagination.setPerPage}
            />

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
                        zIndex: 2000,
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
                            {editingId ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            {/* ID (only for new categories) */}
                            {!editingId && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                        ID Kategori * <span style={{ color: 'var(--dark-500)', fontSize: '10px' }}>(huruf kecil, tanpa spasi)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formId}
                                        onChange={e => setFormId(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="contoh: hiburan"
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
                                    <p style={{ fontSize: '10px', color: 'var(--dark-500)', marginTop: '4px' }}>
                                        ⚠️ ID tidak bisa diubah setelah dibuat
                                    </p>
                                </div>
                            )}

                            {/* Show current ID when editing */}
                            {editingId && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                        ID Kategori
                                    </label>
                                    <div style={{
                                        padding: '12px',
                                        background: 'var(--dark-900)',
                                        border: '1px solid var(--dark-700)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--dark-400)',
                                        fontSize: '14px',
                                    }}>
                                        {editingId} <span style={{ fontSize: '10px' }}>(tidak bisa diubah)</span>
                                    </div>
                                </div>
                            )}

                            {/* Label */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--dark-300)', fontSize: '12px', marginBottom: '6px' }}>
                                    Nama Kategori *
                                </label>
                                <input
                                    type="text"
                                    value={formLabel}
                                    onChange={e => setFormLabel(e.target.value)}
                                    placeholder="Contoh: Hiburan"
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

                            {/* Icon */}
                            <div style={{ marginBottom: '20px' }}>
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
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: loading ? 'var(--dark-600)' : 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: '600',
                                        cursor: loading ? 'default' : 'pointer',
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3000,
                        padding: '20px',
                    }}
                    onClick={() => setDeleteConfirmId(null)}
                >
                    <div
                        style={{
                            background: 'var(--dark-800)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '340px',
                            textAlign: 'center',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                        <h3 style={{ color: 'var(--dark-100)', fontSize: '16px', marginBottom: '8px' }}>
                            Hapus Kategori?
                        </h3>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px', marginBottom: '6px', lineHeight: '1.5' }}>
                            Yakin ingin menghapus kategori <strong style={{ color: 'var(--dark-200)' }}>"{deleteConfirmId}"</strong>?
                        </p>
                        <p style={{ color: 'var(--dark-500)', fontSize: '11px', marginBottom: '20px' }}>
                            Tindakan ini tidak bisa dibatalkan.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--dark-600)',
                                    color: 'var(--dark-200)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.8)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                🗑️ Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
