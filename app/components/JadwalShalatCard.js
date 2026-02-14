'use client';

import { useState, useEffect } from 'react';
import {
    getProvinces,
    getCities,
    getShalatSchedule,
    getCurrentPrayerInfo,
    getCountdownToTime
} from '../lib/equran';

export default function JadwalShalatCard() {
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [imsakiyah, setImsakiyah] = useState(null);
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [prayerInfo, setPrayerInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Load saved location from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ramadhan_location');
        if (saved) {
            const { province, city } = JSON.parse(saved);
            setSelectedProvince(province);
            setSelectedCity(city);
        }
        loadProvinces();
    }, []);

    // Load provinces
    const loadProvinces = async () => {
        const data = await getProvinces();
        setProvinces(data);
    };

    // Load cities when province changes
    useEffect(() => {
        if (selectedProvince) {
            loadCities();
        }
    }, [selectedProvince]);

    const loadCities = async () => {
        const data = await getCities(selectedProvince);
        setCities(data);
    };

    // Load schedule when city is selected
    useEffect(() => {
        if (selectedProvince && selectedCity) {
            loadSchedule();
            // Save to localStorage
            localStorage.setItem('ramadhan_location', JSON.stringify({
                province: selectedProvince,
                city: selectedCity
            }));
        }
    }, [selectedProvince, selectedCity]);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1; // 0-11 to 1-12
            const date = today.getDate();

            // Use monthly schedule API (more reliable for current day)
            const data = await getShalatSchedule(selectedProvince, selectedCity, month, year);

            if (data?.jadwal) {
                // Find today's schedule by date string match or index
                const todayData = data.jadwal.find(d => {
                    // Check if d.tanggal matches today's date (sometimes API returns string "1", "01", etc)
                    return parseInt(d.tanggal) === date;
                });

                if (todayData) {
                    setTodaySchedule(todayData);
                }
            }
        } catch (error) {
            console.error("Error loading schedule:", error);
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

    if (!selectedProvince || showSettings) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--dark-100)', margin: 0, fontSize: '16px' }}>
                        📍 Pilih Lokasi
                    </h3>
                    {selectedProvince && (
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            ✕ Tutup
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                        value={selectedProvince}
                        onChange={(e) => {
                            setSelectedProvince(e.target.value);
                            setSelectedCity('');
                        }}
                        style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--dark-600)',
                            background: 'var(--dark-800)',
                            color: 'var(--dark-100)',
                            fontSize: '14px',
                        }}
                    >
                        <option value="">-- Pilih Provinsi --</option>
                        {provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>

                    {selectedProvince && (
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            style={{
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--dark-600)',
                                background: 'var(--dark-800)',
                                color: 'var(--dark-100)',
                                fontSize: '14px',
                            }}
                        >
                            <option value="">-- Pilih Kota/Kabupaten --</option>
                            {cities.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕌</div>
                <div style={{ color: 'var(--dark-300)' }}>Memuat jadwal...</div>
            </div>
        );
    }

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
                        📍 {selectedCity}
                    </p>
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '8px',
                        cursor: 'pointer',
                        color: 'var(--dark-100)',
                    }}
                >
                    ⚙️
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
                                {prayer.time}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
