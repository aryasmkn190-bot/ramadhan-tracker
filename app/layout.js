import "./globals.css";

export const metadata = {
  title: "Ramadhan Tracker - Catatan Ibadah Harian",
  description: "Aplikasi pencatatan aktivitas ibadah harian selama bulan Ramadhan. Catat sholat, puasa, tadarus Al-Quran, dan amal lainnya.",
  keywords: ["ramadhan", "puasa", "sholat", "tadarus", "quran", "ibadah", "muslim", "islam"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ramadhan Tracker",
  },
  openGraph: {
    title: "Ramadhan Tracker - Catatan Ibadah Harian",
    description: "Catat dan pantau aktivitas ibadah harian selama bulan Ramadhan",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
