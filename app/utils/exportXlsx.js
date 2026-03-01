'use client';

import ExcelJS from 'exceljs';

/**
 * Shared XLSX export utility with rich styling
 */

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

        // Alternating row colors
        const bgColor = isTopRank ? COLORS.rankGold : (rowIndex % 2 === 0 ? COLORS.white : COLORS.altRow);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        // Top 3 rank styling
        if (isTopRank) {
            cell.font = { ...cell.font, bold: true };
        }

        // Name column (col 2) left-align
        if (colNum === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Negative metric columns — red tint
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

    // Column count: with group col we have 15 cols, without 14
    const colCount = includeGroup ? 15 : 14;

    // Row 1: Main title
    const titleRow = ws.addRow([`Ramadhan Tracker - ${title}`]);
    ws.mergeCells(1, 1, 1, colCount);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.headerText }, name: 'Calibri' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subtitle
    const subRow = ws.addRow([`${filterLabel} | ${dateStr}`]);
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

    // Negative columns (Tdk Aktif jam, Tidur, Tidur jam, Hiburan)
    const negCols = includeGroup ? [10, 11, 12, 13] : [9, 10, 11, 12];

    // Data rows
    users.forEach((u, i) => {
        const realRank = rankFrom + i;
        const rowData = includeGroup
            ? [
                realRank,
                u.full_name,
                u.user_group || '-',
                u.sholat || 0,
                u.sunnah || 0,
                (u.aktivitas || 0) + (u.custom || 0),
                u.quran_ayat || 0,
                u.amanah || 0,
                u.amanah_hours || 0,
                u.idle_hours || 0,
                u.tidur_count || 0,
                u.tidur_hours || 0,
                u.hiburan_count || 0,
                u.produktif_score != null ? u.produktif_score : '-',
                getSortValue(u),
            ]
            : [
                realRank,
                u.full_name,
                u.sholat || 0,
                u.sunnah || 0,
                (u.aktivitas || 0) + (u.custom || 0),
                u.quran_ayat || 0,
                u.amanah || 0,
                u.amanah_hours || 0,
                u.idle_hours || 0,
                u.tidur_count || 0,
                u.tidur_hours || 0,
                u.hiburan_count || 0,
                u.produktif_score != null ? u.produktif_score : '-',
                getSortValue(u),
            ];
        const row = ws.addRow(rowData);
        const isTop = realRank <= 3;
        styleDataRow(row, i, isTop, negCols);

        // Medal emoji for top 3
        if (realRank <= 3) {
            const medal = realRank === 1 ? '🥇' : realRank === 2 ? '🥈' : '🥉';
            row.getCell(1).value = `${medal} ${realRank}`;
        }
    });

    // Column widths
    if (includeGroup) {
        ws.columns = [
            { width: 8 },  // #
            { width: 25 }, // Nama
            { width: 14 }, // Grup
            { width: 9 },  // Sholat
            { width: 9 },  // Sunnah
            { width: 11 }, // Aktivitas
            { width: 10 }, // Quran
            { width: 9 },  // Tugas
            { width: 12 }, // Tugas (jam)
            { width: 14 }, // Tdk Aktif (jam)
            { width: 8 },  // Tidur
            { width: 12 }, // Tidur (jam)
            { width: 10 }, // Hiburan
            { width: 10 }, // Produktif
            { width: 12 }, // Nilai
        ];
    } else {
        ws.columns = [
            { width: 8 },  // #
            { width: 28 }, // Nama
            { width: 9 },  // Sholat
            { width: 9 },  // Sunnah
            { width: 11 }, // Aktivitas
            { width: 10 }, // Quran
            { width: 9 },  // Tugas
            { width: 12 }, // Tugas (jam)
            { width: 14 }, // Tdk Aktif (jam)
            { width: 8 },  // Tidur
            { width: 12 }, // Tidur (jam)
            { width: 10 }, // Hiburan
            { width: 10 }, // Produktif
            { width: 12 }, // Nilai
        ];
    }

    // Auto-filter on header row (row 5)
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 6 + users.length, column: colCount } };

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

    // Title
    const titleRow = ws.addRow(['Ramadhan Tracker - Peringkat Grup']);
    ws.mergeCells(1, 1, 1, colCount);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.headerText }, name: 'Calibri' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Subtitle
    const subRow = ws.addRow([`${filterLabel} | ${dateStr}`]);
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
            realRank,
            g.group,
            g.members,
            g.totalActivities,
            getGroupSortValue ? getGroupSortValue(g) : g.totalActivities,
        ]);
        styleDataRow(row, i, realRank <= 3);

        if (realRank <= 3) {
            const medal = realRank === 1 ? '🥇' : realRank === 2 ? '🥈' : '🥉';
            row.getCell(1).value = `${medal} ${realRank}`;
        }

        // Name left-align
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    ws.columns = [
        { width: 8 }, { width: 25 }, { width: 12 }, { width: 16 }, { width: 14 },
    ];

    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 6 + groups.length, column: colCount } };

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
