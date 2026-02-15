// EQuran.id API Service
const BASE_URL = 'https://equran.id/api';

// Cache untuk provinsi dan kota
let provincesCache = null;
let citiesCache = {};

// ==================== JADWAL IMSAKIYAH ====================

export async function getProvinces() {
    if (provincesCache) return provincesCache;

    try {
        const res = await fetch(`${BASE_URL}/v2/imsakiyah/provinsi`);
        const data = await res.json();
        provincesCache = data.data || [];
        return provincesCache;
    } catch (error) {
        console.error('Error fetching provinces:', error);
        return [];
    }
}

export async function getCities(provinsi) {
    if (citiesCache[provinsi]) return citiesCache[provinsi];

    try {
        const res = await fetch(`${BASE_URL}/v2/imsakiyah/kabkota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provinsi })
        });
        const data = await res.json();
        citiesCache[provinsi] = data.data || [];
        return citiesCache[provinsi];
    } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
}

export async function getImsakiyah(provinsi, kabkota) {
    try {
        const res = await fetch(`${BASE_URL}/v2/imsakiyah`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provinsi, kabkota })
        });
        const data = await res.json();
        return data.data || null;
    } catch (error) {
        console.error('Error fetching imsakiyah:', error);
        return null;
    }
}

// ==================== JADWAL SHALAT ====================

export async function getShalatSchedule(provinsi, kabkota, bulan, tahun) {
    try {
        const res = await fetch(`${BASE_URL}/v2/shalat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provinsi, kabkota, bulan, tahun })
        });
        const data = await res.json();
        return data.data || null;
    } catch (error) {
        console.error('Error fetching shalat schedule:', error);
        return null;
    }
}

// ==================== DOA ====================

let doaCache = null;

export async function getAllDoa() {
    if (doaCache) return doaCache;

    try {
        const res = await fetch(`${BASE_URL}/doa`);
        const data = await res.json();
        doaCache = data || [];
        return doaCache;
    } catch (error) {
        console.error('Error fetching doa:', error);
        return [];
    }
}

export async function getDoaByTag(tag) {
    try {
        const res = await fetch(`${BASE_URL}/doa?tag=${encodeURIComponent(tag)}`);
        const data = await res.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching doa by tag:', error);
        return [];
    }
}

export async function getRandomDoa() {
    const allDoa = await getAllDoa();
    if (allDoa.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allDoa.length);
    return allDoa[randomIndex];
}

// ==================== AL-QURAN ====================

let suratListCache = null;

export async function getAllSurat() {
    if (suratListCache) return suratListCache;

    try {
        const res = await fetch(`${BASE_URL}/v2/surat`);
        const data = await res.json();
        suratListCache = data.data || [];
        return suratListCache;
    } catch (error) {
        console.error('Error fetching surat list:', error);
        return [];
    }
}

export async function getSuratDetail(nomor) {
    try {
        const res = await fetch(`${BASE_URL}/v2/surat/${nomor}`);
        const data = await res.json();
        return data.data || null;
    } catch (error) {
        console.error('Error fetching surat detail:', error);
        return null;
    }
}

export async function getRandomAyat() {
    try {
        // Get random surat (1-114)
        const randomSurat = Math.floor(Math.random() * 114) + 1;
        const surat = await getSuratDetail(randomSurat);

        if (!surat || !surat.ayat || surat.ayat.length === 0) return null;

        // Get random ayat from surat
        const randomAyatIndex = Math.floor(Math.random() * surat.ayat.length);
        const ayat = surat.ayat[randomAyatIndex];

        return {
            surat: {
                nomor: surat.nomor,
                nama: surat.nama,
                namaLatin: surat.namaLatin,
                arti: surat.arti,
            },
            ayat: {
                nomor: ayat.nomorAyat,
                arab: ayat.teksArab,
                latin: ayat.teksLatin,
                arti: ayat.teksIndonesia,
                audio: ayat.audio,
            }
        };
    } catch (error) {
        console.error('Error fetching random ayat:', error);
        return null;
    }
}

// Helper for deterministic daily seed
function getDailySeed(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        const char = dateStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getSeededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

export async function getDailyAyat() {
    try {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const seed = getDailySeed(dateStr);

        // Deterministic Surah (1-114)
        // Use seed to pick surah
        const rng1 = getSeededRandom(seed);
        const randomSurat = Math.floor(rng1 * 114) + 1;

        const surat = await getSuratDetail(randomSurat);

        if (!surat || !surat.ayat || surat.ayat.length === 0) return null;

        // Deterministic Ayat
        // Use seed+1 to pick ayat from that surah
        const rng2 = getSeededRandom(seed + 12345); // Different seed offset
        const randomAyatIndex = Math.floor(rng2 * surat.ayat.length);
        const ayat = surat.ayat[randomAyatIndex];

        return {
            surat: {
                nomor: surat.nomor,
                nama: surat.nama,
                namaLatin: surat.namaLatin,
                arti: surat.arti,
            },
            ayat: {
                nomor: ayat.nomorAyat,
                arab: ayat.teksArab,
                latin: ayat.teksLatin,
                arti: ayat.teksIndonesia,
                audio: ayat.audio,
            }
        };
    } catch (error) {
        console.error('Error fetching daily ayat:', error);
        return null;
    }
}

// ==================== UTILITIES ====================

export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

export function getCurrentPrayerInfo(jadwal) {
    if (!jadwal) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
        { name: 'Subuh', time: jadwal.subuh, icon: '🌅' },
        { name: 'Terbit', time: jadwal.terbit, icon: '☀️' },
        { name: 'Dhuha', time: jadwal.dhuha, icon: '🌤️' },
        { name: 'Dzuhur', time: jadwal.dzuhur, icon: '☀️' },
        { name: 'Ashar', time: jadwal.ashar, icon: '🌇' },
        { name: 'Maghrib', time: jadwal.maghrib, icon: '🌅' },
        { name: 'Isya', time: jadwal.isya, icon: '🌙' },
    ];

    // Find current and next prayer
    let current = null;
    let next = null;

    for (let i = 0; i < prayers.length; i++) {
        const prayerMinutes = parseTimeToMinutes(prayers[i].time);

        if (currentMinutes >= prayerMinutes) {
            current = prayers[i];
            next = prayers[i + 1] || prayers[0]; // Next day's Subuh
        }
    }

    // If before Subuh
    if (!current) {
        current = prayers[prayers.length - 1]; // Isya from yesterday
        next = prayers[0]; // Subuh
    }

    return { current, next, prayers };
}

export function getCountdownToTime(timeStr) {
    if (!timeStr) return null;

    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);

    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    // If target time has passed today, set for tomorrow
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }

    const diff = target - now;

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        hours: h,
        minutes: m,
        seconds: s,
        formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    };
}
