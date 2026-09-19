/**
 * Utility functions for robust database date & time parsing and formatting.
 * Correctly handles ISO timestamps from Supabase, detecting and correcting local ISO
 * strings stored with UTC suffixes so timestamps display in exact local Philippine time.
 */

export function parseDatabaseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  let str = String(dateStr).trim();
  if (!str || str === "N/A" || str === "-") return null;

  // Replace space with T for ISO format compliance if needed
  if (!str.includes("T") && str.includes(" ")) {
    str = str.replace(" ", "T");
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  // Handle case where local ISO string (e.g. "2026-09-19T13:46:29") was inserted into Postgres timestamptz
  // without converting to UTC first, causing Postgres to append +00:00 to local hours (>= 12).
  const match = str.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (match && (str.endsWith("Z") || /[+-]00:?00$/.test(str))) {
    const rawHour = parseInt(match[1], 10);
    if (rawHour >= 12 && date.getUTCHours() === rawHour) {
      const localStr = str.replace(/Z$|[+-]00:?00$/, "");
      const localDate = new Date(localStr);
      if (!isNaN(localDate.getTime())) {
        return localDate;
      }
    }
  }

  return date;
}

/**
 * Formats a database date string into full local date and time string in the user's timezone.
 * Example output: "9/19/2026, 1:46:29 PM"
 */
export function formatDateTime(dateStr?: string | null): string {
  const d = parseDatabaseDate(dateStr);
  if (!d) return dateStr && dateStr !== "N/A" ? dateStr : "N/A";
  return d.toLocaleString("en-US", {
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
 * Formats a database date string into a time-only string in the user's timezone.
 * Example output: "1:46 PM"
 */
export function formatTimeOnly(dateStr?: string | null): string {
  const d = parseDatabaseDate(dateStr);
  if (!d) return dateStr && dateStr !== "N/A" ? dateStr : "N/A";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
