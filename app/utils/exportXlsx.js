'use client';

import ExcelJS from 'exceljs';

/**
 * Shared XLSX export utility with rich styling
 */

const RAMADAN_START_STR = '2026-02-18'; // 1 Ramadhan 1447 H

const COLORS = {
    headerBg: '1E3A5F',       // Dark navy
    headerText: 'FFFFFF',
    descBg: 'E8F4FD',         // Light blue for description row
    descText: '4B5563',
    rankGold: 'FFF3CD',
    rankGoldBorder: 'F59E0B',
    positiveLight: 'D1FAE5',   // Light green
    positiveDark: '065F46',
    negativeLight: 'FEE2E2',   // Light red
    negativeDark: 'DC2626',
    altRow: 'F8FAFC',
    white: 'FFFFFF',
    borderColor: 'D1D5DB',
    titleBg: '065F46',
    subtitleText: '6B7280',
    legendHeaderBg: '374151',
    legendHeaderText: 'FFFFFF',
    legendCatBg: 'EFF6FF',
    legendCatText: '1E40AF',
};

const thinBorder = {
    top: { style: 'thin', color: { argb: COLORS.borderColor } },
    left: { style: 'thin', color: { argb: COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
    right: { style: 'thin', color: { argb: COLORS.borderColor } },
};

function styleHeaderRow(row) {
    row.height = 28;
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 10, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
    });
}

