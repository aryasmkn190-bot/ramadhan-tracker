'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

// Auto mode: 6 AM - 6 PM = light, otherwise dark
const getAutoTheme = () => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
};

export function ThemeProvider({ children }) {
    const [themeMode, setThemeModeState] = useState('dark'); // 'dark', 'light', 'auto'
    const [resolvedTheme, setResolvedTheme] = useState('dark'); // actual applied theme

    // Load saved preference on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ramadhan_theme_mode');
            if (saved && ['dark', 'light', 'auto'].includes(saved)) {
                setThemeModeState(saved);
            }
        }
    }, []);

    // Resolve the actual theme based on mode
    useEffect(() => {
        if (themeMode === 'auto') {
            setResolvedTheme(getAutoTheme());

            // Check every minute for auto mode
            const interval = setInterval(() => {
                setResolvedTheme(getAutoTheme());
            }, 60000);

            return () => clearInterval(interval);
        } else {
            setResolvedTheme(themeMode);
        }
    }, [themeMode]);

    // Apply theme class to document
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            html.setAttribute('data-theme', resolvedTheme);

            // Also update meta theme-color for mobile browsers
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', resolvedTheme === 'light' ? '#f0fdf4' : '#10b981');
            }
        }
    }, [resolvedTheme]);

    const setThemeMode = useCallback((mode) => {
        setThemeModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('ramadhan_theme_mode', mode);
        }
    }, []);

    const value = {
        themeMode,      // user's preference: 'dark', 'light', 'auto'
        resolvedTheme,  // actual applied theme: 'dark' or 'light'
        setThemeMode,
        isDark: resolvedTheme === 'dark',
        isLight: resolvedTheme === 'light',
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
