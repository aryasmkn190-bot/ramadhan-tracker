'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getCurrentPrayerInfo,
    getCountdownToTime
} from '../lib/equran';

// Fetch prayer times directly from coordinates using Aladhan API
// Method 20 = Kemenag Indonesia (most accurate for Indonesian users)
async function getPrayerTimesFromCoords(lat, lng) {
    try {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`;

        const res = await fetch(
            `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=20&shafpiaq=1`
        );
        const data = await res.json();

        if (data.code === 200 && data.data?.timings) {
            const t = data.data.timings;
            // Aladhan returns times like "04:37 (WIB)" or "04:37", strip timezone text
            const clean = (s) => s ? s.replace(/\s*\(.*\)/, '').substring(0, 5) : '';
            return {
                imsak: clean(t.Imsak),
                subuh: clean(t.Fajr),
                terbit: clean(t.Sunrise),
                dhuha: clean(t.Sunrise), // approximate, sunrise + few minutes
                dzuhur: clean(t.Dhuhr),
                ashar: clean(t.Asr),
                maghrib: clean(t.Maghrib),
                isya: clean(t.Isha),
            };
        }
        return null;
    } catch (error) {
        console.error('Aladhan API error:', error);
        return null;
    }
}

// Reverse geocode coordinates to get city/area name for display
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id&zoom=10`,
            { headers: { 'User-Agent': 'RamadhanTracker/1.0' } }
        );
        const geo = await res.json();
        const address = geo.address || {};

        const city = address.city || address.town || address.municipality
            || address.county || address.village || address.suburb || '';
        const state = address.state || '';

        return {
            city,
            state,
            displayName: city ? `${city}, ${state}` : state || 'Lokasi Terdeteksi',
        };
    } catch (error) {
        console.error('Reverse geocode error:', error);
        return { city: '', state: '', displayName: 'Lokasi Terdeteksi' };
    }
}

