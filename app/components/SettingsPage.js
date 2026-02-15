'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { USER_GROUPS } from '../data/userGroups';

export default function SettingsPage() {
    const {
        notifications,
        setNotifications,
        requestNotificationPermission,
        resetToday,
        addToast,
    } = useApp();

    const { user, profile, signOut, isAdmin, updateProfile } = useAuth();
    const { themeMode, setThemeMode, resolvedTheme } = useTheme();

    const [showResetModal, setShowResetModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [isPWAInstalled, setIsPWAInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsPWAInstalled(true);
        }

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleNotificationToggle = async () => {
        if (!notifications) {
            const granted = await requestNotificationPermission();
            if (!granted) {
                addToast('❌ Izin notifikasi ditolak', 'error');
            }
        } else {
            setNotifications(false);
            addToast('🔕 Notifikasi dinonaktifkan', 'info');
        }
    };

    const handleInstallPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsPWAInstalled(true);
                addToast('✅ Aplikasi berhasil diinstall!', 'success');
            }
            setDeferredPrompt(null);
        }
    };

    const handleReset = () => {
        resetToday();
        setShowResetModal(false);
    };

    const handleLogout = async () => {
        await signOut();
        setShowLogoutModal(false);
        addToast('👋 Berhasil logout', 'info');
    };

    const handleOpenEditProfile = () => {
        setEditName(profile?.full_name || '');
        setEditGroup(profile?.user_group || '');
        setShowEditProfileModal(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            addToast('❌ Nama tidak boleh kosong', 'error');
            return;
        }
        setSavingProfile(true);
        const { error } = await updateProfile({
            full_name: editName.trim(),
            user_group: editGroup.trim(),
        });
        setSavingProfile(false);
        if (error) {
            addToast('❌ Gagal memperbarui profil', 'error');
        } else {
            addToast('✅ Profil berhasil diperbarui!', 'success');
            setShowEditProfileModal(false);
        }
    };

    const handleExportData = () => {
        const data = {
            activities: localStorage.getItem('ramadhan_activities'),
            quran: localStorage.getItem('ramadhan_quran'),
            exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ramadhan-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('💾 Data berhasil diekspor!', 'success');
    };

    const settingsItems = [
        {
            icon: '✏️',
            label: 'Edit Profil',
            desc: 'Ubah nama & grup pengguna',
            action: 'chevron',
            onClick: handleOpenEditProfile
        },
        {
            icon: '🔔',
            label: 'Notifikasi',
            desc: 'Pengingat waktu sholat & ibadah',
            action: 'toggle',
            value: notifications,
            onClick: handleNotificationToggle
        },
        {
            icon: '📲',
            label: 'Install Aplikasi',
            desc: isPWAInstalled ? 'Sudah terinstall' : 'Pasang di homescreen',
            action: 'button',
            disabled: isPWAInstalled || !deferredPrompt,
            onClick: handleInstallPWA
        },
        {
            icon: '💾',
            label: 'Ekspor Data',
            desc: 'Backup data aktivitas',
            action: 'chevron',
            onClick: handleExportData
        },
        {
            icon: '🔄',
            label: 'Reset Hari Ini',
            desc: 'Hapus semua centang hari ini',
            action: 'chevron',
            onClick: () => setShowResetModal(true)
        },
    ];

    // Add logout option (always shown since user is always logged in)
    settingsItems.push({
        icon: '🚪',
        label: 'Logout',
        desc: 'Keluar dari akun',
        action: 'chevron',
        onClick: () => setShowLogoutModal(true),
        danger: true,
    });

    return (
        <main className="main-content">
            {/* Profile Card */}
            <div className="stats-card" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 16px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: isAdmin ? 'var(--gold-gradient)' : 'var(--primary-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        boxShadow: isAdmin ? 'var(--shadow-gold)' : 'var(--shadow-glow)',
                    }}>
                        {user ? (profile?.full_name?.charAt(0).toUpperCase() || '👤') : '🌙'}
                    </div>
                    {user && (
                        <button
                            onClick={handleOpenEditProfile}
                            style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'var(--dark-700)',
                                border: '2px solid var(--dark-800)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Edit Profil"
                        >
                            ✏️
                        </button>
                    )}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '4px' }}>
                    {user ? profile?.full_name : 'Ramadhan Tracker'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
                    {user ? (
                        <>
                            {profile?.email}
                            {isAdmin && (
                                <span style={{
                                    display: 'inline-block',
                                    marginLeft: '8px',
                                    fontSize: '10px',
                                    background: 'var(--gold-gradient)',
                                    color: 'var(--dark-900)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: '700',
                                }}>
                                    ADMIN
                                </span>
                            )}
                        </>
                    ) : (
                        'Versi 1.0.0 • PWA Enabled'
                    )}
                </p>
                {user && profile?.user_group && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--emerald-400)',
                    }}>
                        👥 {profile.user_group}
                    </div>
                )}

                {/* Connection Status */}
                <div style={{
                    marginTop: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    color: 'var(--success)',
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                    }}></span>
                    Tersinkron Online
                </div>
            </div>

            {/* Theme Selector */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>🎨</span>
                        Tema Tampilan
                    </h2>
                </div>

                <div style={{
                    background: 'var(--dark-700)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    border: '1px solid var(--dark-600)',
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        background: 'var(--dark-800)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px',
                    }}>
                        {[
                            { mode: 'dark', icon: '🌙', label: 'Gelap' },
                            { mode: 'light', icon: '☀️', label: 'Terang' },
                            { mode: 'auto', icon: '🔄', label: 'Otomatis' },
                        ].map(option => (
                            <button
                                key={option.mode}
                                onClick={() => setThemeMode(option.mode)}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: themeMode === option.mode
                                        ? 'var(--emerald-600)'
                                        : 'transparent',
                                    color: themeMode === option.mode
                                        ? 'white'
                                        : 'var(--dark-400)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'var(--transition-fast)',
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{option.icon}</span>
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {themeMode === 'auto' && (
                        <div style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--dark-800)',
                            fontSize: '11px',
                            color: 'var(--dark-400)',
                            textAlign: 'center',
                        }}>
                            {resolvedTheme === 'dark' ? '🌙' : '☀️'}{' '}
                            Saat ini: <strong style={{ color: 'var(--dark-200)' }}>
                                {resolvedTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                            </strong>
                            {' • '}Berganti otomatis jam 06:00 & 18:00
                        </div>
                    )}
                </div>
            </section>

            {/* Settings List */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>⚙️</span>
                        Pengaturan
                    </h2>
                </div>

                <div className="settings-list">
                    {settingsItems.map((item, index) => (
                        <div
                            key={index}
                            className="settings-item"
                            onClick={item.disabled ? undefined : item.onClick}
                            style={{
                                opacity: item.disabled ? 0.5 : 1,
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                borderColor: item.danger ? 'rgba(239, 68, 68, 0.2)' : undefined,
                            }}
                        >
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{
                                    background: item.danger ? 'rgba(239, 68, 68, 0.15)' : undefined,
                                }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="settings-label" style={{
                                        color: item.danger ? '#f87171' : undefined,
                                    }}>
                                        {item.label}
                                    </div>
                                    <div className="settings-desc">{item.desc}</div>
                                </div>
                            </div>

                            {item.action === 'toggle' && (
                                <div className={`toggle ${item.value ? 'active' : ''}`}></div>
                            )}

                            {item.action === 'chevron' && (
                                <span style={{ color: 'var(--dark-400)', fontSize: '20px' }}>›</span>
                            )}

                            {item.action === 'button' && !item.disabled && (
                                <span style={{ color: 'var(--emerald-400)', fontSize: '12px', fontWeight: '600' }}>
                                    INSTALL
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* About Section */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span>ℹ️</span>
                        Tentang
                    </h2>
                </div>

                <div style={{
                    background: 'var(--dark-700)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <p style={{ fontSize: '14px', color: 'var(--dark-300)', lineHeight: '1.7' }}>
                        Ramadhan Tracker adalah aplikasi untuk membantu umat Muslim mencatat dan memantau
                        aktivitas ibadah harian selama bulan Ramadhan. Dilengkapi fitur komunitas, leaderboard,
                        dan statistik bersama.
                    </p>
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--dark-600)',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px' }}>📚</div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '4px' }}>PWA Ready</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px' }}>☁️</div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '4px' }}>Cloud Sync</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px' }}>🏆</div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '4px' }}>Leaderboard</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px' }}>👥</div>
                            <div style={{ fontSize: '11px', color: 'var(--dark-400)', marginTop: '4px' }}>Komunitas</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reset Modal */}
            <div className={`modal-overlay ${showResetModal ? 'active' : ''}`} onClick={() => setShowResetModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '8px' }}>
                            Reset Aktivitas Hari Ini?
                        </h2>
                        <p style={{ color: 'var(--dark-400)', fontSize: '14px', marginBottom: '24px' }}>
                            Semua centang aktivitas hari ini akan dihapus.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowResetModal(false)}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleReset}
                                style={{ flex: 1, background: 'var(--danger)' }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Modal */}
            <div className={`modal-overlay ${showLogoutModal ? 'active' : ''}`} onClick={() => setShowLogoutModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '8px' }}>
                            Logout dari akun?
                        </h2>
                        <p style={{ color: 'var(--dark-400)', fontSize: '14px', marginBottom: '24px' }}>
                            Data lokal akan tetap tersimpan di perangkat ini.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowLogoutModal(false)}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleLogout}
                                style={{ flex: 1, background: 'var(--danger)' }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <div
                className={`modal-overlay ${showEditProfileModal ? 'active' : ''}`}
                onClick={() => setShowEditProfileModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ padding: '10px 0 20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: isAdmin ? 'var(--gold-gradient)' : 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px',
                                margin: '0 auto 12px',
                                boxShadow: isAdmin ? 'var(--shadow-gold)' : 'var(--shadow-glow)',
                            }}>
                                {editName?.charAt(0)?.toUpperCase() || profile?.full_name?.charAt(0).toUpperCase() || '👤'}
                            </div>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: 'var(--dark-100)',
                            }}>
                                Edit Profil
                            </h2>
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--dark-400)',
                                marginTop: '4px',
                            }}>
                                {profile?.email}
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'var(--dark-300)',
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Masukkan nama lengkap"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--dark-100)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald-500)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--dark-600)'}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'var(--dark-300)',
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Grup / Komunitas
                                </label>
                                <select
                                    value={editGroup}
                                    onChange={(e) => setEditGroup(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--dark-100)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px top 50%',
                                        backgroundSize: '12px auto',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald-500)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--dark-600)'}
                                >
                                    <option value="">Pilih Grup / Komunitas</option>
                                    {USER_GROUPS.map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowEditProfileModal(false)}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveProfile}
                                disabled={savingProfile}
                                style={{
                                    flex: 1,
                                    opacity: savingProfile ? 0.7 : 1,
                                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingProfile ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
