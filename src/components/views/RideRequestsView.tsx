import React from "react";
import { RideRequest } from "../../types";
import { exportToExcel } from "../../lib/exportUtils";

interface RideRequestsViewProps {
  filteredRequests: RideRequest[];
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  requestSearch: string;
  setRequestSearch: (val: string) => void;
  setViewingRequest: (val: RideRequest | null) => void;
  setShowViewRequestModal: (val: boolean) => void;
}

const pageSize = 6;

const statusClass = (status: RideRequest["status"]) => {
  if (status === "Completed") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
  if (status === "In Transit") return "bg-blue-50 text-blue-600 border border-blue-100";
  if (status === "Pending") return "bg-amber-100 text-amber-600 border border-amber-200";
  if (status === "Awaiting Payment" || status === "Payment Confirmation") return "bg-amber-50 text-amber-800 border border-amber-200";
  if (status === "Scheduled") return "bg-indigo-50 text-indigo-600 border border-indigo-100";
  return "bg-rose-50 text-rose-600 border border-rose-100";
};

export default function RideRequestsView({
  filteredRequests,
  statusFilter,
  setStatusFilter,
  requestSearch,
  setRequestSearch,
  setViewingRequest,
  setShowViewRequestModal,
}: RideRequestsViewProps) {
  const [page, setPage] = React.useState(1);
  const [sortOrder, setSortOrder] = React.useState<"latest" | "oldest">("latest");

  // Always default to latest ride requests first (descending), or oldest if selected
  const sortedRequests = React.useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      const timeA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const timeB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
      return sortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  }, [filteredRequests, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(sortedRequests.length / pageSize));
  const displayedRequests = sortedRequests.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, requestSearch, sortOrder]);

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleExportExcel = () => {
    const headers = [
      "Request ID",
      "Trip Type",
      "Stops Count",
      "Passenger",
      "Driver",
      "TODA",
      "Stops List",
      "Pickup Address",
      "Dropoff Address",
      "Fare (PHP)",
      "Status",
      "Time",
      "Requested At",
      "Cancelled By",
      "Cancel Reason",
    ];
    const rows = sortedRequests.map((r) => {
      const isSpecial = r.tripType?.toLowerCase().includes("special") || (r.stops && r.stops.length > 0) || (r.totalStops != null && r.totalStops > 1);
      const stopsCount = r.stops?.length || r.totalStops || (isSpecial ? 1 : 1);
      const tripTypeLabel = isSpecial ? "Special Trip" : (r.tripType || "One Way");
      const stopsListStr = r.stops && r.stops.length > 0
        ? r.stops.map((s, i) => `Stop ${s.stop_number || i + 1}: ${s.address}`).join(" | ")
        : (r.destination || "");
      return [
        r.id,
        tripTypeLabel,
        stopsCount,
        r.passenger,
        r.driver,
        r.toda || "Unassigned",
        stopsListStr,
        r.location,
        r.destination,
        `₱${r.fare.toLocaleString()}`,
        r.status,
        r.time,
        r.requestedAt || "",
        r.cancelled_by || "",
        r.cancel_reason || "",
      ];
    });
    const dateStr = new Date().toISOString().split("T")[0];
    exportToExcel(`todago_ride_requests_${dateStr}`, headers, rows);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#000C7D] font-bold text-xl">Ride Requests</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">{filteredRequests.length} records from Supabase</p>
          </div>

          <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
              {["All", "Ongoing", "Pending", "Completed", "Cancelled"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab
                      ? "bg-[#000C7D] text-white shadow-sm"
                      : "text-slate-600 hover:text-[#000C7D]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative min-w-[145px]">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "latest" | "oldest")}
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
              >
                <option value="latest">Sort: Latest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
              <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <div className="w-full sm:w-56 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search rides"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-hidden focus:border-[#000C7D] transition-all text-[#000C7D]"
              />
            </div>

            <button
              onClick={handleExportExcel}
              title="Download Excel spreadsheet of filtered ride requests"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-3">Passenger</th>
                <th className="pb-3 px-3">Driver</th>
                <th className="pb-3 px-3">Route</th>
                <th className="pb-3 px-3">Fare</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 text-center pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-slate-50">
              {displayedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 pl-3 text-[#000C7D] font-bold">{request.passenger}</td>
                  <td className="py-5 px-3 text-slate-700">{request.driver}</td>
                  <td className="py-5 px-3 text-slate-600 min-w-[280px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-slate-800">{request.location}</p>
                      {(request.tripType?.toLowerCase().includes("special") || (request.stops && request.stops.length > 0) || (request.totalStops != null && request.totalStops > 1)) && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-extrabold whitespace-nowrap">
                          Special ({request.totalStops || request.stops?.length || 1} stops)
                        </span>
                      )}
                    </div>
                    {request.stops && request.stops.length > 0 ? (
                      <p
                        className="text-xs text-slate-500 font-medium line-clamp-2"
                        title={request.stops.map((s, i) => `Stop ${s.stop_number || i + 1}: ${s.address}`).join("\n")}
                      >
                        <span className="text-slate-400 font-normal">Via {request.stops.length} stops: </span>
                        {request.stops.map((s) => s.address.split(",")[0].trim()).join(" → ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {request.totalStops && request.totalStops > 1
                          ? `Special Trip (${request.totalStops} stops) → ${request.destination}`
                          : request.destination}
                      </p>
                    )}
                  </td>
                  <td className="py-5 px-3 text-[#000C7D] font-extrabold">₱{request.fare.toLocaleString()}</td>
                  <td className="py-5 px-3">
                    <span className={`inline-block px-4 py-1 rounded-full text-[10px] font-bold ${statusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-5 text-center pr-3">
                    <button
                      onClick={() => {
                        setViewingRequest(request);
                        setShowViewRequestModal(true);
                      }}
                      className="px-5 py-2 bg-[#4c75f2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {sortedRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                    No requests found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedRequests.length > pageSize && (
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400">
              Page {page} of {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page === pageCount}
                className="px-4 py-2 bg-[#000C7D] rounded-lg text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
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
