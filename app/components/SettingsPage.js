'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export default function SettingsPage() {
    const {
        notifications,
        setNotifications,
        requestNotificationPermission,
        resetToday,
        addToast,
    } = useApp();

    const { user, profile, signOut, isAdmin } = useAuth();

    const [showResetModal, setShowResetModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
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
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isAdmin ? 'var(--gold-gradient)' : 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    margin: '0 auto 16px',
                    boxShadow: isAdmin ? 'var(--shadow-gold)' : 'var(--shadow-glow)',
                }}>
                    {user ? (profile?.full_name?.charAt(0).toUpperCase() || '👤') : '🌙'}
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

                {/* Connection Status */}
                <div style={{
                    marginTop: '16px',
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
        </main>
    );
}
