# 🌙 Ramadhan Tracker

Aplikasi PWA untuk pencatatan aktivitas ibadah harian selama bulan Ramadhan. Dilengkapi dengan fitur komunitas, leaderboard, dan panel admin.

![Ramadhan Tracker](public/icons/icon-192x192.png)

## ✨ Fitur

### Untuk Anggota
- ✅ **Checklist Ibadah Harian** - Sholat wajib, sunnah, puasa, dzikir
- 📖 **Progress Tadarus Al-Quran** - Track per juz dan halaman
- 🏆 **Leaderboard** - Kompetisi tadarus dengan anggota lain
- 📊 **Statistik Personal** - Lihat progress ibadahmu
- 📴 **Offline Support** - Tetap bisa digunakan tanpa internet
- 📲 **PWA** - Install seperti native app

### Untuk Admin
- 👥 **Kelola Anggota** - Lihat semua anggota komunitas
- 📢 **Pengumuman** - Kirim pengumuman ke semua anggota
- 👨‍💼 **Kelola Admin** - Tambah/hapus admin
- 📈 **Statistik Komunitas** - Lihat progress keseluruhan

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd ramadhan-tracker
npm install
```

### 2. Setup Supabase (untuk fitur komunitas)

1. Buat akun gratis di [supabase.com](https://supabase.com)
2. Create new project
3. Buka **SQL Editor** dan jalankan isi file `supabase-schema.sql`
4. Copy **Project URL** dan **anon key** dari Settings > API

### 3. Konfigurasi Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 5. Jadikan Diri Sebagai Admin

Setelah register akun pertama, jalankan SQL ini di Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'email-kamu@example.com';
```

## 📦 Deploy ke Production

### Vercel (Recommended)

1. Push ke GitHub
2. Connect repo di [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Manual Build

```bash
npm run build
npm start
```

## 📁 Struktur Project

```
ramadhan-tracker/
├── app/
│   ├── components/
│   │   ├── ActivityCard.js      # Card aktivitas dengan toggle
│   │   ├── AdminPage.js         # Dashboard admin
│   │   ├── AuthPage.js          # Modal login/register
│   │   ├── BottomNav.js         # Navigasi bawah
│   │   ├── Header.js            # Header dengan info user
│   │   ├── HistoryPage.js       # Riwayat aktivitas
│   │   ├── HomePage.js          # Halaman utama
│   │   ├── LeaderboardPage.js   # Ranking tadarus
│   │   ├── QuranCard.js         # Card progress Quran
│   │   ├── QuranPage.js         # Halaman tadarus
│   │   ├── SettingsPage.js      # Pengaturan
│   │   ├── StatsCard.js         # Statistik harian
│   │   └── Toast.js             # Notifikasi toast
│   ├── contexts/
│   │   ├── AppContext.js        # State management utama
│   │   └── AuthContext.js       # Authentication state
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── page.js                  # Main page
├── public/
│   ├── icons/                   # PWA icons
│   └── manifest.json            # PWA manifest
├── supabase-schema.sql          # Database schema
├── .env.local.example           # Env template
└── next.config.mjs              # Next.js config
```

## 🗄️ Database Schema

### Tables
- **profiles** - Data user (id, email, full_name, role)
- **daily_activities** - Aktivitas harian per user
- **quran_progress** - Progress tadarus
- **quran_reading_log** - Log bacaan harian
- **announcements** - Pengumuman dari admin

### Views
- **quran_leaderboard** - Ranking tadarus
- **activity_leaderboard** - Ranking aktivitas
- **community_stats** - Statistik komunitas

## 🔐 Row Level Security (RLS)

Semua tabel dilindungi dengan RLS:
- User hanya bisa akses data sendiri
- Admin bisa view semua data
- Leaderboard bisa dilihat semua user

## 📱 PWA Features

- ✅ Installable ke home screen
- ✅ Offline capable dengan service worker
- ✅ Push notifications (with permission)
- ✅ Responsive mobile-first design

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Vanilla CSS
- **PWA**: next-pwa
- **Font**: Outfit (Google Fonts)

## 📄 License

MIT License - Bebas digunakan untuk komunitas

---

🌙 **Selamat Menjalankan Ibadah Ramadhan!** 🌙
