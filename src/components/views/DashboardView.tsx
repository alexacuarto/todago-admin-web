import { Driver, RideRequest } from "../../types";
import { normalizeToda, OfficialToda } from "../../lib/todaConstants";

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

const TODA_PALETTE: Record<string, { fill: string; hover: string; stroke: string; dot: string; text: string }> = {
  "LHITC-TODA": {
    fill: "#000C7D",
    hover: "#001099",
    stroke: "#000852",
    dot: "bg-[#000C7D]",
    text: "text-[#000C7D]",
  },
  "BYPASS ILAYANG BAGUIO-TODA": {
    fill: "#0284C7",
    hover: "#0ea5e9",
    stroke: "#0369A1",
    dot: "bg-sky-600",
    text: "text-sky-600",
  },
  "CHOT-TODA": {
    fill: "#10B981",
    hover: "#34d399",
    stroke: "#059669",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
  },
};

const EXTRA_PALETTE = [
  { fill: "#F59E0B", hover: "#fbbf24", stroke: "#d97706", dot: "bg-amber-500", text: "text-amber-600" },
  { fill: "#8B5CF6", hover: "#a78bfa", stroke: "#7c3aed", dot: "bg-purple-500", text: "text-purple-600" },
  { fill: "#EC4899", hover: "#f472b6", stroke: "#db2777", dot: "bg-pink-500", text: "text-pink-600" },
];

function getTodaStyle(toda: string, index: number) {
  if (TODA_PALETTE[toda]) {
    return TODA_PALETTE[toda];
  }
  return EXTRA_PALETTE[index % EXTRA_PALETTE.length];
}



export default function DashboardView({
  rideRequests,
  drivers,
  onlineDriversCount,
  activeDriversCount,
  totalEarnings,
  setActiveTab,
}: DashboardViewProps) {
  const baseTodaMap: Record<OfficialToda, { toda: OfficialToda; rides: number; total: number }> = {
    "BYPASS ILAYANG BAGUIO-TODA": { toda: "BYPASS ILAYANG BAGUIO-TODA", rides: 0, total: 0 },
    "CHOT-TODA": { toda: "CHOT-TODA", rides: 0, total: 0 },
    "LHITC-TODA": { toda: "LHITC-TODA", rides: 0, total: 0 },
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
      const matchedToda = normalizeToda(rawToda) || "LHITC-TODA";
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
  const maxEarning = Math.max(...todaEarnings.map((t) => t.total), 0);

  const todaBars = todaEarnings.map((record, idx) => {
    const share = todaSum > 0 ? record.total / todaSum : 0;
    const percentageStr = todaSum > 0 ? `${(share * 100).toFixed(1)}%` : "0.0%";
    const barWidthPercent = maxEarning > 0 ? (record.total / maxEarning) * 100 : 0;

    return {
      toda: record.toda,
      rides: record.rides,
      total: record.total,
      share,
      percentageStr,
      barWidthPercent,
      style: getTodaStyle(record.toda, idx),
    };
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Online Drivers</span>
          <span className="text-3xl font-extrabold text-[#000C7D] mt-1">{onlineDriversCount}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Drivers</span>
          <span className="text-3xl font-extrabold text-[#000C7D] mt-1">{activeDriversCount}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Earnings</span>
          <span className="text-3xl font-extrabold text-[#000C7D] mt-1">{money(totalEarnings)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#000C7D] font-bold text-lg">Recent Ride Request</h2>
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
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-3">Passenger</th>
                  <th className="pb-3 px-3">Driver</th>
                  <th className="pb-3 px-3">Location</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold divide-y divide-slate-50">
                {rideRequests.slice(0, 4).map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 pl-3 text-slate-700">{request.passenger}</td>
                    <td className="py-3.5 px-3 text-slate-600">{request.driver}</td>
                    <td className="py-3.5 px-3 text-slate-600 min-w-[220px]">
                      <p className="font-bold text-slate-800 mb-0.5">{request.location}</p>
                      <p className="text-xs text-slate-400">
                        {request.stops && request.stops.length > 0
                          ? `${request.totalStops || request.stops.length} stops (${request.stops[0].address.split(',')[0]}...)`
                          : request.destination}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {rideRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                      No ride requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#000C7D] font-bold text-lg">Recent Driver Management</h2>
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
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-3">Driver</th>
                    <th className="pb-3 px-3">TODA</th>
                    <th className="pb-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold divide-y divide-slate-50">
                  {drivers.slice(0, 4).map((driver) => (
                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pl-3 text-slate-700">{driver.name}</td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-[180px] truncate" title={driver.toda}>
                        {driver.toda}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td colSpan={3} className="py-10 text-center text-slate-400 font-medium">
                        No drivers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[#000C7D] font-bold text-lg">TODA Earnings Breakdown</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
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

              {/* Compact Horizontal Bar Chart */}
              <div className="flex flex-col gap-2.5 mt-2">
                {todaBars.map((item) => (
                  <div key={item.toda} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.style.fill }}
                        />
                        <span className="font-bold text-slate-700 text-xs truncate" title={item.toda}>
                          {item.toda}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          ({item.rides} {item.rides === 1 ? "ride" : "rides"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.percentageStr}
                        </span>
                        <span className={`text-xs font-bold ${item.style.text}`}>
                          {money(item.total)}
                        </span>
                      </div>
                    </div>

                    {/* Compact Bar Track */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${item.barWidthPercent}%`,
                          backgroundColor: item.style.fill,
                          minWidth: item.total > 0 ? "6px" : "0px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtle Scale at bottom */}
            <div className="pt-2.5 mt-3 border-t border-slate-100 flex justify-between text-[10px] font-medium text-slate-400">
              <span>₱0 (0%)</span>
              <span>50%</span>
              <span>{maxEarning > 0 ? money(maxEarning) : "100%"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
