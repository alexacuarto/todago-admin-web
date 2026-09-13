import React from "react";
import { AdminAccount, Driver, DriverProfileChangeRequest, Passenger } from "../../types";
import { getActivityBadgeClasses } from "../../lib/driverActivity";
import { exportToExcel, formatMinutes } from "../../lib/exportUtils";
import AdminManagementView from "./AdminManagementView";

interface UsersViewProps {
  filteredDrivers: Driver[];
  filteredPassengers: Passenger[];
  driverChangeRequests?: DriverProfileChangeRequest[];
  drivers?: Driver[];
  driverSearch: string;
  setDriverSearch: (val: string) => void;
  userTodaFilter: string;
  setUserTodaFilter: (val: string) => void;
  usersSubTab: "drivers" | "passengers" | "requests" | "admins";
  setUsersSubTab?: (val: "drivers" | "passengers" | "requests" | "admins") => void;
  setViewingUser: (val: Driver | Passenger | null) => void;
  setViewingUserType: (val: "driver" | "passenger" | null) => void;
  setShowViewUserModal: (val: boolean) => void;
  onReviewChangeRequest?: (requestId: string, status: "APPROVED" | "REJECTED", reason?: string) => Promise<void> | void;
  // Admin Management props
  adminAccounts?: AdminAccount[];
  newAdminForm?: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  setNewAdminForm?: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
      password: string;
    }>
  >;
  isCreatingAdmin?: boolean;
  activeAdminActionId?: string;
  onCreateAdmin?: (event: React.FormEvent) => void;
  onUpdateAdmin?: (
    account: AdminAccount,
    updates: { name: string; email: string; phone: string; password?: string },
  ) => Promise<boolean>;
  onDeleteAdmin?: (account: AdminAccount) => Promise<boolean>;
}

type UserSortOption = "newest" | "oldest" | "name-asc" | "name-desc";
type RequestStatusOption = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ApprovalFilterOption = "ALL" | "PENDING" | "VERIFIED";

const pageSize = 5;

const Pagination = ({
  page,
  pageCount,
  total,
  label,
  setPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  label: string;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) => {
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-400">
        Page {page} of {pageCount} · {total} {label}
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
  );
};

