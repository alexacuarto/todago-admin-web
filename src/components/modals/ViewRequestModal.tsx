import { RideRequest } from "../../types";

interface ViewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingRequest: RideRequest | null;
  onDeleteRequest: (id: string) => void;
}

export default function ViewRequestModal({
  isOpen,
  onClose,
  viewingRequest,
  onDeleteRequest: _onDeleteRequest,
}: ViewRequestModalProps) {
  if (!isOpen || !viewingRequest) return null;

  const isSpecialTrip =
    viewingRequest.tripType?.toLowerCase().includes("special") ||
    (viewingRequest.stops && viewingRequest.stops.length > 0) ||
    (viewingRequest.totalStops != null && viewingRequest.totalStops > 1);
  const isRoundTrip = !isSpecialTrip && (viewingRequest.tripType?.toLowerCase().includes("round") ?? false);
  const stopsCount = viewingRequest.stops?.length || viewingRequest.totalStops || (isSpecialTrip ? 1 : 1);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-[#000C7D] text-white px-6 py-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              {isSpecialTrip ? `Special Trip • ${stopsCount} Stops` : isRoundTrip ? "Round Trip" : "One Way Trip"}
            </span>
            <h3 className="font-bold text-lg">Booking Details</h3>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 text-left overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Passenger</p>
              <p className="font-bold text-[#000C7D] text-base mt-0.5">{viewingRequest.passenger}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assigned Driver</p>
              <p className="font-bold text-slate-700 text-base mt-0.5">{viewingRequest.driver}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pickup Location</p>
              <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.location}</p>
              {viewingRequest.pickupLatitude != null && viewingRequest.pickupLongitude != null && (
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ({viewingRequest.pickupLatitude.toFixed(5)}, {viewingRequest.pickupLongitude.toFixed(5)})
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {isSpecialTrip ? "Final Destination" : "Primary Destination"}
              </p>
              <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.destination || "N/A"}</p>
              {viewingRequest.dropoffLatitude != null && viewingRequest.dropoffLongitude != null && (
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ({viewingRequest.dropoffLatitude.toFixed(5)}, {viewingRequest.dropoffLongitude.toFixed(5)})
                </p>
              )}
            </div>

            {isSpecialTrip && viewingRequest.stops && viewingRequest.stops.length > 0 && (
              <div className="col-span-2 bg-sky-50/60 rounded-2xl p-4 border border-sky-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#000C7D] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#000C7D]"></span>
                    Recorded Stops ({viewingRequest.stops.length} of {viewingRequest.totalStops || viewingRequest.stops.length})
                  </p>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Multi-Stop Route
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {viewingRequest.stops.map((stop, idx) => {
                    const isPassed = viewingRequest.currentStopIndex != null && viewingRequest.currentStopIndex > idx;
                    const isCurrent = viewingRequest.currentStopIndex === idx && viewingRequest.status === "In Transit";
                    const isCompleted = viewingRequest.status === "Completed" || isPassed;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 text-xs p-3 rounded-xl border transition-all ${
                          isCompleted
                            ? "bg-emerald-50/70 border-emerald-100"
                            : isCurrent
                            ? "bg-sky-50 border-sky-200 ring-1 ring-sky-300"
                            : "bg-white border-slate-100"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold shrink-0 mt-0.5 text-xs ${
                            isCompleted
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-sky-600 text-white animate-pulse"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isCompleted ? "✓" : (stop.stop_number || idx + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              Stop {stop.stop_number || idx + 1}: {stop.address}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCurrent
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isCompleted ? "Arrived" : isCurrent ? "En Route" : "Pending"}
                            </span>
                          </div>
                          {stop.sub_address && (
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">{stop.sub_address}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400">
                            {stop.latitude != null && stop.longitude != null && (Number(stop.latitude) !== 0 || Number(stop.longitude) !== 0) && (
                              <span className="font-mono text-slate-500">
                                📍 {Number(stop.latitude).toFixed(5)}, {Number(stop.longitude).toFixed(5)}
                              </span>
                            )}
                            {stop.arrived_at && (
                              <span className="text-emerald-700 font-semibold">
                                ⏱️ Arrived: {new Date(stop.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isSpecialTrip && (!viewingRequest.stops || viewingRequest.stops.length === 0) && (
              <div className="col-span-2 bg-sky-50/60 rounded-2xl p-4 border border-sky-100">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-[#000C7D] font-extrabold uppercase tracking-wider">
                    Special Trip Route ({viewingRequest.totalStops || 1} Stops)
                  </p>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Multi-Stop
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <span className="text-slate-400 font-semibold">Final Destination: </span>
                  <span className="font-bold text-slate-800">{viewingRequest.destination || "N/A"}</span>
                </p>
              </div>
            )}

            {isRoundTrip && (
              <div className="col-span-2 bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/70">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Return Location</p>
                <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.returnLocation || viewingRequest.location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fare Value</p>
              <p className="font-extrabold text-[#000C7D] text-lg mt-0.5">₱{viewingRequest.fare}</p>
              {viewingRequest.regularFare != null && viewingRequest.regularFare !== viewingRequest.fare && (
                <p className="text-[11px] text-slate-400 font-medium">Regular: ₱{viewingRequest.regularFare}</p>
              )}
            </div>
            {viewingRequest.discountReviewStatus && (
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Discount Review</p>
                <div className="mt-0.5">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    viewingRequest.discountReviewStatus === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : viewingRequest.discountReviewStatus === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : viewingRequest.discountReviewStatus === "PARTIALLY_APPROVED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {viewingRequest.discountReviewStatus === "REJECTED"
                      ? "Disapproved (Reverted)"
                      : viewingRequest.discountReviewStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            )}
            <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Passenger Type</p>
              <p className="font-bold text-slate-700 mt-0.5">
                {viewingRequest.bookingDiscountRequests && viewingRequest.bookingDiscountRequests.length > 0
                  ? viewingRequest.bookingDiscountRequests.map((request) => request.discountType).join(", ")
                  : "Regular"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Booking Time</p>
              <p className="font-bold text-slate-500 mt-0.5">{viewingRequest.time}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">TODA Association</p>
              <p className="font-bold text-slate-600 mt-0.5">{viewingRequest.toda}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ride Status</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                    viewingRequest.status === "Completed"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : viewingRequest.status === "In Transit"
                      ? "bg-emerald-500 text-white border border-emerald-600"
                      : viewingRequest.status === "Pending" || viewingRequest.status === "Awaiting Payment" || viewingRequest.status === "Payment Confirmation"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : viewingRequest.status === "Scheduled"
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                      : "bg-rose-50 text-rose-600 border border-rose-100"
                  }`}
                >
                  {viewingRequest.status}
                </span>
              </div>
            </div>
            {viewingRequest.status === "Cancelled" && (
              <>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cancelled By</p>
                  <p className="font-bold text-rose-700 mt-0.5">{viewingRequest.cancelled_by || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cancelled At</p>
                  <p className="font-bold text-slate-600 mt-0.5">
                    {viewingRequest.cancelled_at
                      ? new Date(viewingRequest.cancelled_at).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div className="col-span-2 bg-rose-50/50 p-3 rounded-xl border border-rose-100/50 flex flex-col gap-2">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cancellation Reason</p>
                    <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.cancel_reason || "None provided"}</p>
                  </div>
                  {viewingRequest.cancel_details && (
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cancellation Details</p>
                      <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.cancel_details}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {viewingRequest.bookingDiscountRequests && viewingRequest.bookingDiscountRequests.length > 0 && (
            <div className="border border-amber-100 bg-amber-50/40 rounded-2xl p-4">
              <p className="text-xs text-amber-700 font-extrabold uppercase tracking-wider mb-3">
                Companion Discount IDs
              </p>
              <div className="flex flex-col gap-3">
                {viewingRequest.bookingDiscountRequests.map((request) => (
                  <div key={request.id} className="bg-white border border-amber-100 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#000C7D] text-sm">
                        {request.discountType} Companion {request.companionIndex}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {request.reviewedAt ? `Reviewed ${new Date(request.reviewedAt).toLocaleString()}` : "Pending driver review"}
                      </p>
                      {request.rejectionReason && (
                        <p className="text-xs font-semibold text-rose-600 mt-1">Reason: {request.rejectionReason}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                        request.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : request.status === "REJECTED"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 mt-2 flex items-center justify-end gap-3">
            {/* 
            <button
              onClick={() => onDeleteRequest(viewingRequest.id)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-sm hover:shadow"
            >
              Delete Ride Request
            </button>
            */}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#000C7D] hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-sm hover:shadow"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
