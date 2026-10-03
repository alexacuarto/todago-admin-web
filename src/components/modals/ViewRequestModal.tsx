import { useState, useEffect } from "react";
import { RideRequest } from "../../types";
import { formatDateTime, formatTripDuration } from "../../lib/dateUtils";
import { supabase } from "../../lib/supabase";
import { getPassengerTypeBadge } from "../views/UsersView";

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
  onDeleteRequest,
}: ViewRequestModalProps) {
  const [discountRates, setDiscountRates] = useState<{
    student: number;
    seniorCitizen: number;
    pwd: number;
  }>(() => {
    try {
      const cached = localStorage.getItem("toda_go_fare_oneway");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          student: Number(parsed.studentDiscount) || 20,
          seniorCitizen: Number(parsed.seniorCitizenDiscount) || 20,
          pwd: Number(parsed.pwdDiscount) || 20,
        };
      }
    } catch (_) {}
    return { student: 20, seniorCitizen: 20, pwd: 20 };
  });

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from("fare_configurations")
      .select("student_discount, senior_citizen_discount, pwd_discount")
      .eq("trip_type", "one_way")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDiscountRates({
            student: Number(data.student_discount) || 20,
            seniorCitizen: Number(data.senior_citizen_discount) || 20,
            pwd: Number(data.pwd_discount) || 20,
          });
        }
      });
  }, [isOpen]);

  if (!isOpen || !viewingRequest) return null;

  const hasMultipleStops = Boolean(viewingRequest.stops && viewingRequest.stops.length > 1);
  const isSpecialTrip =
    viewingRequest.tripType?.toLowerCase().includes("special") ||
    hasMultipleStops ||
    (viewingRequest.totalStops != null && viewingRequest.totalStops > 1);
  const isRoundTrip = !isSpecialTrip && (viewingRequest.tripType?.toLowerCase().includes("round") ?? false);
  const stopsCount = viewingRequest.stops?.length || viewingRequest.totalStops || (isSpecialTrip ? 1 : 1);
  const completedTimestamp = viewingRequest.completedAt || viewingRequest.completed_at;
  const bookingTimestamp = viewingRequest.requestedAt || viewingRequest.time;
  const tripDuration = completedTimestamp ? formatTripDuration(bookingTimestamp, completedTimestamp) : null;
  const distanceKm = viewingRequest.actualDistanceKm ?? viewingRequest.estimatedDistanceKm;

  const totalPassengers = viewingRequest.totalPassengers || 1;
  const isSolo = viewingRequest.isSolo ?? (totalPassengers === 1);
  const companionCount = viewingRequest.companionCount ?? Math.max(0, totalPassengers - 1);
  const regularCount = viewingRequest.regularPassengerCount ?? 0;
  const studentCount = viewingRequest.studentPassengerCount ?? 0;
  const seniorCount = viewingRequest.seniorPassengerCount ?? 0;
  const pwdCount = viewingRequest.pwdPassengerCount ?? 0;
  const primaryType = viewingRequest.accountPassengerType || viewingRequest.discountPassengerType || viewingRequest.passengerTypeDisplay || "Regular";
  const passengerTypeBadge = getPassengerTypeBadge(primaryType);

  const discountRequests = viewingRequest.bookingDiscountRequests || [];
  const companionsList: {
    index: number;
    type: string;
    verificationMode: string;
    status: string;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
  }[] = [];

  if (!isSolo && companionCount > 0) {
    for (let i = 1; i <= companionCount; i++) {
      const discountReq = discountRequests.find((r) => r.companionIndex === i);
      if (discountReq) {
        companionsList.push({
          index: i,
          type: discountReq.discountType,
          verificationMode:
            discountReq.idImagePath === "PHYSICAL_VERIFICATION"
              ? "Physical ID Verification"
              : "Uploaded Photo ID",
          status: discountReq.status,
          reviewedAt: discountReq.reviewedAt,
          rejectionReason: discountReq.rejectionReason,
        });
      } else {
        companionsList.push({
          index: i,
          type: "Regular Passenger",
          verificationMode: "No Discount Required",
          status: "STANDARD",
          reviewedAt: null,
          rejectionReason: null,
        });
      }
    }
  }

  discountRequests.forEach((discountReq) => {
    if (!companionsList.some((c) => c.index === discountReq.companionIndex)) {
      companionsList.push({
        index: discountReq.companionIndex,
        type: discountReq.discountType,
        verificationMode:
          discountReq.idImagePath === "PHYSICAL_VERIFICATION"
            ? "Physical ID Verification"
            : "Uploaded Photo ID",
        status: discountReq.status,
        reviewedAt: discountReq.reviewedAt,
        rejectionReason: discountReq.rejectionReason,
      });
    }
  });
  companionsList.sort((a, b) => a.index - b.index);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-[#000C7D] text-white px-6 py-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              {hasMultipleStops ? `Special Trip • ${stopsCount} Stops` : isSpecialTrip ? "Special Trip" : isRoundTrip ? "Round Trip" : "One Way Trip"}
              {distanceKm != null ? ` • ${distanceKm.toFixed(2)} km` : ""}
            </span>
            <h3 className="font-bold text-lg">Booking Details</h3>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 text-left overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Passenger</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${passengerTypeBadge.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${passengerTypeBadge.dotClass}`} />
                  {passengerTypeBadge.label}
                </span>
              </div>
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
                Drop off
              </p>
              <p className="font-bold text-slate-700 mt-0.5">{viewingRequest.destination || "N/A"}</p>
              {viewingRequest.dropoffLatitude != null && viewingRequest.dropoffLongitude != null && (
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ({viewingRequest.dropoffLatitude.toFixed(5)}, {viewingRequest.dropoffLongitude.toFixed(5)})
                </p>
              )}
            </div>

            {hasMultipleStops && viewingRequest.stops && viewingRequest.stops.length > 0 && (
              <div className="col-span-2 bg-sky-50/60 rounded-2xl p-4 border border-sky-100">
                <div className="flex flex-col gap-2.5">
                  {viewingRequest.stops.map((stop, idx) => {
                    const isPassed = viewingRequest.currentStopIndex != null && viewingRequest.currentStopIndex > idx;
                    const isCurrent = viewingRequest.currentStopIndex === idx && viewingRequest.status === "In Transit";
                    const isCompleted = viewingRequest.status === "Completed" || isPassed;
                    const isLastStop = idx === viewingRequest.stops!.length - 1;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 text-xs p-3 rounded-xl border transition-all ${isCompleted
                            ? "bg-emerald-50/70 border-emerald-100"
                            : isCurrent
                              ? "bg-sky-50 border-sky-200 ring-1 ring-sky-300"
                              : "bg-white border-slate-100"
                          }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold shrink-0 mt-0.5 text-xs ${isCompleted
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
                              {isLastStop ? `Drop off: ${stop.address}` : `Stop ${stop.stop_number || idx + 1}: ${stop.address}`}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${isCompleted
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
                                ⏱️ Arrived: {formatDateTime(stop.arrived_at)}
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
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${viewingRequest.discountReviewStatus === "APPROVED"
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
            <div className="col-span-2 rounded-2xl p-4 border transition-all flex flex-col gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-slate-200/80">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${
                    isSolo ? "bg-slate-200 text-slate-700" : "bg-[#000C7D] text-white shadow-xs"
                  }`}>
                    {isSolo ? "👤" : "👥"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Passenger Headcount
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isSolo 
                          ? "bg-slate-200/80 text-slate-700" 
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {isSolo ? "Solo Ride" : "Group Ride"}
                      </span>
                    </div>
                    <p className="font-extrabold text-slate-800 text-base mt-0.5">
                      {isSolo 
                        ? "Solo Passenger (1 Rider)" 
                        : `${totalPassengers} Total Passengers (1 Primary + ${companionCount} ${companionCount === 1 ? "Companion" : "Companions"})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Passenger Type Breakdown Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60">
                <div className={`p-2 rounded-xl border text-center ${
                  regularCount > 0 
                    ? "bg-white border-slate-200 shadow-2xs" 
                    : "bg-slate-100/40 border-transparent opacity-50"
                }`}>
                  <p className="text-[11px] font-semibold text-slate-500">Regular</p>
                  <p className="text-base font-extrabold text-slate-800 mt-0.5">{regularCount}</p>
                  <span className="text-[10px] text-slate-400 font-medium">Standard Fare</span>
                </div>
                <div className={`p-2 rounded-xl border text-center ${
                  studentCount > 0 
                    ? "bg-sky-50 border-sky-200 shadow-2xs" 
                    : "bg-slate-100/40 border-transparent opacity-50"
                }`}>
                  <p className="text-[11px] font-semibold text-sky-800">Student</p>
                  <p className="text-base font-extrabold text-sky-900 mt-0.5">{studentCount}</p>
                  <span className="text-[10px] text-sky-600 font-bold">{discountRates.student}% Off</span>
                </div>
                <div className={`p-2 rounded-xl border text-center ${
                  seniorCount > 0 
                    ? "bg-amber-50 border-amber-200 shadow-2xs" 
                    : "bg-slate-100/40 border-transparent opacity-50"
                }`}>
                  <p className="text-[11px] font-semibold text-amber-800">Senior</p>
                  <p className="text-base font-extrabold text-amber-900 mt-0.5">{seniorCount}</p>
                  <span className="text-[10px] text-amber-600 font-bold">{discountRates.seniorCitizen}% Off</span>
                </div>
                <div className={`p-2 rounded-xl border text-center ${
                  pwdCount > 0 
                    ? "bg-purple-50 border-purple-200 shadow-2xs" 
                    : "bg-slate-100/40 border-transparent opacity-50"
                }`}>
                  <p className="text-[11px] font-semibold text-purple-800">PWD</p>
                  <p className="text-base font-extrabold text-purple-900 mt-0.5">{pwdCount}</p>
                  <span className="text-[10px] text-purple-600 font-bold">{discountRates.pwd}% Off</span>
                </div>
              </div>
            </div>

            {/* Fare Breakdown Transparency Card */}
            <div className="col-span-2 bg-slate-50/90 rounded-2xl p-4 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fare Determination & Calculation</p>
                <span className="text-[11px] font-extrabold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                  {isSolo ? "1 Passenger Fare" : `${totalPassengers} Passengers Shared Route`}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                {distanceKm != null && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Computed Road Distance:</span>
                    <span className="font-extrabold text-[#000C7D]">{distanceKm.toFixed(2)} km</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600">
                  <span>Regular Undiscounted Base Fare:</span>
                  <span className="font-bold text-slate-800">₱{viewingRequest.regularFare ?? viewingRequest.fare}</span>
                </div>
                {viewingRequest.regularFare != null && viewingRequest.regularFare > viewingRequest.fare && (
                  <div className="flex justify-between items-center text-emerald-700 font-medium">
                    <span>Statutory Discount Deductions:</span>
                    <span className="font-extrabold">
                      -₱{(viewingRequest.regularFare - viewingRequest.fare).toFixed(2)}
                    </span>
                  </div>
                )}
                {viewingRequest.discountReviewStatus && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Discount Verification Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      viewingRequest.discountReviewStatus === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : viewingRequest.discountReviewStatus === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : viewingRequest.discountReviewStatus === "PARTIALLY_APPROVED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                    }`}>
                      {viewingRequest.discountReviewStatus === "REJECTED"
                        ? "Disapproved (Reverted to Regular)"
                        : viewingRequest.discountReviewStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-slate-800 text-sm">Final Fare Charged:</span>
                  <span className="font-extrabold text-[#000C7D] text-lg">₱{viewingRequest.fare}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Booking Time</p>
              <p className="font-bold text-slate-500 mt-0.5">{formatDateTime(bookingTimestamp)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Finished Time</p>
              {completedTimestamp ? (
                <div>
                  <p className="font-bold text-emerald-600 mt-0.5">{formatDateTime(completedTimestamp)}</p>
                  {tripDuration && (
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      ⏱️ Duration: {tripDuration}
                    </p>
                  )}
                </div>
              ) : viewingRequest.status === "Cancelled" ? (
                <p className="font-medium text-rose-500 text-xs mt-1">Trip Cancelled</p>
              ) : (
                <p className="font-medium text-slate-400 text-xs mt-1 italic">
                  {viewingRequest.status === "In Transit" ? "Trip In Progress" : "Not Finished Yet"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">TODA Association</p>
              <p className="font-bold text-slate-600 mt-0.5">{viewingRequest.toda}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Route Distance</p>
              <p className="font-bold text-[#000C7D] mt-0.5">
                {distanceKm != null ? `${distanceKm.toFixed(2)} km` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ride Status</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${viewingRequest.status === "Completed"
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
                    {formatDateTime(viewingRequest.cancelled_at)}
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

          {/* Companions Roster / Solo Rider Notice */}
          {isSolo ? (
            <div className="border border-slate-200 bg-slate-50/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600">
              <span className="text-lg">👤</span>
              <div>
                <p className="font-bold text-slate-800 text-sm">Solo Passenger Ride</p>
                <p className="text-slate-500 mt-0.5">
                  The primary passenger rode alone with no companions. The passenger category was{" "}
                  <strong className="text-slate-700">{primaryType}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-indigo-900 font-extrabold uppercase tracking-wider">
                  Companion Roster ({companionCount} {companionCount === 1 ? "Companion" : "Companions"})
                </p>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  Excluding Primary Booker
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {companionsList.map((companion, cIdx) => (
                  <div key={cIdx} className="bg-white border border-indigo-100/80 rounded-xl p-3 flex items-start justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {companion.index}
                        </span>
                        <p className="font-bold text-[#000C7D] text-sm">
                          Companion {companion.index}: {companion.type}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-1 pl-7">
                        {companion.verificationMode}
                        {companion.reviewedAt ? ` • Reviewed ${formatDateTime(companion.reviewedAt)}` : ""}
                      </p>
                      {companion.rejectionReason && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 pl-7">
                          Reason: {companion.rejectionReason}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                        companion.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : companion.status === "REJECTED"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : companion.status === "STANDARD"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {companion.status === "STANDARD" ? "Standard Fare" : companion.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 mt-2 flex items-center justify-end gap-3">
            {/* COMMENT THIS TO HIDE DELETE BUTTON */}
            <button
              type="button"
              onClick={() => onDeleteRequest(viewingRequest.id)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-sm hover:shadow"
            >
              Delete Ride Request
            </button>
            {/* COMMENT THIS TO HIDE DELETE BUTTON */}
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
