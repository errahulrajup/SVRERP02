// =============================================================================
// export.ts — Generic Excel / CSV export utilities
// Requires: xlsx  (npm i xlsx)
// =============================================================================
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ExportColumn<T> {
  /** Column header shown in the first row */
  header: string;
  /** Derives the cell value from a data row */
  getValue: (row: T) => string | number;
}

// ---------------------------------------------------------------------------
// Excel export
// ---------------------------------------------------------------------------
/**
 * Exports `data` to an .xlsx file using the browser's download mechanism.
 *
 * @param data     Array of data rows
 * @param columns  Column definitions (header + value accessor)
 * @param filename Base filename (date is appended automatically)
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void {
  const today = new Date().toISOString().split('T')[0];

  const worksheetData: (string | number)[][] = [
    columns.map((c) => c.header),                          // header row
    ...data.map((row) => columns.map((c) => c.getValue(row))), // data rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Auto-fit column widths based on max content length
  const colWidths = columns.map((c, colIdx) => {
    const maxLen = Math.max(
      c.header.length,
      ...data.map((row) => String(c.getValue(row)).length),
    );
    return { wch: Math.min(maxLen + 2, 60) }; // cap at 60 chars
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------
/**
 * Exports `data` to a .csv file using the browser's download mechanism.
 *
 * Values are JSON-stringified to handle commas and quotes correctly.
 *
 * @param data     Array of data rows
 * @param columns  Column definitions (header + value accessor)
 * @param filename Base filename (date is appended automatically)
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void {
  const today = new Date().toISOString().split('T')[0];

  const lines: string[] = [
    // Header row — always quoted
    columns.map((c) => JSON.stringify(c.header)).join(','),
    // Data rows
    ...data.map((row) =>
      columns
        .map((c) => {
          const val = c.getValue(row);
          return typeof val === 'string' ? JSON.stringify(val) : val;
        })
        .join(','),
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
