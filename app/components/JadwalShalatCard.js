'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getProvinces,
    getCities,
    getShalatSchedule,
    getCurrentPrayerInfo,
    getCountdownToTime
} from '../lib/equran';

// Mapping from common geocode province names to equran.id province names
const PROVINCE_ALIASES = {
    'dki jakarta': 'DKI Jakarta',
    'jakarta': 'DKI Jakarta',
    'di yogyakarta': 'DI Yogyakarta',
    'yogyakarta': 'DI Yogyakarta',
    'daerah istimewa yogyakarta': 'DI Yogyakarta',
    'jawa barat': 'Jawa Barat',
    'jawa tengah': 'Jawa Tengah',
    'jawa timur': 'Jawa Timur',
    'banten': 'Banten',
    'sumatera utara': 'Sumatera Utara',
    'sumatera barat': 'Sumatera Barat',
    'sumatera selatan': 'Sumatera Selatan',
    'riau': 'Riau',
    'kepulauan riau': 'Kepulauan Riau',
    'jambi': 'Jambi',
    'bengkulu': 'Bengkulu',
    'lampung': 'Lampung',
    'bangka belitung': 'Bangka Belitung',
    'kepulauan bangka belitung': 'Bangka Belitung',
    'kalimantan barat': 'Kalimantan Barat',
    'kalimantan tengah': 'Kalimantan Tengah',
    'kalimantan selatan': 'Kalimantan Selatan',
    'kalimantan timur': 'Kalimantan Timur',
    'kalimantan utara': 'Kalimantan Utara',
    'sulawesi utara': 'Sulawesi Utara',
    'sulawesi tengah': 'Sulawesi Tengah',
    'sulawesi selatan': 'Sulawesi Selatan',
    'sulawesi tenggara': 'Sulawesi Tenggara',
    'sulawesi barat': 'Sulawesi Barat',
    'gorontalo': 'Gorontalo',
    'bali': 'Bali',
    'nusa tenggara barat': 'Nusa Tenggara Barat',
    'nusa tenggara timur': 'Nusa Tenggara Timur',
    'maluku': 'Maluku',
    'maluku utara': 'Maluku Utara',
    'papua': 'Papua',
    'papua barat': 'Papua Barat',
    'aceh': 'Aceh',
    'nanggroe aceh darussalam': 'Aceh',
};