export default function JadwalShalatCard() {
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [prayerInfo, setPrayerInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [locationName, setLocationName] = useState('');
    const [locationStatus, setLocationStatus] = useState('init'); // 'init', 'detecting', 'success', 'denied', 'error'
    const [coords, setCoords] = useState(null);

    // Initialize: check saved data or auto-detect
    useEffect(() => {
        const saved = localStorage.getItem('ramadhan_shalat_v2');
        if (saved) {
            try {
                const { schedule, name, lat, lng, savedDate } = JSON.parse(saved);
                const today = new Date().toDateString();

                // Use cached schedule only if it's from today
                if (savedDate === today && schedule) {
                    setTodaySchedule(schedule);
                    setLocationName(name || 'Lokasi Tersimpan');
                    setCoords({ lat, lng });
                    setLocationStatus('success');
                    setLoading(false);
                    return;
                }

                // Schedule is stale (from yesterday), re-fetch with saved coords
                if (lat && lng) {
                    setLocationName(name || '');
                    setCoords({ lat, lng });
                    fetchScheduleFromCoords(lat, lng, name);
                    return;
                }
            } catch (e) {
                // Corrupted data, re-detect
            }
        }

        // No saved data — auto-detect
        detectLocation();
    }, []);

    // Detect location using browser Geolocation API
    const detectLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLoading(false);
            return;
        }

        setLocationStatus('detecting');
        setLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lng: longitude });

                // Get display name + prayer times in parallel
                const [geoResult, schedule] = await Promise.all([
                    reverseGeocode(latitude, longitude),
                    getPrayerTimesFromCoords(latitude, longitude),
                ]);

                const displayName = geoResult.displayName;
                setLocationName(displayName);

                if (schedule) {
                    setTodaySchedule(schedule);
                    setLocationStatus('success');

                    // Cache for today
                    localStorage.setItem('ramadhan_shalat_v2', JSON.stringify({
                        schedule,
                        name: displayName,
                        lat: latitude,
                        lng: longitude,
                        savedDate: new Date().toDateString(),
                    }));
                } else {
                    setLocationStatus('error');
                }
                setLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationStatus(error.code === 1 ? 'denied' : 'error');
                setLoading(false);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    // Fetch schedule from saved coordinates (for stale cache refresh)
    const fetchScheduleFromCoords = async (lat, lng, name) => {
        setLoading(true);
        setLocationStatus('detecting');

        const schedule = await getPrayerTimesFromCoords(lat, lng);
        if (schedule) {
            setTodaySchedule(schedule);
            setLocationStatus('success');

            localStorage.setItem('ramadhan_shalat_v2', JSON.stringify({
                schedule,
                name: name || locationName,
                lat, lng,
                savedDate: new Date().toDateString(),
            }));
        } else {
            setLocationStatus('error');
        }
        setLoading(false);
    };

    // Update countdown every second
    useEffect(() => {
        if (!todaySchedule) return;

        const info = getCurrentPrayerInfo(todaySchedule);
        setPrayerInfo(info);

        const timer = setInterval(() => {
            const info = getCurrentPrayerInfo(todaySchedule);
            setPrayerInfo(info);

            if (info?.next) {
                const cd = getCountdownToTime(info.next.time);
                setCountdown(cd);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [todaySchedule]);

    // ========== RENDER ==========

    // Detecting state
    if (locationStatus === 'detecting' || (loading && locationStatus === 'init')) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
                <div style={{ color: 'var(--dark-200)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Mendeteksi Lokasi...
                </div>
                <div style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
                    Mengizinkan akses lokasi untuk jadwal sholat akurat
                </div>
                <div style={{
                    marginTop: '12px', width: '60px', height: '4px',
                    borderRadius: '4px', background: 'var(--dark-700)',
                    overflow: 'hidden', margin: '12px auto 0',
                }}>
                    <div style={{
                        width: '40%', height: '100%',
                        background: 'var(--success)', borderRadius: '4px',
                        animation: 'slideRight 1.2s ease-in-out infinite',
                    }} />
                </div>
                <style>{`
                    @keyframes slideRight {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(150%); }
                        100% { transform: translateX(-100%); }
                    }
                `}</style>
            </div>
        );
    }

    // Location denied or error — show retry option
    if (locationStatus === 'denied' || (locationStatus === 'error' && !todaySchedule)) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕌</div>
                    <div style={{ color: 'var(--dark-200)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        Jadwal Shalat
                    </div>
                    <div style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
                        {locationStatus === 'denied'
                            ? 'Akses lokasi ditolak. Izinkan lokasi di pengaturan browser untuk melihat jadwal sholat.'
                            : 'Gagal mendeteksi lokasi. Pastikan koneksi internet aktif.'}
                    </div>
                </div>
                <button
                    onClick={detectLocation}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    📍 Coba Deteksi Ulang
                </button>
            </div>
        );
    }

    // Schedule loaded successfully
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ color: 'var(--dark-100)', margin: 0, fontSize: '16px' }}>
                        🕌 Jadwal Shalat Hari Ini
                    </h3>
                    <p style={{ color: 'var(--dark-400)', margin: '4px 0 0', fontSize: '12px' }}>
                        📍 {locationName || 'Lokasi Terdeteksi'}
                    </p>
                </div>
                <button
                    onClick={() => {
                        // Re-detect location
                        localStorage.removeItem('ramadhan_shalat_v2');
                        setTodaySchedule(null);
                        detectLocation();
                    }}
                    title="Refresh lokasi"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '8px',
                        cursor: 'pointer',
                        color: 'var(--dark-100)',
                        fontSize: '14px',
                    }}
                >
                    🔄
                </button>
            </div>

            {/* Countdown to next prayer */}
            {countdown && prayerInfo?.next && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'center',
                    marginBottom: '16px',
                }}>
                    <div style={{ color: 'var(--dark-300)', fontSize: '12px', marginBottom: '4px' }}>
                        {prayerInfo.next.icon} Menuju {prayerInfo.next.name}
                    </div>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: 'var(--success)',
                        fontFamily: 'monospace',
                    }}>
                        {countdown.formatted}
                    </div>
                    <div style={{ color: 'var(--dark-400)', fontSize: '12px', marginTop: '4px' }}>
                        Pukul {prayerInfo.next.time}
                    </div>
                </div>
            )}

            {/* Prayer times grid */}
            {todaySchedule && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                }}>
                    {[
                        { name: 'Imsak', time: todaySchedule.imsak, icon: '🌙' },
                        { name: 'Subuh', time: todaySchedule.subuh, icon: '🌅' },
                        { name: 'Dzuhur', time: todaySchedule.dzuhur, icon: '☀️' },
                        { name: 'Ashar', time: todaySchedule.ashar, icon: '🌤️' },
                        { name: 'Maghrib', time: todaySchedule.maghrib, icon: '🌇', highlight: true },
                        { name: 'Isya', time: todaySchedule.isya, icon: '🌙' },
                    ].map(prayer => (
                        <div
                            key={prayer.name}
                            style={{
                                background: prayer.highlight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0,0,0,0.03)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px 8px',
                                textAlign: 'center',
                                border: prayer.highlight ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                            }}
                        >
                            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{prayer.icon}</div>
                            <div style={{ color: 'var(--dark-400)', fontSize: '10px' }}>{prayer.name}</div>
                            <div style={{
                                color: prayer.highlight ? 'var(--gold-500)' : 'var(--dark-100)',
                                fontSize: '13px',
                                fontWeight: '600',
                                fontFamily: 'monospace',
                            }}>
                                {prayer.time || '--:--'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
