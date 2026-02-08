'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage({ onClose }) {
    const { signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (isLogin) {
            const { error } = await signIn(email, password);
            if (error) {
                setError(error.message || 'Login gagal. Periksa email dan password.');
            }
        } else {
            if (!fullName.trim()) {
                setError('Nama lengkap harus diisi');
                setLoading(false);
                return;
            }

            const { error } = await signUp(email, password, fullName);
            if (error) {
                setError(error.message || 'Registrasi gagal. Coba lagi.');
            } else {
                setSuccess('Registrasi berhasil! Cek email untuk verifikasi.');
            }
        }

        setLoading(false);
    };

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                <div className="modal-handle"></div>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌙</div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '4px' }}>
                        {isLogin ? 'Selamat Datang Kembali' : 'Daftar Akun Baru'}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
                        {isLogin ? 'Masuk untuk melanjutkan ibadahmu' : 'Bergabung dengan komunitas Ramadhan'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Masukkan nama lengkap"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="contoh@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Minimal 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            marginBottom: '16px',
                            fontSize: '13px',
                            color: '#f87171',
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            marginBottom: '16px',
                            fontSize: '13px',
                            color: '#4ade80',
                        }}>
                            ✅ {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginBottom: '16px' }}
                    >
                        {loading ? (
                            <span>Memproses...</span>
                        ) : (
                            <>
                                <span>{isLogin ? '🔐' : '✨'}</span>
                                <span>{isLogin ? 'Masuk' : 'Daftar'}</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
                        {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccess('');
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--emerald-400)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginLeft: '6px',
                            }}
                        >
                            {isLogin ? 'Daftar Sekarang' : 'Masuk'}
                        </button>
                    </p>
                </div>

                {/* Skip for offline mode */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        marginTop: '20px',
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: '1px solid var(--dark-600)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--dark-400)',
                        fontSize: '13px',
                        cursor: 'pointer',
                    }}
                >
                    Lanjutkan tanpa login (Mode Offline)
                </button>
            </div>
        </div>
    );
}
