'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { USER_GROUPS } from '../data/userGroups';

export default function Header() {
    const { currentRamadanDay, addToast } = useApp();
    const { user, profile, signOut, updateProfile, updatePassword } = useAuth();

    // Digital clock state (WIB = UTC+7)
    const [clock, setClock] = useState('');
    const [seconds, setSeconds] = useState('');

    // Profile dropdown
    const [showDropdown, setShowDropdown] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [saving, setSaving] = useState(false);
    const dropdownRef = useRef(null);

    // Password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);



    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const h = String(wibTime.getHours()).padStart(2, '0');
            const m = String(wibTime.getMinutes()).padStart(2, '0');
            const s = String(wibTime.getSeconds()).padStart(2, '0');
            setClock(`${h}:${m}`);
            setSeconds(s);
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('id-ID', options);

    const isRamadanStarted = currentRamadanDay >= 1;
    let headerSubtitle = '';
    let dayBadge = '';

    if (isRamadanStarted) {
        headerSubtitle = `${currentRamadanDay} Ramadhan 1447 H`;
        dayBadge = `Hari ke-${currentRamadanDay}`;
    } else {
        // Countdown to Ramadan — Maghrib on Feb 17 = Ramadan starts
        const ramadanStart = new Date('2026-02-18T00:00:00');
        const todayReset = new Date(today);
        todayReset.setHours(0, 0, 0, 0);
        const diffTime = ramadanStart - todayReset;
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // After Maghrib, countdown reduces by 1 (closer to Ramadan)
        if (today.getHours() >= 18) diffDays -= 1;
        if (diffDays > 0) {
            headerSubtitle = `${diffDays} hari menuju Ramadhan`;
            dayBadge = `H-${diffDays}`;
        } else {
            headerSubtitle = formattedDate;
            dayBadge = 'Siap Ramadhan';
        }
    }

    const handleAvatarClick = () => {
        if (user) {
            setShowDropdown(prev => !prev);
        }
    };

    const handleEditProfile = () => {
        setEditName(profile?.full_name || '');
        setEditGroup(profile?.user_group || '');
        setShowDropdown(false);
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            addToast('❌ Nama tidak boleh kosong', 'error');
            return;
        }
        setSaving(true);
        const { error } = await updateProfile({
            full_name: editName.trim(),
            user_group: editGroup.trim(),
        });
        setSaving(false);
        if (error) {
            addToast('❌ Gagal memperbarui profil', 'error');
        } else {
            addToast('✅ Profil berhasil diperbarui!', 'success');
            setShowEditModal(false);
        }
    };

    const handleLogout = async () => {
        setShowDropdown(false);
        await signOut();
        addToast('👋 Berhasil logout', 'info');
    };

    const handleOpenPasswordModal = () => {
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPwd(false);
        setShowConfirmPwd(false);
        setShowDropdown(false);
        setShowPasswordModal(true);
    };

    const handleChangePassword = async () => {
        if (!newPassword.trim()) {
            addToast('❌ Password baru tidak boleh kosong', 'error');
            return;
        }
        if (newPassword.length < 6) {
            addToast('❌ Password minimal 6 karakter', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            addToast('❌ Password baru dan konfirmasi tidak cocok', 'error');
            return;
        }

        setSavingPassword(true);
        const { error } = await updatePassword(newPassword);
        setSavingPassword(false);

        if (error) {
            addToast(`❌ Gagal mengubah password: ${error.message}`, 'error');
        } else {
            addToast('✅ Password berhasil diubah!', 'success');
            setShowPasswordModal(false);
        }
    };

    return (
        <>
            <header className="header">
                <div className="header-content">
                    {/* Left: Icon + Title */}
                    <div className="header-title">
                        <span className="header-icon">🌙</span>
                        <div>
                            <h1>Ramadhan Tracker</h1>
                            <p className="header-date">{formattedDate}</p>
                        </div>
                    </div>

                    {/* Right: Clock + Avatar + Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {/* Digital Clock WIB */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                fontFamily: "'Outfit', monospace",
                                fontSize: '18px',
                                fontWeight: '700',
                                color: 'white',
                                letterSpacing: '1px',
                                lineHeight: '1.1',
                                textShadow: '0 0 12px rgba(255,255,255,0.25)',
                            }}>
                                {clock}<span style={{
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    opacity: 0.7,
                                    marginLeft: '2px',
                                }}>{seconds}</span>
                            </div>
                            <span style={{
                                fontSize: '8px',
                                fontWeight: '600',
                                color: 'rgba(255,255,255,0.55)',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                marginTop: '1px',
                            }}>WIB</span>
                        </div>

                        {/* Separator */}
                        <div style={{
                            width: '1px',
                            height: '28px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '1px',
                        }} />

                        {/* Avatar with dropdown */}
                        {user && (
                            <div ref={dropdownRef} style={{ position: 'relative' }}>
                                <div
                                    onClick={handleAvatarClick}
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: 'var(--radius-full)',
                                        background: profile?.role === 'admin' ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        color: 'white',
                                        border: showDropdown ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.25)',
                                        flexShrink: 0,
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s ease, transform 0.15s ease',
                                        transform: showDropdown ? 'scale(1.08)' : 'scale(1)',
                                    }}
                                >
                                    {profile?.full_name?.charAt(0).toUpperCase() || '👤'}
                                </div>

                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        minWidth: '200px',
                                        background: 'var(--dark-700)',
                                        border: '1px solid var(--dark-600)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                        zIndex: 999,
                                        overflow: 'hidden',
                                        animation: 'dropdownSlide 0.2s ease',
                                    }}>
                                        {/* User info */}
                                        <div style={{
                                            padding: '14px 16px',
                                            borderBottom: '1px solid var(--dark-600)',
                                        }}>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: 'var(--dark-100)',
                                                marginBottom: '2px',
                                            }}>
                                                {profile?.full_name || 'Pengguna'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'var(--dark-400)',
                                            }}>
                                                {profile?.email}
                                            </div>
                                            {profile?.user_group && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: 'var(--emerald-400)',
                                                    marginTop: '3px',
                                                }}>
                                                    👥 {profile.user_group}
                                                </div>
                                            )}
                                        </div>

                                        {/* Menu items */}
                                        <div style={{ padding: '6px' }}>
                                            <button
                                                onClick={handleEditProfile}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--dark-200)',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-sm)',
                                                    transition: 'background 0.15s ease',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                <span style={{ fontSize: '16px' }}>✏️</span>
                                                Edit Profil
                                            </button>

                                            <div style={{
                                                height: '1px',
                                                background: 'var(--dark-600)',
                                                margin: '4px 8px',
                                            }} />

                                            <button
                                                onClick={handleOpenPasswordModal}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--dark-200)',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-sm)',
                                                    transition: 'background 0.15s ease',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                <span style={{ fontSize: '16px' }}>🔒</span>
                                                Ubah Password
                                            </button>

                                            <div style={{
                                                height: '1px',
                                                background: 'var(--dark-600)',
                                                margin: '4px 8px',
                                            }} />

                                            <button
                                                onClick={handleLogout}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#f87171',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-sm)',
                                                    transition: 'background 0.15s ease',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.08)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                <span style={{ fontSize: '16px' }}>🚪</span>
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="stats-day-badge">
                            {dayBadge}
                        </div>
                    </div>
                </div>

                {/* Subtitle row */}
                <div style={{
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingLeft: '42px',
                }}>
                    <span style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.7)',
                        fontWeight: '500',
                    }}>{headerSubtitle}</span>
                </div>


            </header>

            {/* Edit Profile Modal */}
            <div
                className={`modal-overlay ${showEditModal ? 'active' : ''}`}
                onClick={() => setShowEditModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ padding: '10px 0 20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: profile?.role === 'admin' ? 'var(--gold-gradient)' : 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px',
                                margin: '0 auto 12px',
                                boxShadow: profile?.role === 'admin' ? 'var(--shadow-gold)' : 'var(--shadow-glow)',
                            }}>
                                {profile?.full_name?.charAt(0).toUpperCase() || '👤'}
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

                        {/* Form Fields */}
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

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowEditModal(false)}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveProfile}
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    opacity: saving ? 0.7 : 1,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            <div
                className={`modal-overlay ${showPasswordModal ? 'active' : ''}`}
                onClick={() => !savingPassword && setShowPasswordModal(false)}
            >
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>
                    <div style={{ padding: '10px 0 20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: 'var(--dark-100)',
                            }}>
                                Ubah Password
                            </h2>
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--dark-400)',
                                marginTop: '4px',
                            }}>
                                Masukkan password baru untuk akun Anda
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
                                    Password Baru
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPwd ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        style={{
                                            width: '100%',
                                            padding: '12px 44px 12px 14px',
                                            background: 'var(--dark-700)',
                                            border: '1px solid var(--dark-600)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--dark-100)',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--emerald-500)'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--dark-600)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPwd(!showNewPwd)}
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
                                        {showNewPwd ? '🙈' : '👁️'}
                                    </button>
                                </div>
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
                                    Konfirmasi Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPwd ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Ulangi password baru"
                                        style={{
                                            width: '100%',
                                            padding: '12px 44px 12px 14px',
                                            background: 'var(--dark-700)',
                                            border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? '#ef4444' : 'var(--dark-600)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--dark-100)',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword ? '#ef4444' : 'var(--emerald-500)'}
                                        onBlur={(e) => e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword ? '#ef4444' : 'var(--dark-600)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
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
                                        {showConfirmPwd ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                                        ❌ Password tidak cocok
                                    </div>
                                )}
                                {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
                                    <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
                                        ✅ Password cocok
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPasswordModal(false)}
                                disabled={savingPassword}
                                style={{ flex: 1 }}
                            >
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleChangePassword}
                                disabled={savingPassword || !newPassword.trim() || newPassword !== confirmPassword}
                                style={{
                                    flex: 1,
                                    opacity: (savingPassword || !newPassword.trim() || newPassword !== confirmPassword) ? 0.6 : 1,
                                    cursor: (savingPassword || !newPassword.trim() || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingPassword ? 'Menyimpan...' : '🔒 Ubah Password'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
