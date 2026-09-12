import { EarningsRecord } from "../../types";

interface ViewEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingEarningsRecord: EarningsRecord | null;
}

export default function ViewEarningsModal({
  isOpen,
  onClose,
  viewingEarningsRecord,
}: ViewEarningsModalProps) {
  if (!isOpen || !viewingEarningsRecord) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col">
        <div className="bg-[#000C7D] text-white px-6 py-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Financial Audit Log</span>
            <h3 className="font-bold text-lg">{viewingEarningsRecord.toda} Breakdown</h3>
          </div>
          <button onClick={onClose} className="text-white/85 hover:text-white transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 text-left">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Report Date</p>
              <p className="font-bold text-[#000C7D] text-base mt-0.5">{viewingEarningsRecord.date}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">TODA Association</p>
              <p className="font-bold text-slate-700 text-base mt-0.5">{viewingEarningsRecord.toda}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Completed Rides</p>
              <p className="font-bold text-slate-700 mt-0.5">{viewingEarningsRecord.completedRides} Trips</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Representative Driver</p>
              <p className="font-bold text-slate-700 mt-0.5">{viewingEarningsRecord.driverName || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Booking Volume</p>
              <p className="font-extrabold text-slate-800 text-lg mt-0.5">
                ₱{viewingEarningsRecord.totalEarnings.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Platform Commission Fee (15%)</p>
              <p className="font-extrabold text-[#000C7D] text-lg mt-0.5">
                ₱{viewingEarningsRecord.commissionEarned.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Breakdown of Services</h4>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Base Fare Volume (85% Driver share)</span>
                <span>₱{(viewingEarningsRecord.totalEarnings * 0.85).toFixed(0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/50 pt-2">
                <span>Platform Commission (15% TODA share)</span>
                <span>₱{viewingEarningsRecord.commissionEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                <span>Total Transacted Amount</span>
                <span>₱{viewingEarningsRecord.totalEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-2 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#000C7D] hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-sm hover:shadow"
            >
              Close Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