function styleDescRow(row) {
    row.height = 32;
    row.eachCell((cell) => {
        cell.font = { size: 7.5, color: { argb: COLORS.descText }, italic: true, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.descBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
    });
}

function styleDataRow(row, rowIndex, isTopRank, negCols = []) {
    row.height = 22;
    row.eachCell((cell, colNum) => {
        cell.font = { size: 9, name: 'Calibri' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;

        const bgColor = isTopRank ? COLORS.rankGold : (rowIndex % 2 === 0 ? COLORS.white : COLORS.altRow);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        if (isTopRank) {
            cell.font = { ...cell.font, bold: true };
        }

        if (colNum === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        if (negCols.includes(colNum)) {
            const val = typeof cell.value === 'number' ? cell.value : parseFloat(cell.value);
            if (val > 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.negativeLight } };
                cell.font = { ...cell.font, color: { argb: COLORS.negativeDark } };
            }
        }
    });
}

/**
 * Build the enhanced filterLabel for 30-hari mode
 */
function buildEnhancedFilterLabel(filterLabel) {
    if (!filterLabel.includes('30 Hari')) return filterLabel;

    const ramadanStart = new Date(RAMADAN_START_STR + 'T00:00:00');
    const today = new Date();
    const formatDate = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return `Todate Rekap Ramadhan (${formatDate(ramadanStart)} - ${formatDate(today)})`;
}

/**
 * Add a "Keterangan Kolom" legend sheet
 */
function addLegendSheet(workbook, includeGroup = false) {
    const ws = workbook.addWorksheet('Keterangan Kolom');

    // Title
    const titleRow = ws.addRow(['Keterangan Kolom — Panduan Membaca Data']);
    ws.mergeCells(1, 1, 1, 4);
    titleRow.height = 36;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: COLORS.headerText }, name: 'Calibri' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Subtitle
    const subRow = ws.addRow(['Dokumen ini menjelaskan arti dan cara perhitungan setiap kolom pada sheet data.']);
    ws.mergeCells(2, 1, 2, 4);
    subRow.height = 22;
    subRow.getCell(1).font = { size: 10, color: { argb: COLORS.subtitleText }, italic: true, name: 'Calibri' };
    subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };

    // Spacer
    ws.addRow([]);

    // Table header
    const headerRow = ws.addRow(['Kolom', 'Satuan', 'Deskripsi', 'Cara Perhitungan']);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.legendHeaderText }, size: 10, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.legendHeaderBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
    });

    // Legend data
    const legendData = [
        { cat: 'IDENTITAS', items: [] },
        { col: '#', unit: 'Angka', desc: 'Nomor peringkat user', calc: 'Urutan berdasarkan kriteria sorting yang dipilih' },
        { col: 'Nama', unit: 'Teks', desc: 'Nama lengkap pengguna', calc: 'Diambil dari data profil pengguna' },
    ];

    if (includeGroup) {
        legendData.push({ col: 'Grup', unit: 'Teks', desc: 'Nama kelompok/label pengguna', calc: 'Diambil dari data profil pengguna' });
    }

    legendData.push(
        { cat: 'IBADAH', items: [] },
        { col: 'Sholat', unit: 'Frekuensi (kali)', desc: 'Jumlah sholat wajib yang dilaporkan', calc: 'Total frekuensi sholat wajib (Subuh, Dzuhur, Ashar, Maghrib, Isya) selama periode yang dipilih. Contoh: 50 berarti sudah sholat 50 kali.' },
        { col: 'Sunnah', unit: 'Frekuensi (kali)', desc: 'Jumlah sholat sunnah yang dilaporkan', calc: 'Total frekuensi semua sholat sunnah (Dhuha, Tahajud, Rawatib, dll) selama periode yang dipilih.' },

        { cat: 'AKTIVITAS', items: [] },
        { col: 'Aktivitas', unit: 'Frekuensi (kali)', desc: 'Jumlah aktivitas harian + custom', calc: 'Total frekuensi aktivitas harian (olahraga, bersih-bersih, dll) ditambah aktivitas custom yang dibuat sendiri.' },
        { col: 'Quran', unit: 'Ayat', desc: 'Total ayat Al-Quran yang dibaca', calc: 'Akumulasi jumlah ayat yang dibaca selama periode. Contoh: 500 berarti total 500 ayat sudah dibaca.' },

        { cat: 'TUGAS (AMANAH)', items: [] },
        { col: 'Tugas', unit: 'Frekuensi (kali)', desc: 'Jumlah tugas/amanah yang dikerjakan', calc: 'Total frekuensi tugas yang dilaporkan selesai selama periode. Contoh: 10 berarti 10 tugas sudah dikerjakan.' },
        { col: 'Tugas (jam)', unit: 'Durasi (jam)', desc: 'Total waktu mengerjakan tugas', calc: 'Akumulasi durasi waktu yang dihabiskan mengerjakan tugas. Dihitung dari selisih waktu mulai dan selesai tiap sesi tugas.' },

        { cat: 'METRIK NEGATIF (merah = semakin banyak semakin kurang baik)', items: [] },
        { col: 'Tdk Aktif (jam)', unit: 'Durasi (jam)', desc: 'Total waktu tidak beraktivitas', calc: 'Akumulasi jam dalam sehari dimana user tidak melaporkan aktivitas apapun. Semakin kecil nilai ini semakin baik.' },
        { col: 'Tidur', unit: 'Frekuensi (kali)', desc: 'Jumlah sesi tidur yang dilaporkan', calc: 'Total frekuensi sesi tidur selama periode. Contoh: 15 berarti 15 sesi tidur tercatat.' },
        { col: 'Tidur (jam)', unit: 'Durasi (jam)', desc: 'Total waktu tidur', calc: 'Akumulasi durasi tidur. Dihitung dari selisih waktu mulai dan selesai tiap sesi tidur. Contoh: 45.5 berarti total 45.5 jam tidur.' },
        { col: 'Hiburan', unit: 'Frekuensi (kali)', desc: 'Jumlah aktivitas hiburan', calc: 'Total frekuensi aktivitas hiburan (main game, nonton, social media, dll) selama periode.' },

        { cat: 'SKOR', items: [] },
        { col: 'Produktif', unit: 'Poin', desc: 'Skor produktivitas keseluruhan', calc: 'Skor gabungan dari semua metrik. Ibadah & aktivitas menambah skor, sedangkan tidur/hiburan/idle mengurangi skor. Semakin tinggi semakin produktif.' },
        { col: 'Nilai', unit: 'Bervariasi', desc: 'Nilai berdasarkan kriteria urutan yang dipilih', calc: 'Menampilkan nilai sesuai sorting yang aktif saat export. Bisa berupa frekuensi, durasi, poin, atau ayat tergantung pilihan urutan.' },
    );

    // Render legend rows
    let rowIdx = 0;
    legendData.forEach((item) => {
        if (item.cat) {
            // Category separator row
            const catRow = ws.addRow([item.cat, '', '', '']);
            ws.mergeCells(catRow.number, 1, catRow.number, 4);
            catRow.height = 26;
            catRow.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.legendCatText }, name: 'Calibri' };
            catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.legendCatBg } };
            catRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
            catRow.getCell(1).border = thinBorder;
        } else {
            const row = ws.addRow([item.col, item.unit, item.desc, item.calc]);
            row.height = 40;
            row.eachCell((cell, colNum) => {
                cell.font = { size: 9, name: 'Calibri' };
                cell.alignment = { horizontal: colNum <= 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIdx % 2 === 0 ? COLORS.white : COLORS.altRow } };

                // Bold the column name
                if (colNum === 1) {
                    cell.font = { ...cell.font, bold: true, color: { argb: COLORS.headerBg } };
                }
            });
            rowIdx++;
        }
    });

    // Spacer
    ws.addRow([]);

    // Notes section
    const notesTitle = ws.addRow(['Catatan Penting']);
    ws.mergeCells(notesTitle.number, 1, notesTitle.number, 4);
    notesTitle.height = 26;
    notesTitle.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.headerText }, name: 'Calibri' };
    notesTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.legendHeaderBg } };
    notesTitle.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    const notes = [
        ['1.', 'Periode "30 Hari" menghitung dari hari pertama Ramadhan (1 Ramadhan 1447H / 18 Februari 2026) sampai hari ini (to-date), bukan selalu tepat 30 hari.'],
        ['2.', 'Kolom berwarna merah menandakan metrik negatif — semakin tinggi nilainya semakin kurang baik untuk produktivitas.'],
        ['3.', 'Baris berwarna emas (kuning) menandakan peringkat 1, 2, dan 3 teratas.'],
        ['4.', 'Baris bergantian warna putih dan abu-abu muda untuk memudahkan pembacaan.'],
        ['5.', 'User yang tidak melaporkan aktivitas (idle) pada suatu hari tetap dihitung jam idle-nya.'],
        ['6.', 'Skor Produktif dihitung otomatis berdasarkan bobot: ibadah & aktivitas positif menambah skor, tidur/hiburan/idle mengurangi skor.'],
    ];

    notes.forEach((note, i) => {
        const noteRow = ws.addRow([note[0], note[1]]);
        ws.mergeCells(noteRow.number, 2, noteRow.number, 4);
        noteRow.height = 28;
        noteRow.getCell(1).font = { bold: true, size: 9, color: { argb: COLORS.titleBg }, name: 'Calibri' };
        noteRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        noteRow.getCell(2).font = { size: 9, name: 'Calibri' };
        noteRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        noteRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? COLORS.white : COLORS.altRow } };
        noteRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? COLORS.white : COLORS.altRow } };
        noteRow.getCell(1).border = thinBorder;
        noteRow.getCell(2).border = thinBorder;
    });

    // Column widths
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 35;
    ws.getColumn(4).width = 55;
}

