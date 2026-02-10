'use client';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav() {
    const { currentPage, setCurrentPage } = useApp();
    const { isAdmin } = useAuth();

    // Admin has a completely different navigation
    const navItems = isAdmin ? [
        { id: 'admin_dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'admin_members', icon: '👥', label: 'Anggota' },
        { id: 'admin_activities', icon: '📋', label: 'Aktivitas' },
        { id: 'admin_announcements', icon: '📢', label: 'Pengumuman' },
        { id: 'settings', icon: '⚙️', label: 'Pengaturan' },
    ] : [
        { id: 'home', icon: '🏠', label: 'Beranda' },
        { id: 'quran', icon: '📖', label: 'Quran' },
        { id: 'rekap', icon: '📊', label: 'Rekap' },
        { id: 'settings', icon: '⚙️', label: 'Pengaturan' },
    ];

    // For admin, if currentPage doesn't match any admin nav, treat 'admin_dashboard' as active
    const activeId = isAdmin
        ? (navItems.some(n => n.id === currentPage) ? currentPage : 'admin_dashboard')
        : currentPage;

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner" style={{
                gridTemplateColumns: `repeat(${navItems.length}, 1fr)`
            }}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ripple ${activeId === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentPage(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}
