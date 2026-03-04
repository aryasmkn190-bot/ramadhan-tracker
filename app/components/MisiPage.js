'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

// ==================== MISSION DEFINITIONS ====================
const HAFALAN_GROUPS = [
    {
        label: 'Kelompok 1',
        items: [
            { id: 'hafalan_60_12', label: 'QS. Al-Mumtahanah (60:12)' },
            { id: 'hafalan_61_1_14', label: 'QS. Ash-Shaff (61:1-14)' },
            { id: 'hafalan_3_190_194', label: 'QS. Ali Imran (3:190-194)' },
        ]
    },
    {
        label: 'Kelompok 2',
        items: [
            { id: 'hafalan_16_125', label: 'QS. An-Nahl (16:125)' },
            { id: 'hafalan_3_104', label: 'QS. Ali Imran (3:104)' },
        ]
    },
    {
        label: 'Kelompok 3',
        items: [
            { id: 'hafalan_57_10', label: 'QS. Al-Hadid (57:10)' },
            { id: 'hafalan_15_19_20', label: 'QS. Al-Hijr (15:19-20)' },
            { id: 'hafalan_9_24', label: 'QS. At-Taubah (9:24)' },
            { id: 'hafalan_20_117_119', label: 'QS. Thaha (20:117-119)' },
        ]
    },
    {
        label: 'Kelompok 4',
        items: [{ id: 'hafalan_24_36', label: 'QS. An-Nur (24:36)' }]
    },
    {
        label: 'Kelompok 5',
        items: [{ id: 'hafalan_3_200', label: 'QS. Ali Imran (3:200)' }]
    },
];

const ALL_HAFALAN_IDS = HAFALAN_GROUPS.flatMap(g => g.items.map(i => i.id));
const LARI_ITEMS = [
    { id: 'lari_1', label: 'Lari ke-1' },
    { id: 'lari_2', label: 'Lari ke-2' },
    { id: 'lari_3', label: 'Lari ke-3' },
];
const LARI_TIME_SLOTS = ['07:00-08:00', '14:00-15:00', '16:00-17:00'];

const SECTIONS = [
    { id: 'hafalan', title: 'Hafalan Ayat Al-Quran', icon: '📖', color: '#10b981', desc: 'Setorkan hafalan surat yang ditentukan' },
    { id: 'khatam', title: 'Khatam Al-Quran', icon: '🕌', color: '#fbbf24', desc: 'Khatamkan Al-Quran selama Ramadhan' },
    { id: 'amalan', title: 'Daftar Amalan Aktivis', icon: '📋', color: '#3b82f6', desc: 'Catat amalan yang dijalankan' },
    { id: 'buku', title: 'Membaca Buku Khusus', icon: '📚', color: '#8b5cf6', desc: 'Baca buku yang ditentukan' },
    { id: 'leadership', title: 'Leadership & Organisasi', icon: '🏛️', color: '#ec4899', desc: 'Dokumentasikan kegiatan kepemimpinan' },
    { id: 'daya_jelajah', title: 'Daya Jelajah', icon: '🗺️', color: '#14b8a6', desc: 'Kunjungi kampus-kampus' },
    { id: 'tulisan', title: 'Menulis Hasil Pengamatan', icon: '✍️', color: '#f97316', desc: 'Upload karya tulis pengamatan' },
    { id: 'lari', title: 'Lari 2,5 KM', icon: '🏃', color: '#ef4444', desc: '3 kali lari di jam khusus Ramadhan' },
];

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==================== IMAGE COMPRESSION ====================
// Compress image client-side using Canvas API
// - Max dimension: 1200px (longest side, maintains aspect ratio)
// - JPEG quality: 0.75 (75%) — visually near-identical, much smaller file
// - Typical result: 5-10MB photo → 200-500KB
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        // Only compress image files
        if (!file.type.startsWith('image/')) {
            resolve(file); // Return original if not an image
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calculate new dimensions (maintain aspect ratio)
                let { width, height } = img;
                const originalSize = file.size;

                if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
                        width = MAX_IMAGE_DIMENSION;
                    } else {
                        width = Math.round((width / height) * MAX_IMAGE_DIMENSION);
                        height = MAX_IMAGE_DIMENSION;
                    }
                }

                // Draw to canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Enable image smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file); // Fallback to original
                            return;
                        }
                        // Create a new File object with the compressed data
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.jpg'), // Always save as .jpg
                            { type: 'image/jpeg' }
                        );

                        const savedPercent = Math.round((1 - compressedFile.size / originalSize) * 100);
                        console.log(
                            `📸 Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${savedPercent}% smaller) | ${img.naturalWidth}x${img.naturalHeight} → ${width}x${height}`
                        );

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    JPEG_QUALITY
                );
            };
            img.onerror = () => resolve(file); // Fallback to original
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file); // Fallback to original
        reader.readAsDataURL(file);
    });
};

