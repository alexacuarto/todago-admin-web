import React from "react";
import { Driver } from "../../types";

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDriver: Driver | null;
  editFormData: any;
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EditDriverModal({
  isOpen,
  onClose,
  editingDriver,
  editFormData,
  setEditFormData,
  onSubmit,
}: EditDriverModalProps) {
  if (!isOpen || !editingDriver) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#000C7D] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">Edit Driver Account</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4 text-left max-h-[80vh] overflow-y-auto">
          {/* Personal Info */}
          <h4 className="text-xs font-bold text-[#000C7D] uppercase tracking-wider border-b pb-1">Personal Info</h4>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Driver Full Name</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone</label>
            <input
              type="tel"
              required
              value={editFormData.phone}
              onChange={(e) => setEditFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={editFormData.email || ""}
              onChange={(e) => setEditFormData((prev: any) => ({ ...prev, email: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Address</label>
            <input
              type="text"
              placeholder="Driver address"
              value={editFormData.address || ""}
              onChange={(e) => setEditFormData((prev: any) => ({ ...prev, address: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TODA</label>
              <select
                value={editFormData.toda}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, toda: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white outline-hidden focus:border-blue-500 transition-all cursor-pointer text-[#000C7D]"
              >
                <option value="LHITC-TODA">LHITC-TODA</option>
                <option value="BYPASS ILAYANG BAGUIO-TODA">BYPASS ILAYANG BAGUIO-TODA</option>
                <option value="CHOT-TODA">CHOT-TODA</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, status: e.target.value as "Active" | "Inactive" }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white outline-hidden focus:border-blue-500 transition-all cursor-pointer text-[#000C7D]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* License Info */}
          <h4 className="text-xs font-bold text-[#000C7D] uppercase tracking-wider border-b pb-1">License Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">License Number</label>
              <input
                type="text"
                placeholder="Enter License Number"
                value={editFormData.license}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, license: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">License Expiry Date</label>
              <input
                type="date"
                value={editFormData.licenseExpiryDate || ""}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, licenseExpiryDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 transition-all text-[#000C7D]"
              />
            </div>
          </div>

          {/* Franchise Info */}
          <h4 className="text-xs font-bold text-[#000C7D] uppercase tracking-wider border-b pb-1">Franchise Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Franchise Number</label>
              <input
                type="text"
                placeholder="Enter Franchise Number"
                value={editFormData.franchiseNumber || ""}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, franchiseNumber: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Franchise Expiry Date</label>
              <input
                type="date"
                value={editFormData.franchiseExpiryDate || ""}
                onChange={(e) => setEditFormData((prev: any) => ({ ...prev, franchiseExpiryDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 transition-all text-[#000C7D]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-5 pt-5 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01] cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
