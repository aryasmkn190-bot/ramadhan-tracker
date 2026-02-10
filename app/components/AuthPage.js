'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const USER_GROUPS = ['CHP', 'MR1', 'MR2', 'MR3', 'MR4', 'SMD1', 'SMD2'];

export default function AuthPage() {
    const { signIn, signUp, configError } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [userGroup, setUserGroup] = useState('');
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
            if (!userGroup) {
                setError('Pilih grup terlebih dahulu');
                setLoading(false);
                return;
            }

            const { error } = await signUp(email, password, fullName, userGroup);
            if (error) {
                setError(error.message || 'Registrasi gagal. Coba lagi.');
            } else {
                setSuccess('Registrasi berhasil! Cek email untuk verifikasi.');
            }
        }

        setLoading(false);
    };

    // Show config error if Supabase is not configured
    if (configError) {
        return (
            <div className="auth-fullscreen">
                <div className="auth-container">
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '8px' }}>
                            Konfigurasi Error
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--dark-400)', lineHeight: 1.6 }}>
                            {configError}
                        </p>
                    </div>
                </div>
                <style jsx>{`
          .auth-fullscreen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--dark-900);
            padding: 20px;
          }
          .auth-container {
            width: 100%;
            max-width: 400px;
            background: var(--dark-800);
            border-radius: var(--radius-lg);
            padding: 32px 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          }
        `}</style>
            </div>
        );
    }

    return (
        <div className="auth-fullscreen">
            <div className="auth-container">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌙</div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--dark-100)', marginBottom: '4px' }}>
                        {isLogin ? 'Selamat Datang' : 'Daftar Akun Baru'}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
                        {isLogin ? 'Masuk untuk melanjutkan ibadahmu' : 'Bergabung dengan komunitas Ramadhan'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
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

                            <div className="form-group">
                                <label className="form-label">Grup</label>
                                <div className="group-selector">
                                    {USER_GROUPS.map(group => (
                                        <button
                                            key={group}
                                            type="button"
                                            className={`group-pill ${userGroup === group ? 'active' : ''}`}
                                            onClick={() => setUserGroup(group)}
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
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
                        <div className="alert alert-error">
                            ❌ {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
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
                                setUserGroup('');
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
            </div>

            <style jsx>{`
        .auth-fullscreen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--dark-900) 0%, #0a1628 100%);
          padding: 20px;
        }
        .auth-container {
          width: 100%;
          max-width: 400px;
          background: var(--dark-800);
          border-radius: var(--radius-lg);
          padding: 32px 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          border: 1px solid var(--dark-700);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--dark-300);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--dark-700);
          border: 2px solid var(--dark-600);
          border-radius: var(--radius-md);
          color: var(--dark-100);
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--emerald-500);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        .form-input::placeholder {
          color: var(--dark-500);
        }
        .group-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .group-pill {
          padding: 8px 16px;
          background: var(--dark-700);
          border: 2px solid var(--dark-600);
          border-radius: var(--radius-full);
          color: var(--dark-400);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .group-pill:hover {
          border-color: var(--dark-500);
          color: var(--dark-200);
        }
        .group-pill.active {
          background: rgba(16, 185, 129, 0.15);
          border-color: var(--emerald-500);
          color: var(--emerald-400);
        }
        .alert {
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        .alert-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }
        .btn {
          width: 100%;
          padding: 14px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-primary {
          background: var(--primary-gradient);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          transform: scale(1.02);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    );
}
