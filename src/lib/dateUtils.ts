/**
 * Utility functions for robust database date & time parsing and formatting.
 * Standardized to Philippine Standard Time (Asia/Manila, UTC+8).
 */

export function parseDatabaseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  let str = String(dateStr).trim();
  if (!str || str === "N/A" || str === "-") return null;

  // Replace space with T for ISO format compliance if needed
  if (!str.includes("T") && str.includes(" ")) {
    str = str.replace(" ", "T");
  }

  // Standardize timezone offsets like "+00" or "+08" into "+00:00" or "+08:00"
  str = str.replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a database date string into full Philippine date and time string (Asia/Manila, UTC+8).
 * Example output: "9/27/2026, 12:06:57 AM"
 */
export function formatDateTime(dateStr?: string | null): string {
  const d = parseDatabaseDate(dateStr);
  if (!d) return dateStr && dateStr !== "N/A" ? dateStr : "N/A";
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a database date string into a time-only string in Philippine Time (Asia/Manila, UTC+8).
 * Example output: "12:06 AM"
 */
export function formatTimeOnly(dateStr?: string | null): string {
  const d = parseDatabaseDate(dateStr);
  if (!d) return dateStr && dateStr !== "N/A" ? dateStr : "N/A";
  return d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Calculates human-readable elapsed duration between two database timestamps.
 * Example outputs: "41s", "15 mins", "1 hr 25 mins"
 */
export function formatTripDuration(startStr?: string | null, endStr?: string | null): string | null {
  if (!startStr || !endStr) return null;
  const start = parseDatabaseDate(startStr);
  const end = parseDatabaseDate(endStr);
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) {
    const totalSeconds = Math.max(1, Math.floor(diffMs / 1000));
    return `${totalSeconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min${mins === 1 ? "" : "s"}`;
  if (mins === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"} ${mins} min${mins === 1 ? "" : "s"}`;
}
