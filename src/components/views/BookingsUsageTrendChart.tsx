import { useState, useMemo } from "react";
import { RideRequest } from "../../types";
import { parseDatabaseDate } from "../../lib/dateUtils";

interface BookingsUsageTrendChartProps {
  rideRequests: RideRequest[];
}

type TimeRange = "7d" | "14d" | "30d" | "all";
type MetricType = "bookings" | "revenue";

interface DailyBucket {
  dateKey: string; // "YYYY-MM-DD"
  dateObj: Date;
  labelShort: string; // e.g. "Sep 28"
  weekday: string; // e.g. "Mon"
  fullDate: string; // e.g. "Monday, September 28, 2026"
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
  isToday: boolean;
}

const money = (val: number) => `₱ ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export default function BookingsUsageTrendChart({ rideRequests }: BookingsUsageTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");
  const [metric, setMetric] = useState<MetricType>("bookings");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group real database bookings by date in Philippine Standard Time (Asia/Manila)
  const chartData = useMemo(() => {
    const dayMap = new Map<string, { total: number; completed: number; cancelled: number; revenue: number }>();

    // 1. Accumulate real records from rideRequests
    rideRequests.forEach((req) => {
      const d = parseDatabaseDate(req.requestedAt || req.time);
      if (!d) return;

      const dateKey = d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // "YYYY-MM-DD"
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { total: 0, completed: 0, cancelled: 0, revenue: 0 });
      }

      const bucket = dayMap.get(dateKey)!;
      bucket.total += 1;

      if (req.status === "Completed") {
        bucket.completed += 1;
        bucket.revenue += Number(req.fare || 0);
      } else if (req.status === "Cancelled") {
        bucket.cancelled += 1;
      }
    });

    // 2. Establish range boundaries in Philippine Time
    const now = new Date();
    const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    // Find earliest date if available
    let allKeys = Array.from(dayMap.keys()).sort();
    if (allKeys.length === 0) {
      allKeys = [todayKey];
    }

    let startDate: Date;
    const endDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    endDate.setHours(23, 59, 59, 999);

    if (timeRange === "7d") {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "14d") {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "30d") {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // "all" - start from earliest real booking date or 14 days ago
      const earliestStr = allKeys[0];
      const earliestParsed = new Date(earliestStr + "T00:00:00+08:00");
      startDate = isNaN(earliestParsed.getTime()) ? new Date(endDate.getTime() - 13 * 86400000) : earliestParsed;
      startDate.setHours(0, 0, 0, 0);
    }

    // 3. Generate continuous day-by-day buckets
    const buckets: DailyBucket[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const key = current.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const existing = dayMap.get(key) || { total: 0, completed: 0, cancelled: 0, revenue: 0 };

      const shortLabel = current.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      });

      const weekday = current.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        weekday: "short",
      });

      const fullDate = current.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      buckets.push({
        dateKey: key,
        dateObj: new Date(current),
        labelShort: shortLabel,
        weekday,
        fullDate,
        total: existing.total,
        completed: existing.completed,
        cancelled: existing.cancelled,
        revenue: existing.revenue,
        isToday: key === todayKey,
      });

      current.setDate(current.getDate() + 1);
    }

    return buckets;
  }, [rideRequests, timeRange]);

  // Aggregate stats across the visible period
  const stats = useMemo(() => {
    const totalBookings = chartData.reduce((s, b) => s + b.total, 0);
    const completedBookings = chartData.reduce((s, b) => s + b.completed, 0);
    const cancelledBookings = chartData.reduce((s, b) => s + b.cancelled, 0);
    const totalRevenue = chartData.reduce((s, b) => s + b.revenue, 0);

    const activeDaysCount = chartData.filter((b) => b.total > 0).length || 1;
    const avgDailyBookings = totalBookings / Math.max(1, chartData.length);
    const avgDailyRevenue = totalRevenue / Math.max(1, chartData.length);
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    let peakDay = chartData[0];
    let peakValue = 0;
    chartData.forEach((b) => {
      const val = metric === "bookings" ? b.total : b.revenue;
      if (val > peakValue) {
        peakValue = val;
        peakDay = b;
      }
    });

    const todayBucket = chartData.find((b) => b.isToday);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      avgDailyBookings,
      avgDailyRevenue,
      completionRate,
      peakDay,
      peakValue,
      todayTotal: todayBucket ? todayBucket.total : 0,
      todayRevenue: todayBucket ? todayBucket.revenue : 0,
      activeDaysCount,
    };
  }, [chartData, metric]);

  // SVG Geometry Calculations
  const svgWidth = 960;
  const svgHeight = 220;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 26;
  const paddingBottom = 34;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;

  // Max value calculation for Y-scale
  const rawMax = Math.max(
    ...chartData.map((d) => (metric === "bookings" ? d.total : d.revenue)),
    metric === "bookings" ? 5 : 200
  );
  // Round up to nice number
  const yMax = metric === "bookings" ? Math.ceil(rawMax * 1.15) : Math.ceil((rawMax * 1.15) / 100) * 100;

  // Compute points and spacing geometry
  const count = chartData.length;
  const stepX = count > 1 ? chartInnerWidth / (count - 1) : chartInnerWidth;

  const points = chartData.map((d, idx) => {
    const val = metric === "bookings" ? d.total : d.revenue;
    const x = paddingLeft + (count === 1 ? chartInnerWidth / 2 : idx * stepX);
    const ratio = yMax > 0 ? Math.min(1, Math.max(0, val / yMax)) : 0;
    const y = paddingTop + chartInnerHeight * (1 - ratio);
    return { x, y, val, d, idx };
  });

  const linePath = generateSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartInnerHeight).toFixed(
          1
        )} L ${points[0].x.toFixed(1)} ${(paddingTop + chartInnerHeight).toFixed(1)} Z`
      : "";

  // Gridline reference values (4 horizontal tiers)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
    const val = Math.round(yMax * pct);
    const y = paddingTop + chartInnerHeight * (1 - pct);
    return {
      val: metric === "bookings" ? val.toString() : `₱${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
      y,
    };
  });

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-4 sm:p-5 flex flex-col gap-4">
      {/* Header with Title, Metrics Toggle, and Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#000C7D] shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[#000C7D] font-bold text-base sm:text-lg leading-tight">Daily Bookings Usage & Trend</h2>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {metric === "bookings"
                ? `Daily booking volume across Tayabas TODAs • ${stats.totalBookings} total in period`
                : `Total fare earnings collected • ${money(stats.totalRevenue)} in period`}
            </p>
          </div>
        </div>

        {/* Action Controls: Metric Toggle & Time Range */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Metric Toggle: Bookings vs Revenue */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/60">
            <button
              onClick={() => setMetric("bookings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === "bookings"
                  ? "bg-white text-[#000C7D] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setMetric("revenue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === "revenue"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Revenue (₱)
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/60">
            {(["7d", "14d", "30d", "all"] as TimeRange[]).map((range) => {
              const labels: Record<TimeRange, string> = {
                "7d": "7D",
                "14d": "14D",
                "30d": "30D",
                all: "All",
              };
              return (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeRange === range
                      ? "bg-[#000C7D] text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {labels[range]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today&apos;s Activity</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#000C7D]">
              {metric === "bookings" ? stats.todayTotal : money(stats.todayRevenue)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {metric === "bookings" ? (stats.todayTotal === 1 ? "ride" : "rides") : "earned"}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Average</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#000C7D]">
              {metric === "bookings" ? stats.avgDailyBookings.toFixed(1) : money(Math.round(stats.avgDailyRevenue))}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {metric === "bookings" ? "rides/day" : "/day"}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Peak Day</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-600">
              {metric === "bookings" ? `${stats.peakDay ? stats.peakDay.total : 0} rides` : money(stats.peakDay ? stats.peakDay.revenue : 0)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium truncate">
              ({stats.peakDay?.labelShort || "None"})
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed Ratio</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-extrabold text-blue-600">
              {stats.completionRate.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              ({stats.completedBookings}/{stats.totalBookings})
            </span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        {/* Floating Tooltip when hovering over a point/bar */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 ease-out bg-[#000C7D] text-white p-3 rounded-xl shadow-xl border border-blue-400/20 text-xs min-w-[190px]"
            style={{
              left: `${Math.min(
                Math.max(8, (activePoint.x / svgWidth) * 100),
                78
              )}%`,
              top: "6px",
            }}
          >
            <p className="font-bold text-white text-[13px] border-b border-white/15 pb-1 mb-1.5 flex items-center justify-between">
              <span>{activePoint.d.labelShort}</span>
              <span className="text-[10px] font-normal text-blue-200">
                {activePoint.d.weekday}
                {activePoint.d.isToday ? " • Today" : ""}
              </span>
            </p>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-blue-100">
                <span>Total Bookings:</span>
                <span className="font-bold text-white">{activePoint.d.total}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-300">
                <span>Completed:</span>
                <span className="font-bold">{activePoint.d.completed}</span>
              </div>
              {activePoint.d.cancelled > 0 && (
                <div className="flex justify-between items-center text-rose-300">
                  <span>Cancelled:</span>
                  <span className="font-bold">{activePoint.d.cancelled}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-amber-200 pt-1 border-t border-white/10">
                <span>Fare Revenue:</span>
                <span className="font-extrabold text-white">{money(activePoint.d.revenue)}</span>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 lg:h-64 overflow-visible"
        >
          <defs>
            {/* Bookings Gradient Fill */}
            <linearGradient id="bookingsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#000C7D" stopOpacity="0.22" />
              <stop offset="75%" stopColor="#000C7D" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#000C7D" stopOpacity="0.00" />
            </linearGradient>

            {/* Revenue Gradient Fill */}
            <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.50" />
              <stop offset="35%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#047857" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.00" />
            </linearGradient>

            {/* Line Stroke Gradients */}
            <linearGradient id="bookingsLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="50%" stopColor="#000C7D" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            <linearGradient id="revenueLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Line Shadow Filter */}
            <filter id="lineGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor={metric === "bookings" ? "#000C7D" : "#059669"} floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "none" : "3 3"}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] font-semibold fill-slate-400"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Background Area Gradient under Trend Line */}
          {areaPath && (
            <path
              d={areaPath}
              fill={metric === "bookings" ? "url(#bookingsAreaGradient)" : "url(#revenueAreaGradient)"}
            />
          )}

          {/* Smooth Trend Spline Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={metric === "bookings" ? "url(#bookingsLineStroke)" : "url(#revenueLineStroke)"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
              className="pointer-events-none"
            />
          )}

          {/* Interactive Data Points & Hitboxes */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const isPeak = stats.peakValue > 0 && pt.val === stats.peakValue && pt.val > 0;
            const dotColor = metric === "bookings" ? "#000C7D" : "#059669";
            const pointFill = pt.d.isToday ? "#F59E0B" : dotColor;

            return (
              <g key={pt.d.dateKey} className="transition-all duration-150">
                {/* Peak Day Star Icon */}
                {isPeak && (
                  <g transform={`translate(${pt.x - 7}, ${pt.y - 20})`}>
                    <circle cx="7" cy="7" r="7" fill="#F59E0B" />
                    <polygon
                      points="7,2 8.5,5.5 12,5.5 9,8 10.2,11.5 7,9.2 3.8,11.5 5,8 2,5.5 5.5,5.5"
                      fill="#FFFFFF"
                    />
                  </g>
                )}

                {/* Circular Data Point on the Line */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : pt.d.isToday ? 4.5 : 3.5}
                  fill={isHovered ? "#FFFFFF" : pointFill}
                  stroke={isHovered ? pointFill : "#FFFFFF"}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 pointer-events-none drop-shadow-xs"
                />

                {/* Transparent Hover Hitbox across the entire day column */}
                <rect
                  x={pt.x - stepX / 2}
                  y={paddingTop}
                  width={stepX}
                  height={chartInnerHeight + paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* Interactive Hover Point & Guideline */}
          {activePoint && (
            <g className="pointer-events-none">
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + chartInnerHeight}
                stroke={metric === "bookings" ? "#000C7D" : "#059669"}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="7"
                fill={metric === "bookings" ? "#000C7D" : "#059669"}
                stroke="#FFFFFF"
                strokeWidth="3"
                className="drop-shadow-lg"
              />
            </g>
          )}

          {/* X-Axis Date Labels */}
          {points.map((pt, i) => {
            // Label density handling: on wide views show all if <= 16, else every 2nd
            const showLabel = count <= 16 || i % Math.ceil(count / 14) === 0 || i === count - 1;
            if (!showLabel) return null;

            const isHovered = hoveredIndex === i;

            return (
              <text
                key={pt.d.dateKey}
                x={pt.x}
                y={svgHeight - 10}
                textAnchor="middle"
                className={`text-[10px] transition-colors select-none ${
                  isHovered
                    ? "font-extrabold fill-[#000C7D]"
                    : pt.d.isToday
                    ? "font-extrabold fill-amber-600"
                    : "font-semibold fill-slate-400"
                }`}
              >
                {pt.d.labelShort}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Chart Footer Legend & Clarification */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={`w-4 h-1 rounded-full ${metric === "bookings" ? "bg-[#000C7D]" : "bg-emerald-600"}`}></span>
            <span>{metric === "bookings" ? "Daily Bookings Trend Line" : "Daily Revenue Trend Line"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white ring-1 ring-amber-300"></span>
            <span>Today&apos;s Point</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-flex items-center justify-center text-[7px] text-white">★</span>
            <span>Peak Activity</span>
          </span>
        </div>
        <span className="text-slate-400 text-[10px]">
          Times are aggregated in Philippine Standard Time (PST, UTC+8)
        </span>
      </div>
    </div>
  );
}
