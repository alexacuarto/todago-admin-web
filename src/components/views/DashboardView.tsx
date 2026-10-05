import { useState } from "react";
import { Driver, RideRequest } from "../../types";
import { normalizeToda, OfficialToda } from "../../lib/todaConstants";
import BookingsUsageTrendChart from "./BookingsUsageTrendChart";

interface DashboardViewProps {
  rideRequests: RideRequest[];
  drivers: Driver[];
  onlineDriversCount: number;
  activeDriversCount: number;
  totalEarnings: number;
  setActiveTab: (tab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings") => void;
  setActiveStatModal?: (modal: string | null) => void;
}

const money = (value: number) => `₱ ${value.toLocaleString()}`;

const statusClass = (status: RideRequest["status"]) => {
  if (status === "Completed") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
  if (status === "In Transit") return "bg-blue-50 text-blue-600 border border-blue-100";
  if (status === "Cancelled") return "bg-rose-50 text-rose-600 border border-rose-100";
  return "bg-amber-50 text-amber-600 border border-amber-100";
};

const TODA_PALETTE: Record<
  string,
  {
    fill: string;
    hover: string;
    stroke: string;
    dot: string;
    text: string;
    lightBg: string;
    border: string;
    badgeBg: string;
  }
> = {
  "BYPASS ILAYANG BAGUIO-TODA": {
    fill: "#0284C7",
    hover: "#0369A1",
    stroke: "#075985",
    dot: "bg-sky-600",
    text: "text-sky-600",
    lightBg: "bg-sky-50/60",
    border: "border-sky-300",
    badgeBg: "bg-sky-100 text-sky-700",
  },
  "CHOT-TODA": {
    fill: "#10B981",
    hover: "#059669",
    stroke: "#047857",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    lightBg: "bg-emerald-50/60",
    border: "border-emerald-300",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
};

const EXTRA_PALETTE = [
  {
    fill: "#F59E0B",
    hover: "#d97706",
    stroke: "#b45309",
    dot: "bg-amber-500",
    text: "text-amber-600",
    lightBg: "bg-amber-50/60",
    border: "border-amber-300",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  {
    fill: "#8B5CF6",
    hover: "#7c3aed",
    stroke: "#6d28d9",
    dot: "bg-purple-500",
    text: "text-purple-600",
    lightBg: "bg-purple-50/60",
    border: "border-purple-300",
    badgeBg: "bg-purple-100 text-purple-700",
  },
  {
    fill: "#EC4899",
    hover: "#db2777",
    stroke: "#be185d",
    dot: "bg-pink-500",
    text: "text-pink-600",
    lightBg: "bg-pink-50/60",
    border: "border-pink-300",
    badgeBg: "bg-pink-100 text-pink-700",
  },
];

function getTodaStyle(toda: string, index: number) {
  if (TODA_PALETTE[toda]) {
    return TODA_PALETTE[toda];
  }
  return EXTRA_PALETTE[index % EXTRA_PALETTE.length];
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const angleDiff = endAngle - startAngle;
  if (angleDiff >= 359.9) {
    return [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius}`,
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius}`,
      "Z",
    ].join(" ");
  }

  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = angleDiff <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export default function DashboardView({
  rideRequests,
  drivers,
  onlineDriversCount,
  activeDriversCount,
  totalEarnings,
  setActiveTab,
}: DashboardViewProps) {
  const [hoveredToda, setHoveredToda] = useState<string | null>(null);

  const baseTodaMap: Record<OfficialToda, { toda: OfficialToda; rides: number; total: number }> = {
    "BYPASS ILAYANG BAGUIO-TODA": { toda: "BYPASS ILAYANG BAGUIO-TODA", rides: 0, total: 0 },
    "CHOT-TODA": { toda: "CHOT-TODA", rides: 0, total: 0 },
  };

  rideRequests
    .filter((request) => request.status === "Completed")
    .forEach((request) => {
      const resolvedDriver = drivers.find(
        (d) =>
          d.id === request.driverId ||
          d.profileId === request.driverId ||
          (request.driver && d.name.toLowerCase() === request.driver.toLowerCase())
      );
      const rawToda = request.toda || resolvedDriver?.toda;
      const matchedToda = normalizeToda(rawToda);
      if (matchedToda && baseTodaMap[matchedToda]) {
        baseTodaMap[matchedToda].rides += 1;
        baseTodaMap[matchedToda].total += request.fare || 0;
      }
    });

  const todaEarnings = Object.values(baseTodaMap).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.toda.localeCompare(b.toda);
  });

  const todaSum = todaEarnings.reduce((sum, item) => sum + item.total, 0);
  const todaRidesSum = todaEarnings.reduce((sum, item) => sum + item.rides, 0);

  // Compute donut slices
  const nonZeroTodaCount = todaEarnings.filter((t) => t.total > 0).length;
  const sliceGap = nonZeroTodaCount > 1 ? 3 : 0; // 3-degree gap between slices

  let accumulatedAngle = 0;
  const todaDonutData = todaEarnings.map((record, idx) => {
    const share = todaSum > 0 ? record.total / todaSum : 0;
    const percentageStr = todaSum > 0 ? `${(share * 100).toFixed(1)}%` : "0.0%";
    const sliceAngle = share * 360;

    let startAngle = accumulatedAngle;
    let endAngle = accumulatedAngle + sliceAngle;

    if (sliceGap > 0 && sliceAngle > sliceGap) {
      startAngle += sliceGap / 2;
      endAngle -= sliceGap / 2;
    }

    accumulatedAngle += sliceAngle;

    const path =
      record.total > 0
        ? describeDonutSlice(100, 100, 52, 78, startAngle, endAngle)
        : "";

    return {
      toda: record.toda,
      rides: record.rides,
      total: record.total,
      share,
      percentageStr,
      startAngle,
      endAngle,
      path,
      style: getTodaStyle(record.toda, idx),
    };
  });

  const activeHoveredItem = todaDonutData.find((item) => item.toda === hoveredToda);

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Online Drivers</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#000C7D] mt-0.5">{onlineDriversCount}</span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Active Drivers</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#000C7D] mt-0.5">{activeDriversCount}</span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Total Earnings</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#000C7D] mt-0.5">{money(totalEarnings)}</span>
        </div>
      </div>

      {/* Daily Bookings Usage & Trend Graph (Option A) */}
      <BookingsUsageTrendChart rideRequests={rideRequests} />

      {/* Main Grid: Left Ride Requests, Right Driver Management & TODA Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Recent Ride Requests */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#000C7D] font-bold text-base">Recent Ride Request</h2>
              <button
                onClick={() => setActiveTab("ride-requests")}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="pb-2 pl-2">Passenger</th>
                    <th className="pb-2 px-2">Driver</th>
                    <th className="pb-2 px-2">Location</th>
                    <th className="pb-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold divide-y divide-slate-50">
                  {rideRequests.slice(0, 4).map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 pl-2 text-slate-700">{request.passenger}</td>
                      <td className="py-2.5 px-2 text-slate-600">{request.driver}</td>
                      <td className="py-2.5 px-2 text-slate-600 min-w-[200px]">
                        <p className="font-bold text-slate-800 leading-tight mb-0.5 truncate">{request.location}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {request.stops && request.stops.length > 0
                            ? `${request.totalStops || request.stops.length} stops (${request.stops[0].address.split(',')[0]}...)`
                            : request.destination}
                        </p>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rideRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                        No ride requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Driver Management & Compact Donut Graph */}
        <div className="flex flex-col gap-4">
          {/* Recent Driver Management */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#000C7D] font-bold text-base">Recent Driver Management</h2>
              <button
                onClick={() => setActiveTab("users")}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-b border-slate-50">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="pb-2 pl-2">Driver</th>
                    <th className="pb-2 px-2">TODA</th>
                    <th className="pb-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold divide-y divide-slate-50">
                  {drivers.slice(0, 4).map((driver) => (
                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 pl-2 text-slate-700">{driver.name}</td>
                      <td className="py-2.5 px-2 text-slate-600 max-w-[160px] truncate" title={driver.toda}>
                        {driver.toda}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.status === "Active"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {driver.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {drivers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                        No drivers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact TODA Earnings Donut Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-[#000C7D] font-bold text-base leading-tight">TODA Earnings Breakdown</h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Revenue: <span className="font-bold text-[#000C7D]">{money(todaSum)}</span> • {todaRidesSum} completed {todaRidesSum === 1 ? "ride" : "rides"}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("earnings")}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer shrink-0"
                >
                  View Details
                </button>
              </div>

              {/* Donut Chart & Legend in Compact Horizontal Alignment */}
              <div className="flex flex-row items-center gap-3.5 sm:gap-4 pt-1">
                {/* Compact Interactive SVG Donut Chart */}
                <div className="relative flex items-center justify-center w-28 h-28 sm:w-30 sm:h-30 shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs">
                    <defs>
                      <filter id="donutHoverGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.2" />
                      </filter>
                    </defs>

                    {/* Empty State Ring */}
                    {todaSum === 0 ? (
                      <path
                        d={describeDonutSlice(100, 100, 52, 78, 0, 359.99)}
                        fill="#F1F5F9"
                        stroke="#E2E8F0"
                        strokeWidth="1"
                      />
                    ) : (
                      // Render Donut Slices
                      todaDonutData.map((item) => {
                        if (item.total <= 0 || !item.path) return null;
                        const isHovered = hoveredToda === item.toda;
                        const isOtherHovered = hoveredToda !== null && !isHovered;

                        return (
                          <path
                            key={item.toda}
                            d={item.path}
                            fill={isHovered ? item.style.hover : item.style.fill}
                            stroke="#FFFFFF"
                            strokeWidth={isHovered ? "2.5" : "1.5"}
                            strokeLinejoin="round"
                            className="cursor-pointer transition-all duration-300 ease-out"
                            style={{
                              opacity: isOtherHovered ? 0.35 : 1,
                              transformOrigin: "100px 100px",
                              transform: isHovered ? "scale(1.03)" : "scale(1)",
                            }}
                            filter={isHovered ? "url(#donutHoverGlow)" : undefined}
                            onMouseEnter={() => setHoveredToda(item.toda)}
                            onMouseLeave={() => setHoveredToda(null)}
                          />
                        );
                      })
                    )}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none select-none">
                    {activeHoveredItem ? (
                      <>
                        <span
                          className="text-base sm:text-lg font-black tracking-tight leading-tight"
                          style={{ color: activeHoveredItem.style.hover || activeHoveredItem.style.fill }}
                        >
                          {money(activeHoveredItem.total)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-tight mt-0.5">
                          {activeHoveredItem.rides} {activeHoveredItem.rides === 1 ? "ride" : "rides"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-base sm:text-lg font-black text-[#000C7D] tracking-tight leading-tight">
                          {money(todaSum)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-tight mt-0.5">
                          {todaRidesSum} {todaRidesSum === 1 ? "ride" : "rides"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Compact Legend & Breakdown Cards */}
                <div className="flex-1 flex flex-col gap-1.5 w-full">
                  {todaDonutData.map((item) => {
                    const isHovered = hoveredToda === item.toda;
                    const isOtherHovered = hoveredToda !== null && !isHovered;

                    return (
                      <div
                        key={item.toda}
                        onMouseEnter={() => setHoveredToda(item.toda)}
                        onMouseLeave={() => setHoveredToda(null)}
                        style={isHovered ? { borderColor: item.style.fill } : undefined}
                        className={`py-1.5 px-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isHovered
                            ? `${item.style.lightBg} shadow-xs`
                            : isOtherHovered
                            ? "border-slate-100 bg-slate-50/40 opacity-60"
                            : "border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-200 ${
                                isHovered ? "scale-125 ring-2 ring-white" : ""
                              }`}
                              style={{ backgroundColor: item.style.fill }}
                            />
                            <span
                              className="font-bold text-slate-800 text-xs truncate max-w-[120px] sm:max-w-[145px]"
                              title={item.toda}
                            >
                              {item.toda}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              ({item.rides} {item.rides === 1 ? "ride" : "rides"})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${item.style.badgeBg}`}
                            >
                              {item.percentageStr}
                            </span>
                            <span className={`text-xs font-black ${item.style.text}`}>
                              {money(item.total)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full bg-slate-200/70 rounded-full h-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${item.share * 100}%`,
                              backgroundColor: item.style.fill,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Insight Footer */}
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                {todaSum === 0
                  ? "No completed rides recorded yet"
                  : todaDonutData[0] && todaDonutData[0].share > 0.5
                  ? `${todaDonutData[0].toda} leads with ${todaDonutData[0].percentageStr}`
                  : "Balanced earnings across associations"}
              </span>
              <span className="text-slate-400 text-[10px] shrink-0 ml-2">
                2 TODAs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
