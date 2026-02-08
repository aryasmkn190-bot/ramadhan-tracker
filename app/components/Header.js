'use client';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
    const { currentRamadanDay, announcements } = useApp();
    const { user, profile, isOnlineMode } = useAuth();

    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('id-ID', options);

    const hijriMonth = 'Ramadhan';
    const hijriYear = '1447 H';

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-title">
                    <span className="header-icon">🌙</span>
                    <div>
                        <h1>Ramadhan Tracker</h1>
                        <p className="header-date">{formattedDate} • {currentRamadanDay} {hijriMonth} {hijriYear}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isOnlineMode && user && (
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-full)',
                            background: profile?.role === 'admin' ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'white',
                            border: '2px solid rgba(255,255,255,0.3)',
                        }}>
                            {profile?.full_name?.charAt(0).toUpperCase() || '👤'}
                        </div>
                    )}
                    <div className="stats-day-badge">
                        Hari ke-{currentRamadanDay}
                    </div>
                </div>
            </div>

            {/* Announcement Banner */}
            {announcements && announcements.length > 0 && (
                <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                    }}>
                        <span>📢</span>
                        <span style={{ color: 'var(--gold-400)', fontWeight: '600' }}>
                            {announcements[0].title}
                        </span>
                    </div>
                    <p style={{
                        fontSize: '11px',
                        color: 'var(--dark-200)',
                        marginTop: '4px',
                        lineHeight: '1.5',
                    }}>
                        {announcements[0].content.length > 80
                            ? announcements[0].content.substring(0, 80) + '...'
                            : announcements[0].content
                        }
                    </p>
                </div>
            )}
        </header>
    );
}
