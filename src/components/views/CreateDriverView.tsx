import React, { useState } from "react";

interface CreateDriverViewProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isCreatingDriver?: boolean;
}

export default function CreateDriverView({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isCreatingDriver = false,
}: CreateDriverViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col gap-6 animate-in fade-in duration-200">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          {/* Header */}
          <div className="text-left">
            <h4 className="text-md font-bold text-[#000C7D] tracking-wide uppercase">Driver Information</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">Create a new driver account. Documents can be uploaded during or after creation.</p>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* ── PERSONAL & VEHICLE INFO ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center transition-colors ${formData.name ? "text-white" : "text-slate-400"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                    formData.name
                      ? "bg-[#000C7D] text-white border-blue-950 placeholder-sky-200"
                      : "bg-white text-[#000C7D] border-slate-200 placeholder-slate-300"
                  }`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Email <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center transition-colors ${formData.email ? "text-white" : "text-slate-400"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  placeholder="Enter Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                    formData.email
                      ? "bg-[#000C7D] text-white border-blue-950 placeholder-sky-200"
                      : "bg-white text-[#000C7D] border-slate-200 placeholder-slate-300"
                  }`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Contact Number <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center transition-colors ${formData.phone ? "text-white" : "text-slate-400"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Enter Contact Number"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                    formData.phone
                      ? "bg-[#000C7D] text-white border-blue-950 placeholder-sky-200"
                      : "bg-white text-[#000C7D] border-slate-200 placeholder-slate-300"
                  }`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password with Toggle */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Temporary Password <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center transition-colors ${formData.password ? "text-white" : "text-slate-400"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter Password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, password: e.target.value }))}
                  className={`w-full pl-11 pr-12 py-3 border rounded-xl text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                    formData.password
                      ? "bg-[#000C7D] text-white border-blue-950 placeholder-sky-200"
                      : "bg-white text-[#000C7D] border-slate-200 placeholder-slate-300"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${formData.password ? "text-sky-200 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>



            {/* Plate Number */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Plate Number <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center transition-colors ${formData.plateNumber ? "text-white" : "text-slate-400"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Enter Plate Number (e.g. ABC-1234)"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, plateNumber: e.target.value }))}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-semibold outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                    formData.plateNumber
                      ? "bg-[#000C7D] text-white border-blue-950 placeholder-sky-200"
                      : "bg-white text-[#000C7D] border-slate-200 placeholder-slate-300"
                  }`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* TODA */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">TODA Association <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </span>
                <select
                  value={formData.toda}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, toda: e.target.value }))}
                  className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-[#000C7D] cursor-pointer appearance-none"
                >
                  <option value="LHITC-TODA">LHITC-TODA</option>
                  <option value="BYPASS ILAYANG BAGUIO-TODA">BYPASS ILAYANG BAGUIO-TODA</option>
                  <option value="CHOT-TODA">CHOT-TODA</option>
                </select>
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* ── DOCUMENT UPLOAD SECTIONS ── */}
          <div className="text-left mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h4 className="text-md font-bold text-[#000C7D] tracking-wide uppercase">Upload Documents</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ── DRIVER LICENSE ── */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="7" y1="8" x2="17" y2="8" />
                      <line x1="7" y1="12" x2="13" y2="12" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#000C7D] uppercase tracking-wider">Driver License Documents</span>
                </div>

                {/* Front Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">License Front Image</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-white hover:border-blue-300 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData((prev: any) => ({ ...prev, licenseFrontImage: file, licenseFrontName: file.name }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#000C7D] truncate">
                        {formData.licenseFrontName || "Choose Front Image"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">JPG, PNG or PDF</p>
                    </div>
                    {formData.licenseFrontName && <span className="text-[9px] font-bold text-emerald-600">✓</span>}
                  </div>
                </div>

                {/* Back Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">License Back Image</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-white hover:border-blue-300 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData((prev: any) => ({ ...prev, licenseBackImage: file, licenseBackName: file.name }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#000C7D] truncate">
                        {formData.licenseBackName || "Choose Back Image"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">JPG, PNG or PDF</p>
                    </div>
                    {formData.licenseBackName && <span className="text-[9px] font-bold text-emerald-600">✓</span>}
                  </div>
                </div>

                {/* License Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. D12-34-567890"
                    value={formData.licenseNumber || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, licenseNumber: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                {/* License Expiry */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">License Expiry Date</label>
                  <input
                    type="date"
                    value={formData.licenseExpiryDate || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, licenseExpiryDate: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* ── FRANCHISE DOCUMENTS ── */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#000C7D] uppercase tracking-wider">Franchise Documents</span>
                </div>

                {/* Franchise Front / Permit Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Franchise Front / Permit Image</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-white hover:border-indigo-300 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData((prev: any) => ({ ...prev, franchiseImage: file, franchiseImageName: file.name }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#000C7D] truncate">
                        {formData.franchiseImageName || "Choose Franchise Front / Permit"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">JPG, PNG or PDF</p>
                    </div>
                    {formData.franchiseImageName && <span className="text-[9px] font-bold text-emerald-600">✓</span>}
                  </div>
                </div>

                {/* Franchise Back Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Franchise Back Image</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-white hover:border-indigo-300 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData((prev: any) => ({ ...prev, franchiseBackImage: file, franchiseBackName: file.name }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#000C7D] truncate">
                        {formData.franchiseBackName || "Choose Franchise Back Image"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">JPG, PNG or PDF</p>
                    </div>
                    {formData.franchiseBackName && <span className="text-[9px] font-bold text-emerald-600">✓</span>}
                  </div>
                </div>

                {/* Franchise Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Franchise Number</label>
                  <input
                    type="text"
                    placeholder="e.g. F-2026-987"
                    value={formData.franchiseNumber || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, franchiseNumber: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Franchise Expiry */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Franchise Expiry Date</label>
                  <input
                    type="date"
                    value={formData.franchiseExpiryDate || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, franchiseExpiryDate: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-7 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingDriver}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isCreatingDriver && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isCreatingDriver ? 'Creating...' : 'Create Driver Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
