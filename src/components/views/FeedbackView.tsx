import { useMemo, useState, useEffect } from "react";
import { FeedbackReport } from "../../types";
import { supabase } from "../../lib/supabase";
import { exportToExcel } from "../../lib/exportUtils";

interface FeedbackViewProps {
  reports: FeedbackReport[];
  onRefresh: () => Promise<void> | void;
}

export default function FeedbackView({ reports, onRefresh }: FeedbackViewProps) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "title-az" | "title-za" | "reporter-az">("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const typeOk = typeFilter === "All" || report.reportType === typeFilter;
      const statusNormalized = (report.status || "OPEN").toUpperCase();
      let statusOk = true;
      if (statusFilter === "PENDING") {
        statusOk = statusNormalized === "OPEN" || statusNormalized === "PENDING" || statusNormalized === "REVIEWING";
      } else if (statusFilter === "RESOLVED") {
        statusOk = statusNormalized === "RESOLVED";
      }

      const q = searchQuery.toLowerCase().trim();
      const searchOk =
        !q ||
        (report.title || "").toLowerCase().includes(q) ||
        (report.message || "").toLowerCase().includes(q) ||
        (report.reporterName || "").toLowerCase().includes(q) ||
        (report.driverName || "").toLowerCase().includes(q) ||
        (report.passengerName || "").toLowerCase().includes(q) ||
        (report.category || "").toLowerCase().includes(q);

      return typeOk && statusOk && searchOk;
    });
  }, [reports, typeFilter, statusFilter, searchQuery]);

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      if (sortOption === "latest") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortOption === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortOption === "title-az") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortOption === "title-za") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortOption === "reporter-az") {
        return (a.reporterName || "").localeCompare(b.reporterName || "");
      }
      return 0;
    });
  }, [filteredReports, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedReports.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, sortOption, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedReports.slice(start, start + PAGE_SIZE);
  }, [sortedReports, currentPage]);

  const updateReport = async (report: FeedbackReport, status = "RESOLVED") => {
    setSavingId(report.id);
    const adminNotesText = (notesById[report.id] ?? report.adminNotes ?? "").trim();

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          admin_notes: adminNotesText || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", report.id);
      if (error) throw error;

      // Automated notifications dispatched to Passenger and/or Driver
      const notificationsToInsert: any[] = [];

      // 1. Notify reporting user (passenger or driver)
      if (report.reporterProfileId) {
        notificationsToInsert.push({
          recipient_id: report.reporterProfileId,
          type: "in_app",
          title: "Feedback Resolved",
          body: adminNotesText
            ? `Admin response on "${report.title}": ${adminNotesText}`
            : `Your feedback "${report.title}" has been reviewed and resolved by administration.`,
          notification_category: "feedback",
          is_sent: true,
          is_read: false,
          data: {
            report_id: report.id,
            status,
            category: report.category,
            notes: adminNotesText,
          },
        });
      }

      // 2. Notify driver if involved and not the reporter
      if (report.driverProfileId && report.driverProfileId !== report.reporterProfileId && report.reportType === "DRIVER_FEEDBACK") {
        notificationsToInsert.push({
          recipient_id: report.driverProfileId,
          type: "in_app",
          title: "Trip Feedback Update",
          body: adminNotesText
            ? `Admin note regarding feedback on your ride: ${adminNotesText}`
            : `A trip feedback report has been reviewed and marked as resolved by administration.`,
          notification_category: "feedback",
          is_sent: true,
          is_read: false,
          data: {
            report_id: report.id,
            status,
            notes: adminNotesText,
          },
        });
      }

      if (notificationsToInsert.length > 0) {
        console.log("[Supabase Query] Sending in-app notifications for feedback resolution:", notificationsToInsert);
        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notificationsToInsert);
        if (notifError) {
          console.warn("[Supabase Warning] Notification insert warning:", notifError.message);
        }
      }

      alert("Feedback saved and notification sent successfully!");
      await onRefresh();
    } catch (err: any) {
      console.error("[Supabase Error] Updating feedback report:", err);
      alert(err.message || "Failed to update feedback report.");
    } finally {
      setSavingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Report ID",
      "Report Type",
      "Category",
      "Title",
      "Message",
      "Reporter Name",
      "Reporter Role",
      "Target Driver",
      "Target Passenger",
      "Route",
      "Status",
      "Admin Notes",
      "Created At",
      "Updated At",
    ];

    const rows = sortedReports.map((report) => {
      const isDriverReporter = report.reporterRole === "driver";
      return [
        report.id,
        report.reportType === "DRIVER_FEEDBACK"
          ? "Driver Feedback"
          : report.reportType === "PASSENGER_FEEDBACK"
            ? "Passenger Feedback"
            : "App Feedback",
        report.category || "General",
        report.title,
        report.message,
        report.reporterName || "Unknown User",
        isDriverReporter ? "Driver" : "Passenger",
        report.driverName || "",
        report.passengerName || "",
        report.route || "",
        report.status || "PENDING",
        (notesById[report.id] ?? report.adminNotes ?? "").trim(),
        report.createdAt ? new Date(report.createdAt).toLocaleString() : "",
        report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "",
      ];
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filterSuffix = typeFilter === "All" ? "all" : typeFilter.toLowerCase();
    exportToExcel(`todago_feedback_${filterSuffix}_${dateStr}`, headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000C7D]">Feedback</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {sortedReports.length} {sortedReports.length === 1 ? "report" : "reports"} · Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-hidden focus:border-[#000C7D] transition-all text-[#000C7D] bg-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white outline-hidden focus:border-[#000C7D] cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="APP_FEEDBACK">App Feedback</option>
            <option value="DRIVER_FEEDBACK">Driver Feedback</option>
            <option value="PASSENGER_FEEDBACK">Passenger Feedback</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white outline-hidden focus:border-[#000C7D] cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending / Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Sort Filter */}
          <div className="relative min-w-[155px]">
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as any)}
              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
            >
              <option value="latest">Sort: Latest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="title-az">Sort: Title (A – Z)</option>
              <option value="title-za">Sort: Title (Z – A)</option>
              <option value="reporter-az">Sort: Reporter (A – Z)</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            title="Download CSV export of feedback reports"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
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

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400">
          <div className="col-span-4">Report Details</div>
          <div className="col-span-2">Reporter</div>
          <div className="col-span-2">Feedback Target</div>
          <div className="col-span-4 text-right">Action & Notes</div>
        </div>
        {displayedReports.map((report) => {
          const isDriverReporter = report.reporterRole === "driver";
          return (
            <div key={report.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-t border-slate-100 text-sm items-start">
              {/* Col 1: Report Details */}
              <div className="col-span-12 md:col-span-4">
                <p className="font-extrabold text-slate-800">{report.title}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {report.category || "General"} · {new Date(report.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {report.message}
                </p>
              </div>

              {/* Col 2: Reporter */}
              <div className="col-span-6 md:col-span-2 font-bold text-slate-700">
                <p className="text-[#000C7D] font-extrabold">{report.reporterName || "Unknown User"}</p>
                <div className="mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDriverReporter
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}
                  >
                    {isDriverReporter ? "🚗 Driver" : "👤 Passenger"}
                  </span>
                </div>
              </div>

              {/* Col 3: Feedback Target */}
              <div className="col-span-6 md:col-span-2">
                {report.reportType === "APP_FEEDBACK" && (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      📱 App
                    </span>
                  </div>
                )}
                {report.reportType === "DRIVER_FEEDBACK" && (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      🚗 Driver
                    </span>
                    {report.driverName && (
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Target Driver:</span>
                        {report.driverName}
                      </p>
                    )}
                  </div>
                )}
                {report.reportType === "PASSENGER_FEEDBACK" && (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                      👤 Passenger
                    </span>
                    {report.passengerName && (
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Target Passenger:</span>
                        {report.passengerName}
                      </p>
                    )}
                  </div>
                )}
                {report.route && (
                  <p className="text-[10px] text-slate-500 font-medium mt-1.5 line-clamp-2" title={report.route}>
                    📍 {report.route}
                  </p>
                )}
              </div>

              {/* Col 4: Action & Notes */}
              <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                <textarea
                  rows={2}
                  value={notesById[report.id] ?? report.adminNotes ?? ""}
                  onChange={(event) => setNotesById((current) => ({ ...current, [report.id]: event.target.value }))}
                  placeholder="Enter admin response or resolution notes..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 resize-none outline-hidden focus:border-[#000C7D]"
                />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {report.adminNotes && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>✓</span> Notes Saved
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => updateReport(report, "RESOLVED")}
                    disabled={savingId === report.id}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{savingId === report.id ? "Sending..." : "Done & Notify"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {displayedReports.length === 0 && (
          <div className="px-5 py-12 text-center text-sm font-semibold text-slate-400">No feedback reports found.</div>
        )}

        {/* Pagination Controls */}
        {sortedReports.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-400">
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold text-slate-700">{Math.min(currentPage * PAGE_SIZE, sortedReports.length)}</span> of{" "}
              <span className="font-bold text-slate-700">{sortedReports.length}</span> reports (Page {currentPage} of {totalPages})
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all bg-white"
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
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100 bg-white"
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