// Fuzzy match a city name against the equran.id city list
function findBestCityMatch(detectedCity, cityList) {
    if (!detectedCity || !cityList || cityList.length === 0) return null;

    const normalized = detectedCity.toLowerCase()
        .replace(/^(kota|kabupaten|kab\.?)\s+/i, '')
        .trim();

    // Exact match
    for (const c of cityList) {
        if (c.toLowerCase() === detectedCity.toLowerCase()) return c;
    }

    // Partial match — detected city name contained in equran city name
    for (const c of cityList) {
        const cLower = c.toLowerCase().replace(/^(kota|kabupaten|kab\.?)\s+/i, '').trim();
        if (cLower.includes(normalized) || normalized.includes(cLower)) return c;
    }

    // Word overlap match
    const detectedWords = normalized.split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;
    for (const c of cityList) {
        const cWords = c.toLowerCase().replace(/^(kota|kabupaten|kab\.?)\s+/i, '').trim().split(/\s+/);
        const overlap = detectedWords.filter(w => cWords.some(cw => cw.includes(w) || w.includes(cw))).length;
        if (overlap > bestScore) {
            bestScore = overlap;
            bestMatch = c;
        }
    }

    return bestScore > 0 ? bestMatch : null;
}

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
    const [locationStatus, setLocationStatus] = useState(''); // '', 'detecting', 'success', 'error'
    const [detectedLocationName, setDetectedLocationName] = useState('');

    // Detect location automatically on first load
    useEffect(() => {
        const saved = localStorage.getItem('ramadhan_location');
        if (saved) {
            const { province, city, detectedName } = JSON.parse(saved);
            setSelectedProvince(province);
            setSelectedCity(city);
            if (detectedName) setDetectedLocationName(detectedName);
        } else {
            // No saved location — auto detect
            detectLocation();
        }
        loadProvinces();
    }, []);

    // Detect location using browser Geolocation API + reverse geocoding
    const detectLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }

        setLocationStatus('detecting');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`,
                        { headers: { 'User-Agent': 'RamadhanTracker/1.0' } }
                    );
                    const geo = await res.json();
                    const address = geo.address || {};

                    // Extract city and province from geocoded data
                    const detectedCity = address.city || address.town || address.municipality
                        || address.county || address.village || '';
                    const detectedProvince = address.state || '';
                    const detectedName = `${detectedCity}, ${detectedProvince}`;

                    // Load all provinces from API
                    const allProvinces = await getProvinces();

                    // Match province
                    const provLower = detectedProvince.toLowerCase();
                    let matchedProvince = allProvinces.find(p => p.toLowerCase() === provLower);

                    if (!matchedProvince && PROVINCE_ALIASES[provLower]) {
                        matchedProvince = allProvinces.find(p => p === PROVINCE_ALIASES[provLower]);
                    }

                    // Fuzzy province match
                    if (!matchedProvince) {
                        matchedProvince = allProvinces.find(p =>
                            p.toLowerCase().includes(provLower) || provLower.includes(p.toLowerCase())
                        );
                    }

                    if (matchedProvince) {
                        setSelectedProvince(matchedProvince);

                        // Load cities for matched province
                        const citiesList = await getCities(matchedProvince);
                        setCities(citiesList);

                        // Match city
                        const matchedCity = findBestCityMatch(detectedCity, citiesList);

                        if (matchedCity) {
                            setSelectedCity(matchedCity);
                            setDetectedLocationName(detectedName);

                            // Save to localStorage
                            localStorage.setItem('ramadhan_location', JSON.stringify({
                                province: matchedProvince,
                                city: matchedCity,
                                detectedName: detectedName,
                            }));

                            setLocationStatus('success');
                        } else {
                            // Province matched but city not found — let user pick city
                            setDetectedLocationName(detectedName);
                            setLocationStatus('error');
                            setShowSettings(true);
                        }
                    } else {
                        // Province not found — let user pick manually
                        setDetectedLocationName(detectedName);
                        setLocationStatus('error');
                        setShowSettings(true);
                    }
                } catch (err) {
                    console.error('Reverse geocoding error:', err);
                    setLocationStatus('error');
                    setShowSettings(true);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationStatus('error');
                // Show manual picker
                setShowSettings(true);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
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
                city: selectedCity,
                detectedName: detectedLocationName,
            }));
        }
    }, [selectedProvince, selectedCity]);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const date = today.getDate();

            const data = await getShalatSchedule(selectedProvince, selectedCity, month, year);

            if (data?.jadwal) {
                const todayData = data.jadwal.find(d => parseInt(d.tanggal) === date);
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

    // Detecting location state
    if (locationStatus === 'detecting') {
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
                    marginTop: '12px',
                    width: '40px', height: '4px',
                    borderRadius: '4px',
                    background: 'var(--dark-700)',
                    overflow: 'hidden',
                    margin: '12px auto 0',
                }}>
                    <div style={{
                        width: '60%', height: '100%',
                        background: 'var(--success)',
                        borderRadius: '4px',
                        animation: 'pulse 1.5s infinite',
                    }} />
                </div>
            </div>
        );
    }

    if ((!selectedProvince || showSettings)) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--dark-100)', margin: 0, fontSize: '16px' }}>
                        📍 Lokasi Jadwal Sholat
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

                {/* Auto detect button */}
                <button
                    onClick={detectLocation}
                    disabled={locationStatus === 'detecting'}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <span>📍</span>
                    {locationStatus === 'detecting' ? 'Mendeteksi...' : 'Deteksi Lokasi Otomatis'}
                </button>

                {detectedLocationName && locationStatus === 'error' && (
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        marginBottom: '12px',
                        fontSize: '11px',
                        color: '#fbbf24',
                    }}>
                        ⚠️ Terdeteksi: {detectedLocationName}. Silakan pilih kota yang sesuai dari daftar.
                    </div>
                )}

                <div style={{
                    fontSize: '11px', color: 'var(--dark-500)',
                    textAlign: 'center', marginBottom: '12px',
                    textTransform: 'uppercase', fontWeight: '600', letterSpacing: '1px',
                }}>
                    atau pilih manual
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
