'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Pagination, { usePagination } from './Pagination';

export default function AdminAnnouncementsPage() {
    const { user } = useAuth();
    const { addToast } = useApp();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        if (!isSupabaseConfigured()) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setAnnouncements(data);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            addToast('❌ Judul dan isi tidak boleh kosong', 'error');
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('announcements')
                    .update({ title, content })
                    .eq('id', editingId);

                if (error) throw error;

                setAnnouncements(prev => prev.map(a =>
                    a.id === editingId ? { ...a, title, content } : a
                ));
                addToast('✅ Pengumuman berhasil diperbarui', 'success');
            } else {
                // Create
                const { data, error } = await supabase
                    .from('announcements')
                    .insert({
                        title,
                        content,
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (error) throw error;

                setAnnouncements(prev => [data, ...prev]);
                addToast('✅ Pengumuman berhasil dibuat', 'success');
            }

            resetForm();
        } catch (error) {
            console.error('Error saving announcement:', error);
            addToast('❌ Gagal menyimpan pengumuman', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setTitle(item.title);
        setContent(item.content);
        setShowForm(true);
    };

    const openDeleteModal = (item) => {
        setDeletingItem(item);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', deletingItem.id);

            if (error) throw error;

            setAnnouncements(prev => prev.filter(a => a.id !== deletingItem.id));
            addToast('✅ Pengumuman berhasil dihapus', 'success');
            setShowDeleteModal(false);
            setDeletingItem(null);
        } catch (error) {
            console.error('Error deleting announcement:', error);
            addToast('❌ Gagal menghapus pengumuman', 'error');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Pagination
    const announcementsPagination = usePagination(announcements, 10);

    if (loading) {
        return (
            <main className="main-content">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ color: 'var(--dark-400)' }}>Memuat pengumuman...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Button to toggle form */}
            <button
                onClick={() => {
                    if (showForm) resetForm();
                    else setShowForm(true);
                }}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: showForm ? 'var(--dark-700)' : 'var(--emerald-600)',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                {showForm ? (
                    <><span>❌</span><span>Batal</span></>
                ) : (
                    <><span>📢</span><span>Buat Pengumuman Baru</span></>
                )}
            </button>

            {/* Inline Form */}
            {showForm && (
                <div style={{
                    background: 'var(--dark-800)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    marginBottom: '16px',
                    border: '1px solid var(--dark-600)',
                }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'var(--dark-200)',
                        marginBottom: '14px',
                    }}>
                        {editingId ? '✏️ Edit Pengumuman' : '📝 Pengumuman Baru'}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--dark-300)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Judul
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Judul pengumuman..."
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
                                Isi Pengumuman
                            </label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Tulis isi pengumuman..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'var(--dark-700)',
                                    border: '2px solid var(--dark-600)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--dark-100)',
                                    fontSize: '14px',
                                    resize: 'none',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                            style={{ opacity: submitting ? 0.6 : 1 }}
                        >
                            <span>{submitting ? '⏳' : (editingId ? '💾' : '📢')}</span>
                            <span>{submitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Kirim Pengumuman')}</span>
                        </button>
                    </form>
                </div>
            )}

            {/* List */}
            <div style={{
                fontSize: '12px',
                color: 'var(--dark-400)',
                marginBottom: '10px',
                paddingLeft: '4px',
            }}>
                {announcements.length} pengumuman
            </div>

            {/* Pagination controls top */}
            <Pagination
                currentPage={announcementsPagination.currentPage}
                totalPages={announcementsPagination.totalPages}
                totalItems={announcementsPagination.totalItems}
                itemsPerPage={announcementsPagination.itemsPerPage}
                onPageChange={announcementsPagination.goToPage}
                onPerPageChange={announcementsPagination.setPerPage}
            />

            {announcements.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--dark-400)',
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📢</div>
                    <p style={{ fontSize: '13px' }}>Belum ada pengumuman</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {announcementsPagination.paginatedItems.map(item => (
                        <div
                            key={item.id}
                            style={{
                                background: 'var(--dark-800)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '14px',
                                border: '1px solid var(--dark-700)',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '8px',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: 'var(--dark-100)',
                                        marginBottom: '3px',
                                    }}>
                                        {item.title}
                                    </h3>
                                    <div style={{ fontSize: '10px', color: 'var(--dark-500)' }}>
                                        {formatDate(item.created_at)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--dark-700)',
                                            border: '1px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                        }}
                                    >✏️</button>
                                    <button
                                        onClick={() => openDeleteModal(item)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                        }}
                                    >🗑️</button>
                                </div>
                            </div>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--dark-300)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {item.content}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination controls bottom */}
            <Pagination
                currentPage={announcementsPagination.currentPage}
                totalPages={announcementsPagination.totalPages}
                totalItems={announcementsPagination.totalItems}
                itemsPerPage={announcementsPagination.itemsPerPage}
                onPageChange={announcementsPagination.goToPage}
                onPerPageChange={announcementsPagination.setPerPage}
            />

            {/* Delete Modal */}
            <div
                className={`modal-overlay ${showDeleteModal ? 'active' : ''}`}
                onClick={() => setShowDeleteModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '8px' }}>
                            Hapus Pengumuman?
                        </h2>
                        <p style={{ color: 'var(--dark-400)', fontSize: '13px', marginBottom: '24px' }}>
                            &ldquo;{deletingItem?.title}&rdquo;
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} style={{ flex: 1 }}>
                                Batal
                            </button>
                            <button className="btn btn-primary" onClick={handleDelete} style={{ flex: 1, background: 'var(--danger)' }}>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
