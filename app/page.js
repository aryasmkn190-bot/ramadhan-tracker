'use client';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import QuranPage from './components/QuranPage';
import HistoryPage from './components/HistoryPage';
import SettingsPage from './components/SettingsPage';
import LeaderboardPage from './components/LeaderboardPage';
import AdminPage from './components/AdminPage';
import AuthPage from './components/AuthPage';
import Toast from './components/Toast';

function AppContent() {
  const { currentPage, isLoading: appLoading } = useApp();
  const { user, loading: authLoading } = useAuth();

  // Show loading state
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--dark-900)',
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>🌙</div>
        <div style={{ color: 'var(--dark-300)', fontSize: '14px' }}>Memuat...</div>
      </div>
    );
  }

  // If not logged in, show auth page (required)
  if (!user) {
    return <AuthPage />;
  }

  // Show loading for app data
  if (appLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--dark-900)',
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>🌙</div>
        <div style={{ color: 'var(--dark-300)', fontSize: '14px' }}>Memuat data...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'quran':
        return <QuranPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <>
      <Header />
      {renderPage()}
      <BottomNav />
      <Toast />
    </>
  );
}

function AppWithAuth() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}
