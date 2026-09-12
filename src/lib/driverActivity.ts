
/**
 * Determines driver activity status based on their recent online activity or completed rides.
 * 
 * Rules:
 *   🟢 ACTIVE   — Online now, or was online / completed a ride within the last 7 days
 *   ⚪ INACTIVE — No online or completed ride activity within the last 7 days
 *
 * @param lastOnlineAt         ISO timestamp of the driver's last online activity.
 * @param lastCompletedTripAt  ISO timestamp of the driver's last completed ride.
 * @param isOnline             True if the driver is currently online.
 * @returns "ACTIVE" | "INACTIVE"
 */
export function getDriverActivityStatus(
  lastOnlineAt: string | null,
  lastCompletedTripAt: string | null,
  isOnline: boolean
): "ACTIVE" | "INACTIVE" {
  if (isOnline) return "ACTIVE";

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (lastOnlineAt && new Date(lastOnlineAt) >= sevenDaysAgo) {
    return "ACTIVE";
  }

  if (lastCompletedTripAt && new Date(lastCompletedTripAt) >= sevenDaysAgo) {
    return "ACTIVE";
  }

  return "INACTIVE";
}

/**
 * Returns Tailwind class strings for an activity status badge.
 */
export function getActivityBadgeClasses(
  activityStatus: "ACTIVE" | "INACTIVE"
): string {
  switch (activityStatus) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    case "INACTIVE":
    default:
      return "bg-slate-50 text-slate-500 border border-slate-200";
  }
}