/**
 * Export user ranking as XLSX
 */
export async function exportUserXlsx({
    users,
    rankFrom,
    title,
    filterLabel,
    dateStr,
    sortLabel,
    getSortValue,
    fileName,
    includeGroup = false,
    groupStats = null,
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ramadhan Tracker';
    workbook.created = new Date();
    const ws = workbook.addWorksheet('Rekap User', {
        views: [{ state: 'frozen', ySplit: 6 }],
    });

    const colCount = includeGroup ? 15 : 14;
    const enhancedFilter = buildEnhancedFilterLabel(filterLabel);

    // Row 1: Main title
    const titleRow = ws.addRow([`Ramadhan Tracker - ${title}`]);
    ws.mergeCells(1, 1, 1, colCount);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.headerText }, name: 'Calibri' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subtitle with enhanced date range
    const subRow = ws.addRow([`${enhancedFilter} | Di export pada ${dateStr}`]);
    ws.mergeCells(2, 1, 2, colCount);
    subRow.height = 20;
    subRow.getCell(1).font = { size: 10, color: { argb: COLORS.subtitleText }, name: 'Calibri' };
    subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };

    // Row 3: Sort info
    const infoText = `Peringkat #${rankFrom} - #${rankFrom + users.length - 1} | Diurutkan: ${sortLabel}`;
    const infoRow = ws.addRow([groupStats ? `${infoText} | Anggota: ${groupStats.totalMembers} | Total Aktivitas: ${groupStats.totalActivities} | Total Ayat: ${groupStats.totalQuranAyat}` : infoText]);
    ws.mergeCells(3, 1, 3, colCount);
    infoRow.height = 18;
    infoRow.getCell(1).font = { size: 9, color: { argb: COLORS.subtitleText }, italic: true, name: 'Calibri' };
    infoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 4: Empty spacer
    ws.addRow([]);

    // Row 5: Headers
    const headers = includeGroup
        ? ['#', 'Nama', 'Grup', 'Sholat', 'Sunnah', 'Aktivitas', 'Quran', 'Tugas', 'Tugas (jam)', 'Tdk Aktif (jam)', 'Tidur', 'Tidur (jam)', 'Hiburan', 'Produktif', 'Nilai']
        : ['#', 'Nama', 'Sholat', 'Sunnah', 'Aktivitas', 'Quran', 'Tugas', 'Tugas (jam)', 'Tdk Aktif (jam)', 'Tidur', 'Tidur (jam)', 'Hiburan', 'Produktif', 'Nilai'];
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    // Row 6: Description row
    const descs = includeGroup
        ? ['Peringkat', 'Nama lengkap', 'Kelompok', 'Frekuensi sholat wajib', 'Frekuensi sholat sunnah', 'Frekuensi aktivitas harian + custom', 'Total ayat yang dibaca', 'Frekuensi tugas dikerjakan', 'Durasi mengerjakan tugas (jam)', 'Durasi tidak beraktivitas (jam)', 'Frekuensi tidur', 'Durasi tidur (jam)', 'Frekuensi hiburan', 'Skor produktivitas', 'Nilai sesuai urutan']
        : ['Peringkat', 'Nama lengkap', 'Frekuensi sholat wajib', 'Frekuensi sholat sunnah', 'Frekuensi aktivitas harian + custom', 'Total ayat yang dibaca', 'Frekuensi tugas dikerjakan', 'Durasi mengerjakan tugas (jam)', 'Durasi tidak beraktivitas (jam)', 'Frekuensi tidur', 'Durasi tidur (jam)', 'Frekuensi hiburan', 'Skor produktivitas', 'Nilai sesuai urutan'];
    const descRow = ws.addRow(descs);
    styleDescRow(descRow);

    // Negative columns
    const negCols = includeGroup ? [10, 11, 12, 13] : [9, 10, 11, 12];

    // Data rows
    users.forEach((u, i) => {
        const realRank = rankFrom + i;
        const rowData = includeGroup
            ? [
                realRank, u.full_name, u.user_group || '-',
                u.sholat || 0, u.sunnah || 0, (u.aktivitas || 0) + (u.custom || 0),
                u.quran_ayat || 0, u.amanah || 0, u.amanah_hours || 0,
                u.idle_hours || 0, u.tidur_count || 0, u.tidur_hours || 0,
                u.hiburan_count || 0, u.produktif_score != null ? u.produktif_score : '-',
                getSortValue(u),
            ]
            : [
                realRank, u.full_name,
                u.sholat || 0, u.sunnah || 0, (u.aktivitas || 0) + (u.custom || 0),
                u.quran_ayat || 0, u.amanah || 0, u.amanah_hours || 0,
                u.idle_hours || 0, u.tidur_count || 0, u.tidur_hours || 0,
                u.hiburan_count || 0, u.produktif_score != null ? u.produktif_score : '-',
                getSortValue(u),
            ];
        const row = ws.addRow(rowData);
        const isTop = realRank <= 3;
        styleDataRow(row, i, isTop, negCols);

        if (realRank <= 3) {
            const medal = realRank === 1 ? '🥇' : realRank === 2 ? '🥈' : '🥉';
            row.getCell(1).value = `${medal} ${realRank}`;
        }
    });

    // Column widths
    if (includeGroup) {
        ws.columns = [
            { width: 8 }, { width: 25 }, { width: 14 },
            { width: 9 }, { width: 9 }, { width: 11 }, { width: 10 },
            { width: 9 }, { width: 12 }, { width: 14 },
            { width: 8 }, { width: 12 }, { width: 10 },
            { width: 10 }, { width: 12 },
        ];
    } else {
        ws.columns = [
            { width: 8 }, { width: 28 },
            { width: 9 }, { width: 9 }, { width: 11 }, { width: 10 },
            { width: 9 }, { width: 12 }, { width: 14 },
            { width: 8 }, { width: 12 }, { width: 10 },
            { width: 10 }, { width: 12 },
        ];
    }

    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 6 + users.length, column: colCount } };

    // Add legend sheet
    addLegendSheet(workbook, includeGroup);

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export group ranking as XLSX
 */
