import React, { useState } from "react";
import { AdminAccount } from "../../types";
import { exportToExcel } from "../../lib/exportUtils";

interface AdminManagementViewProps {
  adminAccounts: AdminAccount[];
  newAdminForm: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  setNewAdminForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
      password: string;
    }>
  >;
  isCreatingAdmin: boolean;
  activeAdminActionId: string;
  onCreateAdmin: (event: React.FormEvent) => void;
  onUpdateAdmin: (
    account: AdminAccount,
    updates: { name: string; email: string; phone: string; password?: string },
  ) => Promise<boolean>;
  onDeleteAdmin: (account: AdminAccount) => Promise<boolean>;
}

export default function AdminManagementView({
  adminAccounts,
  newAdminForm,
  setNewAdminForm,
  isCreatingAdmin,
  activeAdminActionId,
  onCreateAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
}: AdminManagementViewProps) {
  const [viewingAdmin, setViewingAdmin] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [adminPage, setAdminPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 5;

  const filteredAdmins = React.useMemo(() => {
    if (!searchTerm.trim()) return adminAccounts;
    const term = searchTerm.toLowerCase();
    return adminAccounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(term) ||
        acc.email.toLowerCase().includes(term) ||
        acc.phone.toLowerCase().includes(term),
    );
  }, [adminAccounts, searchTerm]);

  const totalAdminPages = Math.max(1, Math.ceil(filteredAdmins.length / itemsPerPage));
  const visibleAdminAccounts = filteredAdmins.slice(
    (adminPage - 1) * itemsPerPage,
    adminPage * itemsPerPage,
  );

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const headers = ["Admin Name", "Email", "Phone", "Role", "Status", "Date Created"];
    const rows = filteredAdmins.map((a) => [
      a.name,
      a.email,
      a.phone || "N/A",
      a.isPrimaryAdmin ? "Primary Admin" : "Admin",
      a.status,
      a.createdAt || "N/A",
    ]);
    exportToExcel(`todago_admin_accounts_${dateStr}`, headers, rows);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* SECTION 1: CREATE ADMIN FORM */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#000C7D]">Create New Administrator</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Register a new administrative user with full dashboard access
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#000C7D] border border-blue-100 rounded-full text-xs font-bold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin Privilege
          </span>
        </div>

        <form onSubmit={onCreateAdmin} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Full Name</span>
            <input
              type="text"
              required
              placeholder="e.g. Maria Santos"
              value={newAdminForm.name}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Email Address</span>
            <input
              type="email"
              required
              placeholder="admin@todago.ph"
              value={newAdminForm.email}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Phone (Optional)</span>
            <input
              type="tel"
              placeholder="09123456789"
              value={newAdminForm.phone}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Password</span>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              value={newAdminForm.password}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
            />
          </label>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-1">
            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#000C7D] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-900 shadow-xs hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingAdmin ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: ADMINISTRATORS DIRECTORY */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#000C7D]">Administrator Directory</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {filteredAdmins.length} active system administrators
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search admin name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setAdminPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#000C7D] placeholder-slate-400 outline-hidden focus:bg-white focus:border-[#000C7D]"
              />
              <svg
                className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-slate-100">
              {visibleAdminAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No administrators found matching your query.
                  </td>
                </tr>
              ) : (
                visibleAdminAccounts.map((account) => {
                  return (
                    <tr key={account.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-[#000C7D] font-extrabold text-xs flex items-center justify-center">
                            {account.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-[#000C7D]">{account.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{account.email || "-"}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{account.phone || "-"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            account.isPrimaryAdmin
                              ? "bg-indigo-50 text-[#000C7D] border-indigo-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {account.isPrimaryAdmin ? "Primary Admin" : "Admin"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-500">{account.createdAt || "-"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingAdmin(account);
                            setEditForm({
                              name: account.name,
                              email: account.email,
                              phone: account.phone,
                              password: "",
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#000C7D] text-white text-[11px] font-bold hover:bg-blue-900 transition-all cursor-pointer shadow-xs"
                        >
                          View / Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredAdmins.length > itemsPerPage && (
          <div className="flex flex-col items-center justify-between gap-3 pt-3 sm:flex-row">
            <span className="text-xs text-slate-400 font-semibold">
              Page {adminPage} of {totalAdminPages} · {filteredAdmins.length} total
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAdminPage((p) => Math.max(p - 1, 1))}
                disabled={adminPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setAdminPage((p) => Math.min(p + 1, totalAdminPages))}
                disabled={adminPage === totalAdminPages}
                className="px-3 py-1.5 bg-[#000C7D] text-white rounded-lg text-xs font-bold hover:bg-blue-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* VIEW / EDIT ADMIN MODAL */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4 animate-in fade-in duration-150">
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 bg-[#000C7D] px-5 py-4 text-white">
              <div className="min-w-0 text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-200">
                  {viewingAdmin.isPrimaryAdmin ? "Primary Administrator" : "Administrator Account"}
                </span>
                <h3 className="truncate text-base font-extrabold">{viewingAdmin.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="text-white/80 transition-colors hover:text-white cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form
              className="flex flex-col gap-4 overflow-y-auto p-5 text-left"
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await onUpdateAdmin(viewingAdmin, editForm);
                if (!saved) return;
                setViewingAdmin((prev: AdminAccount | null) =>
                  prev
                    ? {
                        ...prev,
                        name: editForm.name,
                        email: editForm.email,
                        phone: editForm.phone,
                      }
                    : prev,
                );
                setEditForm((prev) => ({ ...prev, password: "" }));
              }}
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">Full Name</span>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D]"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">Email Address</span>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D]"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">Phone Number</span>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D]"
                  />
                </label>

                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">
                    Reset Password (Optional)
                  </span>
                  <input
                    type="password"
                    minLength={8}
                    value={editForm.password}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Leave blank to preserve current password"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D]"
                  />
                </label>
              </div>

              {/* Account Metadata Box */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-600">{viewingAdmin.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Date Created</span>
                  <span className="font-semibold text-slate-700">{viewingAdmin.createdAt || "-"}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {!viewingAdmin.isPrimaryAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete administrator account for ${viewingAdmin.name}? This will permanently remove their administrative credentials.`,
                        )
                      )
                        return;
                      const deleted = await onDeleteAdmin(viewingAdmin);
                      if (deleted) setViewingAdmin(null);
                    }}
                    disabled={activeAdminActionId === viewingAdmin.id}
                    className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                  >
                    Delete Admin
                  </button>
                )}
                {viewingAdmin.isPrimaryAdmin && <div></div>}

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewingAdmin(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={activeAdminActionId === viewingAdmin.id}
                    className="rounded-xl bg-[#000C7D] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-900 cursor-pointer disabled:opacity-60"
                  >
                    {activeAdminActionId === viewingAdmin.id ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
