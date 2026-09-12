import React from "react";
import { Driver } from "../../types";

interface AddRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  newRequestData: any;
  setNewRequestData: React.Dispatch<React.SetStateAction<any>>;
  drivers: Driver[];
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddRequestModal({
  isOpen,
  onClose,
  newRequestData,
  setNewRequestData,
  drivers,
  onSubmit,
}: AddRequestModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="bg-[#000C7D] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">Dispatch New Ride Request</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Passenger Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maria Cruz"
              value={newRequestData.passenger}
              onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, passenger: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pickup Location</label>
              <input
                type="text"
                required
                placeholder="e.g. Tayabas Market"
                value={newRequestData.location}
                onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, location: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Destination</label>
              <input
                type="text"
                required
                placeholder="e.g. Brgy. Baguio"
                value={newRequestData.destination}
                onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, destination: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fare (₱)</label>
              <input
                type="number"
                required
                placeholder="80"
                value={newRequestData.fare}
                onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, fare: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Assign Driver</label>
              <select
                value={newRequestData.driverId}
                onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, driverId: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold bg-white outline-hidden focus:border-blue-500 transition-all text-[#000C7D] cursor-pointer"
              >
                <option value="">Select Active Driver</option>
                {drivers
                  .filter((d) => d.status === "Active")
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.toda})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Initial Booking Status</label>
            <select
              value={newRequestData.status}
              onChange={(e) => setNewRequestData((prev: any) => ({ ...prev, status: e.target.value as any }))}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold bg-white outline-hidden focus:border-blue-500 transition-all text-[#000C7D] cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
