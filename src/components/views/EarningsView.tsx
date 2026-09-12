import { useState, useMemo, useEffect } from "react";
import { Driver, RideRequest } from "../../types";
import { OFFICIAL_TODAS, normalizeToda, OfficialToda } from "../../lib/todaConstants";
import { exportToExcel } from "../../lib/exportUtils";

interface EarningsViewProps {
  drivers: Driver[];
  rideRequests: RideRequest[];
  earningsTodaFilter: string;
  setEarningsTodaFilter: (val: string) => void;
  setActiveTab?: (tab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings") => void;
}

const money = (value: number) => `₱${value.toLocaleString()}`;

export default function EarningsView({
  drivers,
  rideRequests,
  earningsTodaFilter,
  setEarningsTodaFilter,
  setActiveTab,
}: EarningsViewProps) {
  const todaOptions = [...OFFICIAL_TODAS];

  const completedRequests = rideRequests.filter((request) => request.status === "Completed");
  const visibleRequests = earningsTodaFilter === "All"
    ? completedRequests
    : completedRequests.filter((request) => {
        const resolvedDriver = drivers.find(
          (d) => d.id === request.driverId || d.profileId === request.driverId || (request.driver && d.name === request.driver)
        );
        const toda = normalizeToda(request.toda || resolvedDriver?.toda) || "LHITC-TODA";
        return toda === earningsTodaFilter;
      });

  const total = visibleRequests.reduce((sum, request) => sum + (request.fare || 0), 0);
  const totalRides = visibleRequests.length;

  const baseTodaTotals: Record<OfficialToda, { toda: OfficialToda; rides: number; total: number }> = {
    "BYPASS ILAYANG BAGUIO-TODA": { toda: "BYPASS ILAYANG BAGUIO-TODA", rides: 0, total: 0 },
    "CHOT-TODA": { toda: "CHOT-TODA", rides: 0, total: 0 },
    "LHITC-TODA": { toda: "LHITC-TODA", rides: 0, total: 0 },
  };

  completedRequests.forEach((request) => {
    const resolvedDriver = drivers.find(
      (d) => d.id === request.driverId || d.profileId === request.driverId || (request.driver && d.name === request.driver)
    );
    const toda = normalizeToda(request.toda || resolvedDriver?.toda) || "LHITC-TODA";
    if (toda && baseTodaTotals[toda]) {
      baseTodaTotals[toda].rides += 1;
      baseTodaTotals[toda].total += request.fare || 0;
    }
  });

  const todaTotals = Object.values(baseTodaTotals).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.toda.localeCompare(b.toda);
  });

  const [sortOption, setSortOption] = useState<"az" | "za" | "highest" | "lowest" | "most-rides">("az");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 7;

  const driverRows = useMemo(() => {
    return Object.values(
      visibleRequests.reduce<Record<string, {
        driverId: string;
        driver: string;
        toda: string;
        rides: number;
        total: number;
        driverExists: boolean;
        plateNumber?: string;
      }>>((groups, request) => {
        const resolvedDriver = drivers.find(
          (d) => d.id === request.driverId || d.profileId === request.driverId || (request.driver && d.name === request.driver)
        );
        const driverName = (request.driver && request.driver !== "Not provided" && request.driver !== "Unassigned" && request.driver !== "Assigned Driver")
          ? request.driver
          : resolvedDriver?.name || (request.driverId ? `Driver (${request.driverId.slice(0, 6)})` : "Unassigned");
        const toda = normalizeToda(request.toda || resolvedDriver?.toda) || "LHITC-TODA";

        const key = request.driverId || driverName;
        groups[key] ??= {
          driverId: request.driverId || "",
          driver: driverName,
          toda,
          rides: 0,
          total: 0,
          driverExists: !!resolvedDriver,
          plateNumber: resolvedDriver?.plateNumber,
        };
        groups[key].rides += 1;
        groups[key].total += request.fare || 0;
        return groups;
      }, {})
    );
  }, [visibleRequests, drivers]);

  const sortedDriverRows = useMemo(() => {
    return [...driverRows].sort((a, b) => {
      if (sortOption === "az") {
        return a.driver.localeCompare(b.driver);
      }
      if (sortOption === "za") {
        return b.driver.localeCompare(a.driver);
      }
      if (sortOption === "highest") {
        return b.total - a.total;
      }
      if (sortOption === "lowest") {
        return a.total - b.total;
      }
      if (sortOption === "most-rides") {
        return b.rides - a.rides;
      }
      return a.driver.localeCompare(b.driver);
    });
  }, [driverRows, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedDriverRows.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [earningsTodaFilter, sortOption]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedDriverRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedDriverRows.slice(start, start + PAGE_SIZE);
  }, [sortedDriverRows, currentPage]);

  const handleExportCsv = () => {
    const headers = [
      "Driver Name",
      "Plate Number",
      "Driver ID",
      "TODA",
      "Completed Rides",
      "Total Earnings (PHP)",
    ];

    const rows = sortedDriverRows.map((record) => [
      record.driver,
      record.plateNumber || "N/A",
      record.driverId || "N/A",
      record.toda,
      record.rides,
      record.total,
    ]);

    rows.push([
      "TOTAL / SUMMARY",
      "",
      "",
      earningsTodaFilter === "All" ? "All TODAs" : earningsTodaFilter,
      totalRides,
      total,
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    const filterSuffix = earningsTodaFilter.replace(/\s+/g, "_").toLowerCase();
    exportToExcel(`todago_earnings_${filterSuffix}_${dateStr}`, headers, rows);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selected Total</p>
          <p className="text-3xl font-extrabold text-[#000C7D] mt-2">{money(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed Rides</p>
          <p className="text-3xl font-extrabold text-[#000C7D] mt-2">{totalRides}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">TODA Coverage</p>
          <p className="text-3xl font-extrabold text-[#000C7D] mt-2">{todaTotals.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-[#000C7D] font-bold text-xl">Earnings Breakdown</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              {sortedDriverRows.length} {sortedDriverRows.length === 1 ? "driver" : "drivers"} · Page {currentPage} of {totalPages}
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <select
                value={earningsTodaFilter}
                onChange={(event) => setEarningsTodaFilter(event.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
              >
                <option value="All">All TODAs</option>
                {todaOptions.map((toda) => (
                  <option key={toda} value={toda}>
                    {toda}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <div className="relative w-full sm:w-52">
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as any)}
                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
              >
                <option value="az">Sort: Name (A – Z)</option>
                <option value="za">Sort: Name (Z – A)</option>
                <option value="highest">Sort: Highest Earnings</option>
                <option value="lowest">Sort: Lowest Earnings</option>
                <option value="most-rides">Sort: Most Rides</option>
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <button
              onClick={handleExportCsv}
              title="Download CSV export of earnings breakdown"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {earningsTodaFilter === "All" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {todaTotals.map((record) => (
              <div key={record.toda} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <p className="text-sm font-bold text-[#000C7D] truncate" title={record.toda}>{record.toda}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">{record.rides} completed rides</p>
                <p className="text-xl font-extrabold text-slate-800 mt-3">{money(record.total)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-3">Driver</th>
                <th className="pb-3 px-3">TODA</th>
                <th className="pb-3 px-3">Completed Rides</th>
                <th className="pb-3 px-3 text-right">Total Earnings</th>
                <th className="pb-3 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-slate-50">
              {displayedDriverRows.map((record) => (
                <tr key={`${record.toda}-${record.driver}-${record.driverId}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 pl-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[#000C7D] font-bold">{record.driver}</span>
                        {!record.driverExists && record.driverId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Unlinked / Deleted Driver
                          </span>
                        )}
                      </div>
                      {record.driverId && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          ID: {record.driverId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-slate-600 max-w-[220px] truncate" title={record.toda}>
                    {record.toda}
                  </td>
                  <td className="py-4 px-3 text-slate-700">{record.rides}</td>
                  <td className="py-4 px-3 text-right text-[#000C7D] font-extrabold">{money(record.total)}</td>
                  <td className="py-4 pr-3 text-right">
                    {!record.driverExists ? (
                      <button
                        onClick={() => setActiveTab && setActiveTab("ride-requests")}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        title="Delete this ride in Ride Requests"
                      >
                        Delete in Ride Requests →
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab && setActiveTab("users")}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                        title="View this driver in Users Management"
                      >
                        View in Users →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {displayedDriverRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No completed earnings found for the selected TODA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {sortedDriverRows.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400">
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold text-slate-700">{Math.min(currentPage * PAGE_SIZE, sortedDriverRows.length)}</span> of{" "}
              <span className="font-bold text-slate-700">{sortedDriverRows.length}</span> drivers (Page {currentPage} of {totalPages})
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (totalPages > 6 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                  if (Math.abs(p - currentPage) === 3) {
                    return <span key={p} className="text-xs text-slate-400 px-1">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === p
                        ? "bg-[#000C7D] text-white shadow-xs"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 bg-[#000C7D] rounded-lg text-xs font-bold text-white hover:bg-[#111c80] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
