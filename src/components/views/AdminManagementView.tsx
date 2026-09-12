import React, { useState } from "react";
import { AdminAccount } from "../../types";

interface AdminManagementViewProps {
  adminAccounts: AdminAccount[];
  newAdminForm: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  setNewAdminForm: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    phone: string;
    password: string;
  }>>;
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

  const itemsPerPage = 7;
  const totalAdminPages = Math.max(1, Math.ceil(adminAccounts.length / itemsPerPage));
  const visibleAdminAccounts = adminAccounts.slice(
    (adminPage - 1) * itemsPerPage,
    adminPage * itemsPerPage,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 pb-2">
        <div className="min-w-0">
          <h1 className="text-[#091b6f] text-xl font-extrabold tracking-wide sm:text-2xl">Admin Management</h1>
          <p className="break-anywhere text-xs text-slate-400 font-medium mt-1">
            Modify Admin Accounts
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold text-[#091b6f]">Create Admin Account</h2>
        <form onSubmit={onCreateAdmin} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-extrabold uppercase text-slate-500">Full Name</span>
            <input
              type="text"
              required
              value={newAdminForm.name}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-extrabold uppercase text-slate-500">Email</span>
            <input
              type="email"
              required
              value={newAdminForm.email}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-extrabold uppercase text-slate-500">Phone</span>
            <input
              type="tel"
              value={newAdminForm.phone}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-extrabold uppercase text-slate-500">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={newAdminForm.password}
              onChange={(event) => setNewAdminForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
            />
          </label>

          <div className="lg:col-span-4">
            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="w-full rounded-md bg-[#091b6f] px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#142a8f] cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {isCreatingAdmin ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-4 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-[#091b6f]">Administrator Accounts</h2>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left border-collapse">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                <th className="px-2 pb-3">Name</th>
                <th className="px-2 pb-3">Email</th>
                <th className="px-2 pb-3">Contact</th>
                <th className="px-2 pb-3">Role</th>
                <th className="px-2 pb-3">Status</th>
                <th className="px-2 pb-3">Created</th>
                <th className="px-2 pb-3 text-center">View</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold divide-y divide-slate-50">
              {visibleAdminAccounts.map((account) => {
                return (
                  <tr key={account.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                    <td className="px-2 py-4">
                      <p className="truncate font-bold text-[#091b6f]" title={account.name}>{account.name}</p>
                    </td>
                    <td className="px-2 py-4">
                      <p className="truncate font-semibold text-slate-700" title={account.email || "-"}>{account.email || "-"}</p>
                    </td>
                    <td className="px-2 py-4">
                      <p className="truncate font-semibold text-slate-700" title={account.phone || "-"}>{account.phone || "-"}</p>
                    </td>
                    <td className="px-2 py-4 text-left">
                      <p
                        className={`truncate font-bold ${account.isPrimaryAdmin ? "text-[#091b6f]" : "text-slate-600"}`}
                        title={account.isPrimaryAdmin ? "Primary Admin" : "Admin"}
                      >
                        {account.isPrimaryAdmin ? "Primary Admin" : "Admin"}
                      </p>
                    </td>
                    <td className="px-2 py-4 text-left">
                      <p
                        className={`truncate font-bold ${account.status === "Active" ? "text-emerald-600" : "text-rose-600"}`}
                        title={account.status}
                      >
                        {account.status}
                      </p>
                    </td>
                    <td className="px-2 py-4 font-semibold text-slate-600 truncate" title={account.createdAt || "-"}>{account.createdAt || "-"}</td>
                    <td className="px-2 py-4 text-center">
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
                        className="w-full rounded-lg bg-[#4c75f2] px-2 py-1.5 text-[10px] font-bold text-white shadow-xs transition-all hover:bg-blue-600 cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {adminAccounts.length > 0 && (
          <div className="flex flex-col items-stretch gap-3 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500 font-bold">
              Page {adminPage} of {totalAdminPages}
            </span>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setAdminPage((prev) => Math.max(prev - 1, 1))}
                disabled={adminPage === 1}
                className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-[#091b6f] cursor-pointer disabled:cursor-not-allowed"
              >
                &lt;
              </button>

              {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setAdminPage(page)}
                  className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border cursor-pointer ${adminPage === page
                    ? "bg-blue-100 border-blue-200 text-blue-600 font-extrabold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setAdminPage((prev) => Math.min(prev + 1, totalAdminPages))}
                disabled={adminPage === totalAdminPages}
                className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-[#091b6f] cursor-pointer disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </section>

      {viewingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 bg-[#0b1b6e] px-4 py-5 text-white sm:px-6">
              <div className="min-w-0 text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Administrator Account</span>
                <h3 className="break-anywhere text-base font-bold sm:text-lg">{viewingAdmin.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="text-white/85 transition-colors hover:text-white cursor-pointer"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form
              className="flex flex-col gap-5 overflow-y-auto p-4 text-left sm:p-6"
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-slate-500">Full Name</span>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(event) => setEditForm(prev => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-slate-500">Email</span>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(event) => setEditForm(prev => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-slate-500">Phone</span>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(event) => setEditForm(prev => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-slate-500">New Password</span>
                  <input
                    type="password"
                    minLength={8}
                    value={editForm.password}
                    onChange={(event) => setEditForm(prev => ({ ...prev, password: event.target.value }))}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-[#091b6f] outline-none focus:border-[#091b6f]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-400">Admin ID</p>
                  <p className="break-anywhere mt-1 font-semibold text-slate-700">{viewingAdmin.id}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-400">Role</p>
                  <p className="mt-1 font-semibold text-slate-700">{viewingAdmin.isPrimaryAdmin ? "Primary Admin" : "Admin"}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-400">Status</p>
                  <p className="mt-1 font-semibold text-slate-700">{viewingAdmin.status}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-400">Created</p>
                  <p className="mt-1 font-semibold text-slate-700">{viewingAdmin.createdAt || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Delete admin account for ${viewingAdmin.name}? This cannot be undone.`)) return;
                    void onDeleteAdmin(viewingAdmin).then((deleted) => {
                      if (deleted) setViewingAdmin(null);
                    });
                  }}
                  disabled={viewingAdmin.isPrimaryAdmin || activeAdminActionId === viewingAdmin.id}
                  className="rounded-md bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-rose-700 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Delete Account
                </button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setViewingAdmin(null)}
                    className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={activeAdminActionId === viewingAdmin.id}
                    className="rounded-md bg-[#091b6f] px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#142a8f] cursor-pointer disabled:cursor-wait disabled:bg-slate-300"
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
