/**
 * Utility for exporting tabular data into Excel-compatible CSV files with UTF-8 BOM.
 * This guarantees proper column separation and character encoding (including currency symbols
 * such as ₱ and special characters) across Microsoft Excel, Google Sheets, and LibreOffice.
 */

export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitizeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 files with proper encoding
  const csvContent =
    "\uFEFF" +
    [
      headers.map(sanitizeCell).join(","),
      ...rows.map((row) => row.map(sanitizeCell).join(",")),
    ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const cleanFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const days = Math.floor(safeMinutes / 1440);
  const remainingMins = safeMinutes % 1440;
  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;

  if (days > 0) {
    const dayLabel = days === 1 ? "1 day" : `${days} days`;
    if (hours === 0 && mins === 0) return dayLabel;
    if (hours === 0) return `${dayLabel} ${mins}m`;
    if (mins === 0) return `${dayLabel} ${hours}h`;
    return `${dayLabel} ${hours}h ${mins}m`;
  }
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
