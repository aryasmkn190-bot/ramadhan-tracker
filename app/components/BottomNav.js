'use client';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav() {
    const { currentPage, setCurrentPage } = useApp();
    const { isAdmin, user, isOnlineMode } = useAuth();

    const navItems = [
        { id: 'home', icon: '🏠', label: 'Beranda' },
        { id: 'quran', icon: '📖', label: 'Quran' },
        { id: 'leaderboard', icon: '🏆', label: 'Ranking' },
        { id: 'settings', icon: '⚙️', label: 'Pengaturan' },
    ];

    // Add admin tab if user is admin
    if (isAdmin) {
        navItems.splice(3, 0, { id: 'admin', icon: '👨‍💼', label: 'Admin' });
    }

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner" style={{
                gridTemplateColumns: `repeat(${navItems.length}, 1fr)`
            }}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ripple ${currentPage === item.id ? 'active' : ''}`}
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