export async function exportGroupXlsx({
    groups,
    rankFrom,
    filterLabel,
    dateStr,
    sortLabel,
    getGroupSortValue,
    fileName,
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ramadhan Tracker';
    workbook.created = new Date();
    const ws = workbook.addWorksheet('Peringkat Grup', {
        views: [{ state: 'frozen', ySplit: 6 }],
    });

    const colCount = 5;
    const enhancedFilter = buildEnhancedFilterLabel(filterLabel);

    // Title
    const titleRow = ws.addRow(['Ramadhan Tracker - Peringkat Grup']);
    ws.mergeCells(1, 1, 1, colCount);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.headerText }, name: 'Calibri' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Subtitle with enhanced date range
    const subRow = ws.addRow([`${enhancedFilter} | Di export pada ${dateStr}`]);
    ws.mergeCells(2, 1, 2, colCount);
    subRow.height = 20;
    subRow.getCell(1).font = { size: 10, color: { argb: COLORS.subtitleText }, name: 'Calibri' };
    subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };

    // Info
    const infoRow = ws.addRow([`Peringkat #${rankFrom} - #${rankFrom + groups.length - 1} | Diurutkan: ${sortLabel}`]);
    ws.mergeCells(3, 1, 3, colCount);
    infoRow.height = 18;
    infoRow.getCell(1).font = { size: 9, color: { argb: COLORS.subtitleText }, italic: true, name: 'Calibri' };
    infoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.addRow([]);

    // Headers
    const headerRow = ws.addRow(['#', 'Grup', 'Anggota', 'Total Aktivitas', 'Nilai']);
    styleHeaderRow(headerRow);

    // Description row
    const descRow = ws.addRow(['Peringkat', 'Nama kelompok', 'Jumlah anggota', 'Total semua aktivitas', 'Nilai sesuai urutan']);
    styleDescRow(descRow);

    // Data
    groups.forEach((g, i) => {
        const realRank = rankFrom + i;
        const row = ws.addRow([
            realRank, g.group, g.members, g.totalActivities,
            getGroupSortValue ? getGroupSortValue(g) : g.totalActivities,
        ]);
        styleDataRow(row, i, realRank <= 3);

        if (realRank <= 3) {
            const medal = realRank === 1 ? '🥇' : realRank === 2 ? '🥈' : '🥉';
            row.getCell(1).value = `${medal} ${realRank}`;
        }

        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    ws.columns = [
        { width: 8 }, { width: 25 }, { width: 12 }, { width: 16 }, { width: 14 },
    ];

    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 6 + groups.length, column: colCount } };

    // Add legend sheet
    addLegendSheet(workbook, false);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