// Helper: format file size for display
const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ==================== STYLES ====================
const cardStyle = {
    background: 'linear-gradient(135deg, var(--dark-700) 0%, var(--dark-800) 100%)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: '12px',
    transition: 'all 0.25s ease',
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--dark-700)',
    border: '1px solid var(--dark-600)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--dark-100)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
};

const smallBtnStyle = (color) => ({
    padding: '10px 18px',
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
});

// ==================== COMPONENT ====================
export default function MisiPage() {
    const { user } = useAuth();
    const { addToast } = useApp();

    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Form states
    const [amalanForm, setAmalanForm] = useState({ nama: '', tanggal: todayStr() });
    const [leadershipForm, setLeadershipForm] = useState({ nama: '', tanggal: todayStr() });
    const [dayaJelajahForm, setDayaJelajahForm] = useState({ kampus: '', tanggal: todayStr() });
    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);

    // ==================== DATA LOADING ====================
    const loadMissions = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('user_missions')
                .select('*')
                .eq('user_id', user.id);
            if (error) throw error;
            setMissions(data || []);
        } catch (e) {
            console.error('Error loading missions:', e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadMissions(); }, [loadMissions]);

    // ==================== HELPERS ====================
    const getMission = (missionId) => missions.find(m => m.mission_id === missionId);
    const getMultiMissions = (prefix) => missions.filter(m => m.mission_id === prefix);

    const upsertMission = async (missionId, data) => {
        const existing = getMission(missionId);
        if (existing) {
            const { error } = await supabase
                .from('user_missions')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('user_missions')
                .insert({ user_id: user.id, mission_id: missionId, ...data });
            if (error) throw error;
        }
        await loadMissions();
    };

    const insertMission = async (missionId, data) => {
        const { error } = await supabase
            .from('user_missions')
            .insert({ user_id: user.id, mission_id: missionId, ...data });
        if (error) throw error;
        await loadMissions();
    };

    const deleteMission = async (id) => {
        const mission = missions.find(m => m.id === id);
        if (mission?.file_url) {
            try {
                const urlParts = mission.file_url.split('/missions/');
                if (urlParts[1]) {
                    await supabase.storage.from('missions').remove([decodeURIComponent(urlParts[1])]);
                }
            } catch (e) { console.error('File delete error:', e); }
        }
        const { error } = await supabase.from('user_missions').delete().eq('id', id);
        if (error) throw error;
        await loadMissions();
    };

    // ==================== TOGGLE HANDLERS ====================
    const toggleCheckItem = async (missionId) => {
        try {
            const existing = getMission(missionId);
            const newCompleted = !existing?.completed;
            await upsertMission(missionId, {
                completed: newCompleted,
                completion_date: newCompleted ? todayStr() : null,
            });
            addToast(newCompleted ? '✅ Misi tercatat!' : '↩️ Misi dibatalkan', newCompleted ? 'success' : 'info');
        } catch (e) {
            addToast('Gagal menyimpan. Coba lagi.', 'error');
        }
    };

    const toggleHafalanItem = async (itemId, dateValue) => {
        try {
            const existing = getMission(itemId);
            const newCompleted = !existing?.completed;
            await upsertMission(itemId, {
                completed: newCompleted,
                completion_date: newCompleted ? (dateValue || todayStr()) : null,
            });
            addToast(newCompleted ? '✅ Hafalan tercatat!' : '↩️ Hafalan dibatalkan', newCompleted ? 'success' : 'info');
        } catch (e) {
            addToast('Gagal menyimpan. Coba lagi.', 'error');
        }
    };

    const updateHafalanDate = async (itemId, dateValue) => {
        try {
            await upsertMission(itemId, { completion_date: dateValue });
        } catch (e) {
            addToast('Gagal memperbarui tanggal.', 'error');
        }
    };

    const toggleLariItem = async (itemId, timeSlot, dateValue) => {
        try {
            const existing = getMission(itemId);
            const newCompleted = !existing?.completed;
            await upsertMission(itemId, {
                completed: newCompleted,
                completion_date: newCompleted ? (dateValue || todayStr()) : null,
                data: newCompleted ? { timeSlot: timeSlot || '' } : {},
            });
            addToast(newCompleted ? '✅ Lari tercatat! 🏃' : '↩️ Lari dibatalkan', newCompleted ? 'success' : 'info');
        } catch (e) {
            addToast('Gagal menyimpan. Coba lagi.', 'error');
        }
    };

    // ==================== MULTI-ENTRY HANDLERS ====================
    const addAmalan = async () => {
        if (!amalanForm.nama.trim()) { addToast('Nama amalan harus diisi', 'error'); return; }
        try {
            await insertMission('amalan', {
                completed: true,
                completion_date: amalanForm.tanggal,
                data: { nama: amalanForm.nama.trim() },
            });
            setAmalanForm({ nama: '', tanggal: todayStr() });
            addToast('✅ Amalan ditambahkan!', 'success');
        } catch (e) { addToast('Gagal menambahkan amalan.', 'error'); }
    };

    const addLeadership = async (photoFile) => {
        if (!leadershipForm.nama.trim()) { addToast('Nama kegiatan harus diisi', 'error'); return; }
        try {
            let fileUrl = null;
            if (photoFile) {
                setUploading(true);
                addToast('🔄 Mengkompresi foto...', 'info');

                // Compress the photo before uploading
                const originalSize = photoFile.size;
                const compressed = await compressImage(photoFile);
                const savedPercent = Math.round((1 - compressed.size / originalSize) * 100);

                if (savedPercent > 5) {
                    addToast(`📸 Foto dikompresi: ${formatFileSize(originalSize)} → ${formatFileSize(compressed.size)} (${savedPercent}% lebih kecil)`, 'success');
                }

                const path = `${user.id}/leadership_${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage.from('missions').upload(path, compressed);
                if (uploadErr) throw uploadErr;
                const { data: urlData } = supabase.storage.from('missions').getPublicUrl(path);
                fileUrl = urlData.publicUrl;
                setUploading(false);
            }
            await insertMission('leadership', {
                completed: true,
                completion_date: leadershipForm.tanggal,
                data: { nama: leadershipForm.nama.trim() },
                file_url: fileUrl,
            });
            setLeadershipForm({ nama: '', tanggal: todayStr() });
            addToast('✅ Kegiatan leadership ditambahkan!', 'success');
        } catch (e) {
            setUploading(false);
            addToast('Gagal menambahkan kegiatan.', 'error');
        }
    };

    const addDayaJelajah = async () => {
        if (!dayaJelajahForm.kampus.trim()) { addToast('Nama kampus harus diisi', 'error'); return; }
        try {
            await insertMission('daya_jelajah', {
                completed: true,
                completion_date: dayaJelajahForm.tanggal,
                data: { kampus: dayaJelajahForm.kampus.trim() },
            });
            setDayaJelajahForm({ kampus: '', tanggal: todayStr() });
            addToast('✅ Kampus ditambahkan!', 'success');
        } catch (e) { addToast('Gagal menambahkan.', 'error'); }
    };

    const uploadTulisan = async (file) => {
        if (!file) return;
        try {
            setUploading(true);

            // Compress if it's an image file
            let fileToUpload = file;
            let ext = file.name.split('.').pop();
            if (file.type.startsWith('image/')) {
                addToast('🔄 Mengkompresi gambar...', 'info');
                const originalSize = file.size;
                fileToUpload = await compressImage(file);
                ext = 'jpg';
                const savedPercent = Math.round((1 - fileToUpload.size / originalSize) * 100);
                if (savedPercent > 5) {
                    addToast(`📸 Dikompresi: ${formatFileSize(originalSize)} → ${formatFileSize(fileToUpload.size)} (${savedPercent}% lebih kecil)`, 'success');
                }
            }

            const path = `${user.id}/tulisan_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('missions').upload(path, fileToUpload);
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage.from('missions').getPublicUrl(path);
            await insertMission('tulisan', {
                completed: true,
                completion_date: todayStr(),
                data: { fileName: file.name },
                file_url: urlData.publicUrl,
            });
            setUploading(false);
            addToast('✅ Karya tulis berhasil diupload!', 'success');
        } catch (e) {
            setUploading(false);
            addToast('Gagal mengupload file.', 'error');
        }
    };

    const handleDelete = async (id, label) => {
        try {
            await deleteMission(id);
            addToast(`🗑️ ${label} dihapus`, 'info');
        } catch (e) { addToast('Gagal menghapus.', 'error'); }
    };

    // ==================== PROGRESS CALCULATION ====================
    const getProgress = () => {
        const hafalanDone = ALL_HAFALAN_IDS.filter(id => getMission(id)?.completed).length;
        const khatamDone = getMission('khatam')?.completed ? 1 : 0;
        const amalanDone = getMultiMissions('amalan').length > 0 ? 1 : 0;
        const bukuDone = getMission('buku')?.completed ? 1 : 0;
        const leadershipDone = getMultiMissions('leadership').length > 0 ? 1 : 0;
        const dayaJelajahDone = getMultiMissions('daya_jelajah').length > 0 ? 1 : 0;
        const tulisanDone = getMultiMissions('tulisan').length > 0 ? 1 : 0;
        const lariDone = LARI_ITEMS.filter(l => getMission(l.id)?.completed).length;

        const totalCategories = 8;
        const completedCategories = [
            hafalanDone === ALL_HAFALAN_IDS.length,
            khatamDone, amalanDone, bukuDone,
            leadershipDone, dayaJelajahDone, tulisanDone,
            lariDone === 3,
        ].filter(Boolean).length;

        return {
            hafalanDone, khatamDone, amalanDone, bukuDone,
            leadershipDone, dayaJelajahDone, tulisanDone, lariDone,
            completedCategories, totalCategories,
            percentage: Math.round((completedCategories / totalCategories) * 100),
        };
    };

    const getSectionProgress = (sectionId) => {
        switch (sectionId) {
            case 'hafalan': {
                const done = ALL_HAFALAN_IDS.filter(id => getMission(id)?.completed).length;
                return `${done}/${ALL_HAFALAN_IDS.length}`;
            }
            case 'khatam': return getMission('khatam')?.completed ? '✅' : '—';
            case 'amalan': { const c = getMultiMissions('amalan').length; return c > 0 ? `${c} amalan` : '—'; }
            case 'buku': return getMission('buku')?.completed ? '✅' : '—';
            case 'leadership': { const c = getMultiMissions('leadership').length; return c > 0 ? `${c} kegiatan` : '—'; }
            case 'daya_jelajah': { const c = getMultiMissions('daya_jelajah').length; return c > 0 ? `${c} kampus` : '—'; }
            case 'tulisan': { const c = getMultiMissions('tulisan').length; return c > 0 ? `${c} tulisan` : '—'; }
            case 'lari': {
                const done = LARI_ITEMS.filter(l => getMission(l.id)?.completed).length;
                return `${done}/3`;
            }
            default: return '—';
        }
    };

    const progress = getProgress();

    // ==================== RENDER HELPERS ====================
    const renderCheckItem = (id, label, color) => {
        const m = getMission(id);
        const completed = m?.completed;
        return (
            <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: completed ? `${color}15` : 'transparent',
                borderRadius: 'var(--radius-md)', transition: 'all 0.2s ease',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
                <button onClick={() => toggleCheckItem(id)} style={{
                    width: '26px', height: '26px', borderRadius: 'var(--radius-full)',
                    border: completed ? 'none' : '2px solid var(--dark-500)',
                    background: completed ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)', flexShrink: 0,
                }}>
                    {completed && <span style={{ color: 'white', fontSize: '14px', fontWeight: '700' }}>✓</span>}
                </button>
                <span style={{
                    flex: 1, fontSize: '14px', fontWeight: '500',
                    color: completed ? 'var(--dark-200)' : 'var(--dark-300)',
                    textDecoration: completed ? 'line-through' : 'none',
                    opacity: completed ? 0.8 : 1,
                }}>{label}</span>
            </div>
        );
    };

    const renderHafalanSection = () => (
        <div style={{ padding: '4px 0' }}>
            {HAFALAN_GROUPS.map((group, gi) => (
                <div key={gi} style={{ marginBottom: '16px' }}>
                    <div style={{
                        fontSize: '11px', fontWeight: '700', color: '#10b981',
                        textTransform: 'uppercase', letterSpacing: '1px',
                        padding: '0 16px', marginBottom: '8px',
                    }}>{group.label}</div>
                    {group.items.map(item => {
                        const m = getMission(item.id);
                        const completed = m?.completed;
                        return (
                            <div key={item.id} style={{
                                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                                background: completed ? 'rgba(16,185,129,0.08)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                            }}>
                                <button onClick={() => toggleHafalanItem(item.id)} style={{
                                    width: '24px', height: '24px', borderRadius: 'var(--radius-full)',
                                    border: completed ? 'none' : '2px solid var(--dark-500)',
                                    background: completed ? 'var(--primary-gradient)' : 'transparent',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s ease', flexShrink: 0,
                                }}>
                                    {completed && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                </button>
                                <span style={{
                                    flex: 1, fontSize: '13px', fontWeight: '500',
                                    color: completed ? 'var(--dark-200)' : 'var(--dark-300)',
                                    textDecoration: completed ? 'line-through' : 'none',
                                }}>{item.label}</span>
                                <input type="date" value={m?.completion_date || ''}
                                    onChange={(e) => {
                                        if (completed) updateHafalanDate(item.id, e.target.value);
                                        else toggleHafalanItem(item.id, e.target.value);
                                    }}
                                    style={{
                                        ...inputStyle, width: '140px', padding: '6px 8px', fontSize: '12px',
                                        background: 'var(--dark-800)', border: '1px solid var(--dark-600)',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    const renderMultiEntries = (prefix, entries, fields, color) => (
        <div style={{ padding: '8px 16px' }}>
            {entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--dark-500)', fontSize: '13px' }}>
                    Belum ada data. Tambahkan di bawah.
                </div>
            )}
            {entries.map((entry, i) => (
                <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', background: `${color}10`, borderRadius: 'var(--radius-md)',
                    marginBottom: '8px', border: `1px solid ${color}20`,
                }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dark-100)' }}>
                            {entry.data?.nama || entry.data?.kampus || entry.data?.fileName || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                            📅 {entry.completion_date || '-'}
                        </div>
                        {entry.file_url && (
                            <a href={entry.file_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '11px', color: color, marginTop: '4px', display: 'inline-block' }}>
                                📎 Lihat lampiran
                            </a>
                        )}
                    </div>
                    <button onClick={() => handleDelete(entry.id, 'Item')} style={{
                        background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px', cursor: 'pointer', fontSize: '12px', color: '#f87171',
                    }}>🗑️</button>
                </div>
            ))}
        </div>
    );

    const renderLariSection = () => (
        <div style={{ padding: '8px 16px' }}>
            <div style={{
                padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)',
                marginBottom: '16px', border: '1px solid rgba(239,68,68,0.15)',
            }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#f87171', marginBottom: '6px' }}>⏰ Jam Khusus Lari:</div>
                {LARI_TIME_SLOTS.map(slot => (
                    <div key={slot} style={{ fontSize: '12px', color: 'var(--dark-300)', padding: '2px 0' }}>• {slot}</div>
                ))}
            </div>
            {LARI_ITEMS.map(item => {
                const m = getMission(item.id);
                const completed = m?.completed;
                return (
                    <div key={item.id} style={{
                        padding: '14px', background: completed ? 'rgba(239,68,68,0.08)' : 'var(--dark-800)',
                        borderRadius: 'var(--radius-md)', marginBottom: '10px',
                        border: `1px solid ${completed ? 'rgba(239,68,68,0.2)' : 'var(--dark-600)'}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: completed ? '10px' : 0 }}>
                            <button onClick={() => toggleLariItem(item.id, m?.data?.timeSlot)} style={{
                                width: '26px', height: '26px', borderRadius: 'var(--radius-full)',
                                border: completed ? 'none' : '2px solid var(--dark-500)',
                                background: completed ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.3s ease', flexShrink: 0,
                            }}>
                                {completed && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                            </button>
                            <span style={{
                                flex: 1, fontSize: '14px', fontWeight: '600',
                                color: completed ? 'var(--dark-100)' : 'var(--dark-300)',
                            }}>{item.label}</span>
                        </div>
                        {completed && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: '38px', flexWrap: 'wrap' }}>
                                <input type="date" value={m?.completion_date || ''}
                                    onChange={async (e) => {
                                        try { await upsertMission(item.id, { completion_date: e.target.value }); }
                                        catch (err) { addToast('Gagal update tanggal', 'error'); }
                                    }}
                                    style={{ ...inputStyle, width: '140px', padding: '6px 8px', fontSize: '12px', background: 'var(--dark-700)' }}
                                />
                                <select value={m?.data?.timeSlot || ''}
                                    onChange={async (e) => {
                                        try { await upsertMission(item.id, { data: { timeSlot: e.target.value } }); }
                                        catch (err) { addToast('Gagal update jam', 'error'); }
                                    }}
                                    style={{ ...inputStyle, width: '140px', padding: '6px 8px', fontSize: '12px', background: 'var(--dark-700)' }}
                                >
                                    <option value="">Pilih jam</option>
                                    {LARI_TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // ==================== SECTION CONTENT ====================
    const renderSectionContent = (sectionId) => {
        const sec = SECTIONS.find(s => s.id === sectionId);
        const color = sec?.color || '#10b981';

        switch (sectionId) {
            case 'hafalan': return renderHafalanSection();
            case 'khatam': return (
                <div style={{ padding: '16px' }}>{renderCheckItem('khatam', 'Khatam Al-Quran 30 Juz', color)}</div>
            );
            case 'amalan': return (
                <>
                    {renderMultiEntries('amalan', getMultiMissions('amalan'), ['nama'], color)}
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input placeholder="Nama amalan..." value={amalanForm.nama}
                            onChange={e => setAmalanForm(p => ({ ...p, nama: e.target.value }))} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" value={amalanForm.tanggal}
                                onChange={e => setAmalanForm(p => ({ ...p, tanggal: e.target.value }))}
                                style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={addAmalan} style={smallBtnStyle(color)}>+ Tambah</button>
                        </div>
                    </div>
                </>
            );
            case 'buku': return (
                <div style={{ padding: '16px' }}>{renderCheckItem('buku', 'Membaca Buku Khusus', color)}</div>
            );
            case 'leadership': return (
                <>
                    {renderMultiEntries('leadership', getMultiMissions('leadership'), ['nama'], color)}
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input placeholder="Nama kegiatan..." value={leadershipForm.nama}
                            onChange={e => setLeadershipForm(p => ({ ...p, nama: e.target.value }))} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" value={leadershipForm.tanggal}
                                onChange={e => setLeadershipForm(p => ({ ...p, tanggal: e.target.value }))}
                                style={{ ...inputStyle, flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={e => { if (e.target.files[0]) addLeadership(e.target.files[0]); }} />
                            <button onClick={() => {
                                if (!leadershipForm.nama.trim()) { addToast('Nama kegiatan harus diisi', 'error'); return; }
                                photoInputRef.current?.click();
                            }} disabled={uploading} style={{
                                ...smallBtnStyle('#64748b'), flex: 1,
                                opacity: uploading ? 0.6 : 1,
                            }}>
                                {uploading ? '⏳ Uploading...' : '📷 + Photo'}
                            </button>
                            <button onClick={() => addLeadership(null)} style={{ ...smallBtnStyle(color), flex: 1 }}>
                                + Tanpa Photo
                            </button>
                        </div>
                    </div>
                </>
            );
            case 'daya_jelajah': return (
                <>
                    {renderMultiEntries('daya_jelajah', getMultiMissions('daya_jelajah'), ['kampus'], color)}
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input placeholder="Nama kampus..." value={dayaJelajahForm.kampus}
                            onChange={e => setDayaJelajahForm(p => ({ ...p, kampus: e.target.value }))} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" value={dayaJelajahForm.tanggal}
                                onChange={e => setDayaJelajahForm(p => ({ ...p, tanggal: e.target.value }))}
                                style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={addDayaJelajah} style={smallBtnStyle(color)}>+ Tambah</button>
                        </div>
                    </div>
                </>
            );
            case 'tulisan': return (
                <>
                    {renderMultiEntries('tulisan', getMultiMissions('tulisan'), [], color)}
                    <div style={{ padding: '0 16px 16px' }}>
                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadTulisan(e.target.files[0]); }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                            width: '100%', padding: '14px', border: '2px dashed var(--dark-500)',
                            borderRadius: 'var(--radius-md)', background: 'transparent',
                            color: 'var(--dark-300)', fontSize: '14px', fontWeight: '500',
                            cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.2s ease', opacity: uploading ? 0.6 : 1,
                        }}>
                            {uploading ? '⏳ Mengupload...' : '📄 Upload Karya Tulis'}
                        </button>
                    </div>
                </>
            );
            case 'lari': return renderLariSection();
            default: return null;
        }
    };

    // ==================== MAIN RENDER ====================
    if (loading) {
        return (
            <div className="main-content">
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>🎯</div>
                    <div style={{ color: 'var(--dark-400)', fontSize: '14px', marginTop: '12px' }}>Memuat misi...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            {/* Hero Card */}
            <div style={{
                background: 'linear-gradient(135deg, #047857 0%, #065f46 40%, #0f766e 100%)',
                borderRadius: 'var(--radius-xl)', padding: '24px',
                marginBottom: '20px', position: 'relative', overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
                <div style={{
                    position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-30px', left: '-10px', width: '80px', height: '80px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '50%',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '32px' }}>🎯</span>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
                                Misi Ramadhan
                            </h2>
                            <p style={{ fontSize: '12px', color: 'rgba(167,243,208,0.85)', fontWeight: '400' }}>
                                Capai seluruh misi selama bulan Ramadhan
                            </p>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{
                        height: '8px', background: 'rgba(255,255,255,0.15)',
                        borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '10px',
                    }}>
                        <div style={{
                            height: '100%', width: `${progress.percentage}%`,
                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                            borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                            {progress.completedCategories}/{progress.totalCategories} kategori selesai
                        </span>
                        <span style={{
                            fontSize: '14px', fontWeight: '800', color: '#fbbf24',
                        }}>{progress.percentage}%</span>
                    </div>
                </div>
            </div>

            {/* Mission Sections */}
            {SECTIONS.map(section => {
                const isExpanded = expanded === section.id;
                const prog = getSectionProgress(section.id);
                return (
                    <div key={section.id} style={{
                        ...cardStyle,
                        border: isExpanded ? `1px solid ${section.color}30` : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isExpanded ? `0 4px 20px ${section.color}15` : 'none',
                    }}>
                        {/* Section Header */}
                        <button onClick={() => setExpanded(isExpanded ? null : section.id)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '16px', background: 'transparent', border: 'none',
                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                                background: `${section.color}20`, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                            }}>{section.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--dark-100)' }}>
                                    {section.title}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '2px' }}>
                                    {section.desc}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span style={{
                                    fontSize: '12px', fontWeight: '700', color: section.color,
                                    background: `${section.color}15`, padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                }}>{prog}</span>
                                <span style={{
                                    fontSize: '14px', color: 'var(--dark-400)',
                                    transition: 'transform 0.3s ease',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                    display: 'inline-block',
                                }}>▼</span>
                            </div>
                        </button>
                        {/* Section Content */}
                        {isExpanded && (
                            <div style={{
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                animation: 'fadeSlideDown 0.25s ease',
                            }}>
                                {renderSectionContent(section.id)}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Animation keyframes */}
            <style>{`
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