const fieldLabel = (fieldName: string) => {
  switch (fieldName) {
    case "full_name":
      return "Full Name";
    case "toda_association":
    case "toda":
      return "TODA Association";
    case "license_number":
      return "License Number";
    case "license_expiry_date":
      return "License Expiry Date";
    case "plate_number":
    case "plate":
      return "Plate Number";
    case "phone_number":
      return "Phone Number";
    case "franchise_number":
      return "Franchise Number";
    case "franchise_expiry_date":
      return "Franchise Expiry Date";
    case "license_front_url":
      return "License Front Photo";
    case "license_back_url":
      return "License Back Photo";
    case "franchise_url":
      return "Franchise Photo";
    case "franchise_back_url":
      return "Franchise Back Photo";
    default:
      return fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const requestBadge = (status: string) => {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function UsersView({
  filteredDrivers,
  filteredPassengers,
  driverChangeRequests = [],
  drivers = [],
  driverSearch,
  setDriverSearch,
  userTodaFilter,
  setUserTodaFilter,
  usersSubTab,
  setUsersSubTab,
  setViewingUser,
  setViewingUserType,
  setShowViewUserModal,
  onReviewChangeRequest,
  adminAccounts = [],
  newAdminForm = { name: "", email: "", phone: "", password: "" },
  setNewAdminForm = (() => { }) as any,
  isCreatingAdmin = false,
  activeAdminActionId = "",
  onCreateAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
}: UsersViewProps) {
  const [driverPage, setDriverPage] = React.useState(1);
  const [passengerPage, setPassengerPage] = React.useState(1);
  const [requestPage, setRequestPage] = React.useState(1);
  const [userSort, setUserSort] = React.useState<UserSortOption>("newest");
  const [requestStatusFilter, setRequestStatusFilter] = React.useState<RequestStatusOption>("ALL");
  const [driverApprovalFilter, setDriverApprovalFilter] = React.useState<ApprovalFilterOption>("ALL");
  const [passengerApprovalFilter, setPassengerApprovalFilter] = React.useState<ApprovalFilterOption>("ALL");
  const [rejectingRequestId, setRejectingRequestId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const pendingRequestsCount = React.useMemo(() => {
    return driverChangeRequests.filter((r) => r.status === "PENDING").length;
  }, [driverChangeRequests]);

  const pendingDriversCount = React.useMemo(() => {
    const list = drivers.length > 0 ? drivers : filteredDrivers;
    return list.filter((d) => (d.documentStatus || "PENDING") === "PENDING").length;
  }, [drivers, filteredDrivers]);

  const pendingPassengersCount = React.useMemo(() => {
    return filteredPassengers.filter(
      (p) => p.discountDocumentStatus === "PENDING" || p.status === "For Approval"
    ).length;
  }, [filteredPassengers]);

  const getUserTimestamp = (user: { createdAt?: string | null; created_at?: string | null; joinedDate?: string | null }) => {
    const raw = user.createdAt || user.created_at || user.joinedDate;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  // Sort drivers based on selected sorting option
  const sortedDrivers = React.useMemo(() => {
    let list = filteredDrivers;
    if (driverApprovalFilter === "PENDING") {
      list = list.filter((d) => (d.documentStatus || "PENDING") === "PENDING");
    } else if (driverApprovalFilter === "VERIFIED") {
      list = list.filter((d) => d.documentStatus === "VERIFIED");
    }

    return [...list].sort((a, b) => {
      if (userSort === "newest") {
        const timeDiff = getUserTimestamp(b) - getUserTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || "").localeCompare(a.id || "");
      }
      if (userSort === "oldest") {
        const timeDiff = getUserTimestamp(a) - getUserTimestamp(b);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || "").localeCompare(b.id || "");
      }
      if (userSort === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (userSort === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [filteredDrivers, driverApprovalFilter, userSort]);

  // Sort passengers based on selected sorting option
  const sortedPassengers = React.useMemo(() => {
    let list = filteredPassengers;
    if (passengerApprovalFilter === "PENDING") {
      list = list.filter(
        (p) => p.discountDocumentStatus === "PENDING" || p.status === "For Approval"
      );
    } else if (passengerApprovalFilter === "VERIFIED") {
      list = list.filter((p) => p.discountDocumentStatus === "VERIFIED");
    }

    return [...list].sort((a, b) => {
      if (userSort === "newest") {
        const timeDiff = getUserTimestamp(b) - getUserTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || "").localeCompare(a.id || "");
      }
      if (userSort === "oldest") {
        const timeDiff = getUserTimestamp(a) - getUserTimestamp(b);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || "").localeCompare(b.id || "");
      }
      if (userSort === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (userSort === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [filteredPassengers, passengerApprovalFilter, userSort]);

  // Filter & sort change requests
  const sortedRequests = React.useMemo(() => {
    const allDrivers = drivers.length > 0 ? drivers : filteredDrivers;
    return [...driverChangeRequests]
      .filter((req) => {
        const matchedDriver = allDrivers.find(
          (d) => d.id === req.driverId || d.profileId === req.profileId
        );
        const searchLower = driverSearch.toLowerCase();
        const matchesSearch =
          !driverSearch ||
          (matchedDriver?.name || "").toLowerCase().includes(searchLower) ||
          (matchedDriver?.phone || "").toLowerCase().includes(searchLower) ||
          req.fieldName.toLowerCase().includes(searchLower) ||
          req.requestedValue.toLowerCase().includes(searchLower);

        const matchesStatus = requestStatusFilter === "ALL" || req.status === requestStatusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        const validA = Number.isFinite(timeA) ? timeA : 0;
        const validB = Number.isFinite(timeB) ? timeB : 0;
        if (userSort === "oldest") {
          return validA - validB;
        }
        return validB - validA;
      });
  }, [driverChangeRequests, drivers, filteredDrivers, driverSearch, requestStatusFilter, userSort]);

  const driverPageCount = Math.max(1, Math.ceil(sortedDrivers.length / pageSize));
  const passengerPageCount = Math.max(1, Math.ceil(sortedPassengers.length / pageSize));
  const requestPageCount = Math.max(1, Math.ceil(sortedRequests.length / pageSize));

  const displayedDrivers = sortedDrivers.slice((driverPage - 1) * pageSize, driverPage * pageSize);
  const displayedPassengers = sortedPassengers.slice((passengerPage - 1) * pageSize, passengerPage * pageSize);
  const displayedRequests = sortedRequests.slice((requestPage - 1) * pageSize, requestPage * pageSize);

  const todaOptions = Array.from(new Set(filteredDrivers.map((driver) => driver.toda).filter(Boolean))).sort();

  React.useEffect(() => {
    setDriverPage(1);
    setPassengerPage(1);
    setRequestPage(1);
  }, [driverSearch, userTodaFilter, usersSubTab, userSort, requestStatusFilter, driverApprovalFilter, passengerApprovalFilter]);

  React.useEffect(() => {
    if (driverPage > driverPageCount) setDriverPage(driverPageCount);
    if (passengerPage > passengerPageCount) setPassengerPage(passengerPageCount);
    if (requestPage > requestPageCount) setRequestPage(requestPageCount);
  }, [driverPage, driverPageCount, passengerPage, passengerPageCount, requestPage, requestPageCount]);

  const handleApprove = async (reqId: string) => {
    if (!window.confirm("Approve this driver profile change request? The driver's details will be updated in the database and a notification will be sent.")) return;
    setIsProcessing(true);
    try {
      if (onReviewChangeRequest) {
        await onReviewChangeRequest(reqId, "APPROVED");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId) return;
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setIsProcessing(true);
    try {
      if (onReviewChangeRequest) {
        await onReviewChangeRequest(rejectingRequestId, "REJECTED", rejectReason.trim());
      }
      setRejectingRequestId(null);
      setRejectReason("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    if (usersSubTab === "drivers") {
      const headers = [
        "Driver Name",
        "TODA Association",
        "Plate Number",
        "Phone Number",
        "Email",
        "License Number",
        "License Expiry",
        "Franchise Number",
        "Franchise Expiry",
        "Document Status",
        "Activity Status",
        "Online Status",
        "Total Online Time",
        "Completed Trips",
        "Date Joined",
      ];
      const rows = sortedDrivers.map((d) => [
        d.name,
        d.toda,
        d.plateNumber,
        d.phone,
        d.email,
        d.license,
        d.licenseExpiryDate || "",
        d.franchiseNumber || "",
        d.franchiseExpiryDate || "",
        d.documentStatus || "PENDING",
        d.activityStatus,
        d.isOnline ? "Online" : "Offline",
        formatMinutes((d.totalOnlineMinutes || 0) + (d.isOnline ? (d.liveOnlineMinutes || 0) : 0)),
        d.trips,
        d.joinedDate,
      ]);
      exportToExcel(`todago_drivers_${dateStr}`, headers, rows);
    } else if (usersSubTab === "passengers") {
      const headers = [
        "Passenger Name",
        "Contact Number",
        "Email",
        "ID Verification Status",
        "Account Status",
        "Rides Taken",
        "Cancelled Trips",
        "Passenger Cancellations (Policy)",
        "Driver Cancellations",
        "Date Joined",
      ];
      const rows = sortedPassengers.map((p) => [
        p.name,
        p.contact,
        p.email || "",
        p.discountDocumentStatus || "NOT_REQUIRED",
        p.status,
        p.ridesTaken,
        p.canceledTrips,
        p.passengerCancelledTrips || 0,
        p.driverCancelledTrips || 0,
        p.joinedDate,
      ]);
      exportToExcel(`todago_passengers_${dateStr}`, headers, rows);
    } else {
      const allDrivers = drivers.length > 0 ? drivers : filteredDrivers;
      const headers = [
        "Request ID",
        "Driver Name",
        "Driver Phone",
        "TODA Association",
        "Field",
        "Current Value",
        "Requested Value",
        "Status",
        "Rejection Reason",
        "Date Submitted",
      ];
      const rows = sortedRequests.map((r) => {
        const d = allDrivers.find((x) => x.id === r.driverId || x.profileId === r.profileId);
        return [
          r.id,
          d?.name || "Unknown Driver",
          d?.phone || "N/A",
          d?.toda || "N/A",
          fieldLabel(r.fieldName),
          r.currentValue || "N/A",
          r.requestedValue,
          r.status,
          r.rejectionReason || "",
          r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
        ];
      });
      exportToExcel(`todago_driver_change_requests_${dateStr}`, headers, rows);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* SUB-TABS NAV BAR CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setUsersSubTab && setUsersSubTab("drivers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${usersSubTab === "drivers"
              ? "bg-[#000C7D] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            <span>Drivers</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${usersSubTab === "drivers" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
            >
              {filteredDrivers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUsersSubTab && setUsersSubTab("passengers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${usersSubTab === "passengers"
              ? "bg-[#000C7D] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            <span>Passengers</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${usersSubTab === "passengers" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
            >
              {filteredPassengers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUsersSubTab && setUsersSubTab("requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${usersSubTab === "requests"
              ? "bg-[#000C7D] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            <span>Change Requests</span>
            {pendingRequestsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${usersSubTab === "requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
              >
                {driverChangeRequests.length}
              </span>
            )}
          </button>
          {/* <button
            type="button"
            onClick={() => setUsersSubTab && setUsersSubTab("admins")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              usersSubTab === "admins"
                ? "bg-[#000C7D] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Admin Accounts</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                usersSubTab === "admins" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {adminAccounts.length}
            </span>
          </button> */}
        </div>
      </div>

      {usersSubTab === "admins" ? (
        <AdminManagementView
          adminAccounts={adminAccounts}
          newAdminForm={newAdminForm}
          setNewAdminForm={setNewAdminForm}
          isCreatingAdmin={isCreatingAdmin}
          activeAdminActionId={activeAdminActionId}
          onCreateAdmin={onCreateAdmin || (() => { })}
          onUpdateAdmin={onUpdateAdmin || (async () => false)}
          onDeleteAdmin={onDeleteAdmin || (async () => false)}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
          {/* TOP BAR / FILTERS */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h2 className="text-[#000C7D] font-bold text-xl">
                {usersSubTab === "drivers"
                  ? "Drivers Management"
                  : usersSubTab === "passengers"
                    ? "Passengers Management"
                    : "Driver Profile Change Requests"}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                {usersSubTab === "drivers"
                  ? driverApprovalFilter === "PENDING"
                    ? `${sortedDrivers.length} drivers pending approval · Live records from Supabase`
                    : `${sortedDrivers.length} drivers · Live records from Supabase`
                  : usersSubTab === "passengers"
                    ? passengerApprovalFilter === "PENDING"
                      ? `${sortedPassengers.length} passengers pending approval · Live records from Supabase`
                      : `${sortedPassengers.length} passengers · Live records from Supabase`
                    : `${sortedRequests.length} requests (${pendingRequestsCount} pending) · Modification requests submitted from Driver App`}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
              {usersSubTab === "drivers" && (
                <>
                  <div className="relative w-full sm:w-48">
                    <select
                      value={driverApprovalFilter}
                      onChange={(event) => setDriverApprovalFilter(event.target.value as ApprovalFilterOption)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
                    >
                      <option value="ALL">All Approval Status</option>
                      <option value="PENDING">Pending Approval Only ({pendingDriversCount})</option>
                      <option value="VERIFIED">Verified / Approved</option>
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>

                  <div className="relative w-full sm:w-44">
                    <select
                      value={userTodaFilter}
                      onChange={(event) => setUserTodaFilter(event.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
                    >
                      <option value="All">All TODAs</option>
                      {todaOptions.map((toda) => (
                        <option key={toda} value={toda}>
                          {toda}
                        </option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                </>
              )}

              {usersSubTab === "passengers" && (
                <div className="relative w-full sm:w-48">
                  <select
                    value={passengerApprovalFilter}
                    onChange={(event) => setPassengerApprovalFilter(event.target.value as ApprovalFilterOption)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
                  >
                    <option value="ALL">All Approval Status</option>
                    <option value="PENDING">Pending Approval Only ({pendingPassengersCount})</option>
                    <option value="VERIFIED">Verified / Approved</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              )}

              {usersSubTab === "requests" && (
                <div className="relative w-full sm:w-44">
                  <select
                    value={requestStatusFilter}
                    onChange={(event) => setRequestStatusFilter(event.target.value as RequestStatusOption)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              )}

              <div className="relative w-full sm:w-52">
                <select
                  value={userSort}
                  onChange={(event) => setUserSort(event.target.value as UserSortOption)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#000C7D] cursor-pointer appearance-none outline-hidden focus:border-blue-500"
                >
                  <option value="newest">Sort: Newest Created</option>
                  <option value="oldest">Sort: Oldest Created</option>
                  {usersSubTab !== "requests" && (
                    <>
                      <option value="name-asc">Sort: Name (A → Z)</option>
                      <option value="name-desc">Sort: Name (Z → A)</option>
                    </>
                  )}
                </select>
                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>

              <div className="w-full sm:w-60 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={
                    usersSubTab === "drivers"
                      ? "Search name, phone, license"
                      : usersSubTab === "passengers"
                        ? "Search name, contact, email"
                        : "Search driver, field, value"
                  }
                  value={driverSearch}
                  onChange={(event) => setDriverSearch(event.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-hidden focus:border-[#000C7D] transition-all text-[#000C7D]"
                />
              </div>

              <button
                onClick={handleExportExcel}
                title={`Download Excel spreadsheet of filtered ${usersSubTab}`}
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

          {/* 1. DRIVERS TABLE */}
          {usersSubTab === "drivers" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-3">Name</th>
                      <th className="pb-3 px-3">TODA</th>
                      <th className="pb-3 px-3">Document Status</th>
                      <th className="pb-3 px-3">Activity Status</th>
                      <th className="pb-3 px-3">Online Status</th>
                      <th className="pb-3 text-center pr-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold divide-y divide-slate-50">
                    {displayedDrivers.map((driver) => {
                      const docStatus = driver.documentStatus || "PENDING";
                      const docBadgeClass =
                        docStatus === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200";
                      const activityBadgeClass = getActivityBadgeClasses(driver.activityStatus);
                      const hasPendingRequest = driverChangeRequests.some(
                        (r) => r.driverId === driver.id && r.status === "PENDING"
                      );

                      return (
                        <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[#000C7D] font-bold">{driver.name}</p>
                              {driver.adminActionType && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                  Restricted
                                </span>
                              )}
                              {hasPendingRequest && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  1 Update Request
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-3 text-slate-600">{driver.toda}</td>
                          <td className="py-4 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${docBadgeClass}`}>
                              {docStatus}
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${activityBadgeClass}`}>
                              {driver.activityStatus}
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${driver.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                              <span className="text-[11px] text-slate-600 font-bold">
                                {driver.isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-center pr-3">
                            <button
                              onClick={() => {
                                setViewingUser(driver);
                                setViewingUserType("driver");
                                setShowViewUserModal(true);
                              }}
                              className="px-4 py-1.5 bg-[#4c75f2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                            >
                              View Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedDrivers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                          {driverApprovalFilter === "PENDING"
                            ? "No drivers currently pending approval."
                            : "No drivers registered matching your search query."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={driverPage} pageCount={driverPageCount} total={sortedDrivers.length} label="drivers" setPage={setDriverPage} />
            </>
          )}

          {/* 2. PASSENGERS TABLE */}
          {usersSubTab === "passengers" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-3">Name</th>
                      <th className="pb-3 px-3">Contact</th>
                      <th className="pb-3 px-3">ID Verification</th>
                      <th className="pb-3 px-3">Cancelled Trips</th>
                      <th className="pb-3 px-3">Account Status</th>
                      <th className="pb-3 text-center pr-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold divide-y divide-slate-50">
                    {displayedPassengers.map((passenger) => {
                      let statusClass = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                      if (passenger.status === "For Approval") statusClass = "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
                      if (passenger.status === "Warning") statusClass = "bg-amber-50 text-amber-600 border border-amber-100";
                      if (passenger.status.startsWith("Restricted")) statusClass = "bg-rose-50 text-rose-600 border border-rose-100";
                      if (passenger.status === "Inactive") statusClass = "bg-slate-50 text-slate-600 border border-slate-100";

                      return (
                        <tr key={passenger.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-3 text-[#000C7D] font-bold">{passenger.name}</td>
                          <td className="py-4 px-3 text-slate-600">{passenger.contact}</td>
                          <td className="py-4 px-3 text-slate-600">{passenger.discountDocumentStatus || "NOT_REQUIRED"}</td>
                          <td className="py-4 px-3 text-slate-600">{passenger.canceledTrips}</td>
                          <td className="py-4 px-3">
                            <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                              {passenger.status}
                            </span>
                          </td>
                          <td className="py-4 text-center pr-3">
                            <button
                              onClick={() => {
                                setViewingUser(passenger);
                                setViewingUserType("passenger");
                                setShowViewUserModal(true);
                              }}
                              className="px-4 py-1.5 bg-[#4c75f2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedPassengers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                          {passengerApprovalFilter === "PENDING"
                            ? "No passengers currently pending approval."
                            : "No passengers registered matching your search query."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={passengerPage} pageCount={passengerPageCount} total={sortedPassengers.length} label="passengers" setPage={setPassengerPage} />
            </>
          )}

          {/* 3. CHANGE REQUESTS TABLE */}
          {usersSubTab === "requests" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-3">Driver</th>
                      <th className="pb-3 px-3">Field Requested</th>
                      <th className="pb-3 px-3">Current Value</th>
                      <th className="pb-3 px-3">Requested Value</th>
                      <th className="pb-3 px-3">Submitted</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 text-center pr-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold divide-y divide-slate-50">
                    {displayedRequests.map((req) => {
                      const allDrivers = drivers.length > 0 ? drivers : filteredDrivers;
                      const matchedDriver = allDrivers.find(
                        (d) => d.id === req.driverId || d.profileId === req.profileId
                      );

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-3">
                            <p className="text-[#000C7D] font-bold">{matchedDriver?.name || "Unknown Driver"}</p>
                            <p className="text-[10px] text-slate-400">{matchedDriver?.phone || "No Contact"} · <span className="font-semibold text-slate-600">{matchedDriver?.toda || "N/A"}</span></p>
                          </td>
                          <td className="py-4 px-3">
                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-[#000C7D] rounded-md text-xs font-bold border border-slate-200">
                              {fieldLabel(req.fieldName)}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-500 font-medium">
                            {req.currentValue || "N/A"}
                          </td>
                          <td className="py-4 px-3">
                            <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#000C7D] rounded-md text-xs font-bold border border-blue-200">
                              {req.requestedValue}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-xs text-slate-500">
                            {req.createdAt ? new Date(req.createdAt).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-4 px-3">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${requestBadge(req.status)}`}>
                                {req.status}
                              </span>
                              {req.status === "REJECTED" && req.rejectionReason && (
                                <p className="text-[10px] text-rose-600 font-normal italic">
                                  Reason: {req.rejectionReason}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 text-center pr-3">
                            <div className="flex items-center justify-center gap-2">
                              {req.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleApprove(req.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => {
                                      setRejectingRequestId(req.id);
                                      setRejectReason("");
                                    }}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {matchedDriver && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingUser(matchedDriver);
                                    setViewingUserType("driver");
                                    setShowViewUserModal(true);
                                  }}
                                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[#000C7D] rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  View Driver
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                          No driver profile change requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={requestPage} pageCount={requestPageCount} total={sortedRequests.length} label="change requests" setPage={setRequestPage} />
            </>
          )}
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRequestId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 border border-slate-100 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#000C7D]">Reject Driver Modification Request</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Provide a reason for rejecting this change. The driver will be notified in their app.
              </p>
            </div>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., The franchise or license information provided could not be verified."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-hidden focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setRejectingRequestId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
