import React, { useEffect, useMemo, useState } from "react";
import { Driver, DriverProfileChangeRequest, Passenger, RideRequest } from "../../types";
import { supabase } from "../../lib/supabase";

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingUser: Driver | Passenger | null;
  viewingUserType: "driver" | "passenger" | null;
  onDeactivatePassengerToggle?: (id: string) => void;
  onResetCanceledTrips: (id: string) => void;
  onLiftPassengerRestriction?: (id: string) => Promise<void> | void;
  onRestrictPassenger?: (id: string, reason?: string) => Promise<void> | void;
  onDeleteDriver: (driver: Driver) => void;
  onDeletePassenger: (passenger: Passenger) => void;
  onRefreshData?: () => void;
  rideRequests?: RideRequest[];
  driverChangeRequests?: DriverProfileChangeRequest[];
  onReviewChangeRequest?: (requestId: string, status: "APPROVED" | "REJECTED", reason?: string) => Promise<void> | void;
}

const statusBadge = (status: string) => {
  if (status === "Active" || status === "ACTIVE" || status === "VERIFIED") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (status === "Warning" || status === "PENDING") return "bg-amber-50 text-amber-600 border-amber-100";
  return "bg-rose-50 text-rose-600 border-rose-100";
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
    <div className="font-bold text-slate-700 mt-0.5 break-words">{value}</div>
  </div>
);

const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const days = Math.floor(safeMinutes / 1440);
  const remainingMins = safeMinutes % 1440;
  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;

  if (days > 0) {
    const dayLabel = days === 1 ? "1 day" : `${days} days`;
    if (hours === 0 && mins === 0) return dayLabel;
    if (hours === 0) return `${dayLabel} ${mins}m`;
    if (mins === 0) return `${dayLabel} ${hours}h`;
    return `${dayLabel} ${hours}h ${mins}m`;
  }
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const FilePicker = ({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) => {
  const inputId = React.useId();

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] text-slate-400 font-bold uppercase">{label}</label>
      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="px-3 py-1.5 bg-[#000C7D] text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-blue-900"
        >
          Browse
        </label>
        <span className="text-[10px] text-slate-500 font-semibold truncate">{file?.name || "No file selected"}</span>
      </div>
      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="hidden"
      />
    </div>
  );
};

async function resolveStorageUrl(
  rawUrl: string | null | undefined,
  defaultBucket: string = "driver-documents"
): Promise<string | null> {
  if (!rawUrl) return null;
  const bucketName = rawUrl.includes("/avatars/")
    ? "avatars"
    : rawUrl.includes("/discount-ids/")
    ? "discount-ids"
    : rawUrl.includes("/driver-documents/")
    ? "driver-documents"
    : rawUrl.includes("/licenses/")
    ? "licenses"
    : defaultBucket;

  let path = rawUrl;
  if (path.includes(`/${bucketName}/`)) {
    path = path.split(`/${bucketName}/`).pop() || path;
  } else if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      const parts = u.pathname.split(`/${bucketName}/`);
      if (parts.length > 1) {
        path = parts[1];
      } else {
        path = u.pathname.replace(/^\/+/, "");
      }
    } catch (_) {}
  }
  if (path.includes("?")) {
    path = path.split("?")[0];
  }
  path = path.replace(/^\/+/, "");

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(decodeURIComponent(path), 600);
    if (!error && data?.signedUrl) return data.signedUrl;
    const pub = supabase.storage
      .from(bucketName)
      .getPublicUrl(decodeURIComponent(path));
    return pub.data.publicUrl || rawUrl;
  } catch (_) {
    return rawUrl;
  }
}

export default function ViewUserModal({
  isOpen,
  onClose,
  viewingUser,
  viewingUserType,
  onResetCanceledTrips,
  onLiftPassengerRestriction,
  onRestrictPassenger,
  onDeleteDriver,
  onDeletePassenger,
  onRefreshData,
  rideRequests = [],
  driverChangeRequests = [],
  onReviewChangeRequest,
}: ViewUserModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [zoomType, setZoomType] = useState<
    "front" | "back" | "franchise" | "franchise_back" | "discount" | "discount_back" | "selfie" | "passenger_selfie" | null
  >(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [discountReviewReason, setDiscountReviewReason] = useState("");
  const [isReviewingDiscount, setIsReviewingDiscount] = useState(false);
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [franchiseNo, setFranchiseNo] = useState("");
  const [franchiseExpiry, setFranchiseExpiry] = useState("");
  const [franchiseFile, setFranchiseFile] = useState<File | null>(null);
  const [franchisePlateNo, setFranchisePlateNo] = useState("");
  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const [activeDriverAction, setActiveDriverAction] = useState<"restrict" | "clear" | null>(null);
  const [driverActionReason, setDriverActionReason] = useState("");
  const [isExecutingDriverAction, setIsExecutingDriverAction] = useState(false);
  const [activePassengerAction, setActivePassengerAction] = useState<"restrict" | "lift" | null>(null);
  const [passengerActionReason, setPassengerActionReason] = useState("");
  const [isExecutingPassengerAction, setIsExecutingPassengerAction] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [ridePage, setRidePage] = useState(1);
  const [passengerIdPreviewUrl, setPassengerIdPreviewUrl] = useState<string | null>(null);
  const [passengerIdBackPreviewUrl, setPassengerIdBackPreviewUrl] = useState<string | null>(null);
  const [driverSelfiePreviewUrl, setDriverSelfiePreviewUrl] = useState<string | null>(null);
  const [passengerSelfiePreviewUrl, setPassengerSelfiePreviewUrl] = useState<string | null>(null);
  const [selectedToda, setSelectedToda] = useState("");
  const [isUpdatingToda, setIsUpdatingToda] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const passengerDocumentUrl = viewingUserType === 'passenger' ? (viewingUser as Passenger | null)?.discountDocumentUrl : null;
  const passengerDocumentBackUrl = viewingUserType === 'passenger' ? (viewingUser as Passenger | null)?.discountDocumentBackUrl : null;

  useEffect(() => {
    let active = true;
    setPassengerIdPreviewUrl(null);
    setPassengerIdBackPreviewUrl(null);
    setDriverSelfiePreviewUrl(null);
    setPassengerSelfiePreviewUrl(null);
    setActivePassengerAction(null);
    setPassengerActionReason("");

    if (viewingUser && viewingUserType === "driver") {
      const driver = viewingUser as Driver;
      setLicenseNo(driver.license || "");
      setLicenseExpiry(driver.licenseExpiryDate || "");
      setFranchiseNo(driver.franchiseNumber || "");
      setFranchiseExpiry(driver.franchiseExpiryDate || "");
      setFranchisePlateNo(driver.plateNumber || "");
      setSelectedToda(driver.toda || "LHITC-TODA");
      setLicenseFrontFile(null);
      setLicenseBackFile(null);
      setFranchiseFile(null);
      setActiveDriverAction(null);
      setDriverActionReason("");
      setPassengerIdPreviewUrl(null);

      const driverSelfie = driver.selfiePhotoUrl || driver.avatarUrl;
      if (driverSelfie) {
        resolveStorageUrl(driverSelfie, "driver-documents").then((url) => {
          if (active) setDriverSelfiePreviewUrl(url);
        });
      }
    } else if (viewingUser && viewingUserType === "passenger") {
      const p = viewingUser as Passenger;
      const passSelfie = p.selfiePhotoUrl || p.avatarUrl;
      if (passSelfie) {
        resolveStorageUrl(passSelfie, "avatars").then((url) => {
          if (active) setPassengerSelfiePreviewUrl(url);
        });
      }
      if (p.discountDocumentUrl) {
        resolveStorageUrl(p.discountDocumentUrl, "discount-ids").then((url) => {
          if (active) setPassengerIdPreviewUrl(url);
        });
      } else {
        setPassengerIdPreviewUrl(null);
      }
      if (p.discountDocumentBackUrl) {
        resolveStorageUrl(p.discountDocumentBackUrl, "discount-ids").then((url) => {
          if (active) setPassengerIdBackPreviewUrl(url);
        });
      } else {
        setPassengerIdBackPreviewUrl(null);
      }
    }
    setDiscountReviewReason("");
    setRidePage(1);
    return () => { active = false; };
    // Preserve unsaved form inputs when background synchronization replaces the row object.
  }, [viewingUser?.id, viewingUserType, isOpen, passengerDocumentUrl, passengerDocumentBackUrl]);

  const passengerRideHistory = useMemo(() => {
    if (!viewingUser || viewingUserType !== "passenger") return [];
    return rideRequests.filter((request) => request.passengerId === viewingUser.id);
  }, [rideRequests, viewingUser, viewingUserType]);

  const ridePageCount = Math.max(1, Math.ceil(passengerRideHistory.length / 3));
  const visibleRideHistory = passengerRideHistory.slice((ridePage - 1) * 3, ridePage * 3);

  const driver = viewingUserType === "driver" ? viewingUser as Driver : null;
  const passenger = viewingUserType === "passenger" ? viewingUser as Passenger : null;
  const visibleDriverChangeRequests = driver
    ? driverChangeRequests.filter((request) => request.driverId === driver.id)
    : [];

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isOpen || viewingUserType !== "driver") return;
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [isOpen, viewingUserType]);

  const liveOnlineMins = driver && driver.isOnline && driver.lastOnlineAt
    ? Math.max(0, Math.floor((now - new Date(driver.lastOnlineAt).getTime()) / 60000))
    : (driver?.liveOnlineMinutes || 0);

  const totalOnlineMins = (driver?.totalOnlineMinutes || 0) + (driver?.isOnline ? liveOnlineMins : 0);

  // Directly fetch created_at from database if in-memory driver state lacked it
  const [dbCreatedAt, setDbCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || viewingUserType !== "driver" || !driver) {
      setDbCreatedAt(null);
      return;
    }
    const existing = driver.createdAt || (driver as any).created_at;
    if (existing) {
      setDbCreatedAt(existing);
      return;
    }

    let isCancelled = false;
    supabase
      .from("drivers")
      .select("created_at, profile_id")
      .eq("id", driver.id)
      .maybeSingle()
      .then(async ({ data: driverRow }) => {
        if (isCancelled) return;
        if (driverRow?.created_at) {
          setDbCreatedAt(driverRow.created_at);
          return;
        }
        const profileId = driverRow?.profile_id || driver.profileId;
        if (profileId) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("created_at")
            .eq("id", profileId)
            .maybeSingle();
          if (!isCancelled && profileRow?.created_at) {
            setDbCreatedAt(profileRow.created_at);
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, viewingUserType, driver?.id, driver?.createdAt, (driver as any)?.created_at]);

  const effectiveCreatedAt = driver?.createdAt || (driver as any)?.created_at || dbCreatedAt;

  if (!isOpen || !viewingUser) return null;

  const handleZoomClick = async (
    type: "front" | "back" | "franchise" | "franchise_back" | "discount" | "discount_back" | "selfie" | "passenger_selfie"
  ) => {
    const url =
      type === "front" ? driver?.licenseFrontUrl || driver?.licensePhotoUrl || "" :
      type === "back" ? driver?.licenseBackUrl || "" :
      type === "franchise" ? driver?.franchiseUrl || "" :
      type === "franchise_back" ? driver?.franchiseBackUrl || "" :
      type === "selfie" ? driver?.selfiePhotoUrl || driver?.avatarUrl || "" :
      type === "passenger_selfie" ? passenger?.selfiePhotoUrl || passenger?.avatarUrl || "" :
      type === "discount_back" ? passenger?.discountDocumentBackUrl || "" :
      passenger?.discountDocumentUrl || "";

    if (!url) return;
    setZoomType(type);
    setLoadingSignedUrl(true);

    try {
      const defaultBucket =
        (type === "selfie" || type === "passenger_selfie")
          ? "avatars"
          : (type === "discount" || type === "discount_back")
          ? "discount-ids"
          : type === "front" || type === "back"
          ? "licenses"
          : "driver-documents";

      const resolved = await resolveStorageUrl(url, defaultBucket);
      setSignedUrl(resolved || url);
    } catch (err) {
      console.error("Failed to generate signed URL:", err);
      setSignedUrl(url);
    } finally {
      setLoadingSignedUrl(false);
    }
  };

  const uploadDocFile = async (userId: string, file: File, label: string) => {
    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${userId}-${label}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("driver-documents").upload(fileName, file, { upsert: true });
    if (error) throw new Error(`Failed to upload ${label}: ${error.message}`);
    return supabase.storage.from("driver-documents").getPublicUrl(fileName).data.publicUrl;
  };

  const handleUpdateToda = async (newToda?: string) => {
    if (!driver) return;
    const todaToSave = newToda || selectedToda;
    if (!todaToSave) return;
    setIsUpdatingToda(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ toda_association: todaToSave, updated_at: new Date().toISOString() })
        .eq('id', driver.id);

      if (error) throw error;
      alert(`Driver TODA association updated to ${todaToSave}`);
      onRefreshData?.();
    } catch (err: any) {
      console.error("Failed to update TODA association:", err);
      alert(`Failed to update TODA: ${err.message || err}`);
    } finally {
      setIsUpdatingToda(false);
    }
  };

  const handleSaveDocuments = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!driver) return;
    setIsSavingDocs(true);

    try {
      const updates: Record<string, string | null> = {};
      if (licenseNo) updates.license_number = licenseNo;
      if (licenseExpiry) updates.license_expiry_date = licenseExpiry;
      if (franchiseNo) updates.franchise_number = franchiseNo;
      if (franchiseExpiry) updates.franchise_expiry_date = franchiseExpiry;

      if (franchisePlateNo) {
        const { error } = await supabase.from("vehicles").update({ plate_number: franchisePlateNo }).eq("driver_id", driver.id);
        if (error) throw error;
      }

      if (licenseFrontFile) {
        const frontUrl = await uploadDocFile(driver.id, licenseFrontFile, "front");
        updates.license_front_url = frontUrl;
        updates.license_photo_url = frontUrl;
      }
      if (licenseBackFile) updates.license_back_url = await uploadDocFile(driver.id, licenseBackFile, "back");
      if (franchiseFile) updates.franchise_url = await uploadDocFile(driver.id, franchiseFile, "franchise");

      const { error } = await supabase.from("drivers").update(updates).eq("id", driver.id);
      if (error) throw error;

      alert("Driver documents saved.");
      onRefreshData?.();
      onClose();
    } catch (err: any) {
      console.error("Error saving documents:", err);
      alert(`Failed to save documents: ${err.message || err}`);
    } finally {
      setIsSavingDocs(false);
    }
  };

  const handleReviewDiscount = async (status: "VERIFIED" | "REJECTED") => {
    if (!passenger || isReviewingDiscount) return;
    if (status === "REJECTED" && !discountReviewReason.trim()) {
      alert("Please add a rejection reason.");
      return;
    }

    setIsReviewingDiscount(true);
    try {
      const { error } = await supabase.rpc("review_passenger_discount_document", {
        p_passenger_id: passenger.id,
        p_status: status,
        p_reason: status === "REJECTED" ? discountReviewReason.trim() : null,
      });
      if (error) {
        console.warn("RPC failed, falling back to direct table update:", error.message);
        const { error: pError } = await supabase
          .from("passengers")
          .update({
            discount_document_status: status,
            discount_document_rejection_reason: status === "REJECTED" ? discountReviewReason.trim() : null,
            discount_document_reviewed_at: new Date().toISOString(),
            discount_eligible: false,
          })
          .eq("id", passenger.id);
        if (pError) throw pError;

        if (passenger.profileId) {
          await supabase
            .from("profiles")
            .update({ is_active: status === "VERIFIED", updated_at: new Date().toISOString() })
            .eq("id", passenger.profileId);
        }
      }
      alert(status === "VERIFIED" ? "Passenger ID approved and account activated." : "Passenger ID rejected.");
      onRefreshData?.();
      onClose();
    } catch (err: any) {
      console.error("ID verification review failed:", err);
      alert(err.message || "Failed to review passenger ID.");
    } finally {
      setIsReviewingDiscount(false);
    }
  };

  const handleDriverAction = async () => {
    if (!driver || !activeDriverAction) return;
    if (activeDriverAction === "restrict" && !driverActionReason.trim()) {
      alert("Please enter a restriction reason.");
      return;
    }

    setIsExecutingDriverAction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (activeDriverAction === "restrict") {
        const { error: rpcError } = await supabase.rpc("admin_restrict_driver", {
          p_driver_id: driver.id,
          p_reason: driverActionReason.trim(),
        });
        if (rpcError) {
          console.warn("RPC admin_restrict_driver unavailable, falling back to direct table update:", rpcError);
          const { error } = await supabase
            .from("drivers")
            .update({
              admin_action_type: "restricted",
              admin_action_reason: driverActionReason.trim(),
              admin_action_date: new Date().toISOString(),
              admin_action_by: session?.user?.id || null,
              is_online: false,
            })
            .eq("id", driver.id);
          if (error) throw error;

          const recipientId = driver.profileId || driver.id;
          await supabase.from("notifications").insert({
            recipient_id: recipientId,
            type: "in_app",
            title: "Account Restricted",
            body: `Your driver account has been restricted by the administrator. Reason: ${driverActionReason.trim()}`,
            notification_category: "account_status",
            data: {
              action: "driver_restricted",
              reason: driverActionReason.trim(),
              date: new Date().toISOString(),
            },
          });
        }
      } else {
        const { error: rpcError } = await supabase.rpc("admin_lift_driver_restriction", {
          p_driver_id: driver.id,
        });
        if (rpcError) {
          console.warn("RPC admin_lift_driver_restriction unavailable, falling back to direct table update:", rpcError);
          const { error } = await supabase
            .from("drivers")
            .update({
              admin_action_type: null,
              admin_action_reason: null,
              admin_action_date: null,
              admin_action_by: null,
            })
            .eq("id", driver.id);
          if (error) throw error;

          const recipientId = driver.profileId || driver.id;
          await supabase.from("notifications").insert({
            recipient_id: recipientId,
            type: "in_app",
            title: "Restriction Lifted",
            body: "Your driver account restriction has been lifted by the administrator. You may now go online and accept rides.",
            notification_category: "account_status",
            data: {
              action: "driver_restriction_lifted",
              date: new Date().toISOString(),
            },
          });
        }
      }

      alert(activeDriverAction === "clear" ? "Driver restriction removed." : "Driver restricted successfully.");
      onRefreshData?.();
      onClose();
    } catch (err: any) {
      console.error("Driver action failed:", err);
      alert(err.message || "Failed to update driver.");
    } finally {
      setIsExecutingDriverAction(false);
    }
  };

  const handlePassengerAction = async () => {
    if (!passenger || !activePassengerAction) return;
    if (activePassengerAction === "restrict" && !passengerActionReason.trim()) {
      alert("Please enter a restriction reason.");
      return;
    }

    setIsExecutingPassengerAction(true);
    try {
      if (activePassengerAction === "restrict") {
        if (onRestrictPassenger) {
          await onRestrictPassenger(passenger.id, passengerActionReason.trim());
        }
      } else {
        if (onLiftPassengerRestriction) {
          await onLiftPassengerRestriction(passenger.id);
        } else {
          onResetCanceledTrips(passenger.id);
        }
      }

      alert(activePassengerAction === "lift" ? "Passenger restriction lifted." : "Passenger restricted successfully.");
      setActivePassengerAction(null);
      setPassengerActionReason("");
      onRefreshData?.();
      onClose();
    } catch (err: any) {
      console.error("Passenger action failed:", err);
      alert(err.message || "Failed to update passenger.");
    } finally {
      setIsExecutingPassengerAction(false);
    }
  };

  const fieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      full_name: "Full Name",
      toda_association: "TODA Association",
      license_number: "License Number",
      plate_number: "Plate Number",
      phone_number: "Phone Number",
      email: "Email",
      address: "Address",
    };
    return labels[fieldName] || fieldName.replace(/_/g, " ");
  };

  const handleReviewChangeRequest = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !changeRequestReason.trim()) {
      alert("Please add a rejection reason.");
      return;
    }
    setReviewingRequestId(requestId);
    try {
      if (onReviewChangeRequest) {
        await onReviewChangeRequest(requestId, status, changeRequestReason.trim());
      } else {
        const { error } = await supabase.rpc("review_driver_profile_change_request", {
          p_request_id: requestId,
          p_status: status,
          p_reason: status === "REJECTED" ? changeRequestReason.trim() : null,
        });
        if (error) throw error;
      }
      setChangeRequestReason("");
      await onRefreshData?.();
    } catch (err: any) {
      alert(err.message || "Failed to review driver change request.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 max-h-[90vh]">
        <div className="bg-[#000C7D] text-white px-6 py-5 flex items-center justify-between">
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                {driver ? "Driver Account" : "Passenger Account"}
              </span>
              {driver && effectiveCreatedAt && (
                <span className="text-[10px] text-sky-100 bg-white/10 px-2 py-0.5 rounded-full font-medium">
                  Created: {new Date(effectiveCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {new Date(effectiveCreatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              )}
            </div>
            <h3 className="font-bold text-lg">Details</h3>
          </div>
          <button onClick={onClose} className="text-white/85 hover:text-white transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 text-left overflow-y-auto">
          {driver && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                <Field label="Driver Name" value={driver.name} />
                <Field label="Phone Number" value={driver.phone} />
                <Field label="Email" value={driver.email || "N/A"} />
                <Field label="Address" value={driver.address || "N/A"} />
                <Field label="Plate Number" value={<span className="font-mono">{driver.plateNumber || "N/A"}</span>} />
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TODA Association</label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={selectedToda || driver.toda || "LHITC-TODA"}
                      onChange={(e) => setSelectedToda(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-white text-[#000C7D] outline-hidden focus:border-blue-500 cursor-pointer flex-1"
                    >
                      <option value="LHITC-TODA">LHITC-TODA</option>
                      <option value="BYPASS ILAYANG BAGUIO-TODA">BYPASS ILAYANG BAGUIO-TODA</option>
                      <option value="CHOT-TODA">CHOT-TODA</option>
                    </select>
                    {selectedToda && selectedToda !== driver.toda && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToda()}
                        disabled={isUpdatingToda}
                        className="px-2.5 py-1 bg-[#000C7D] hover:bg-blue-900 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isUpdatingToda ? "..." : "Save"}
                      </button>
                    )}
                  </div>
                </div>
                <Field
                  label="Document Status"
                  value={<span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(driver.documentStatus || "PENDING")}`}>{driver.documentStatus || "PENDING"}</span>}
                />
                <Field
                  label="Activity Status"
                  value={<span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(driver.activityStatus)}`}>{driver.activityStatus}</span>}
                />
                <Field
                  label="Online State"
                  value={driver.isOnline ? "Online" : "Offline"}
                />
                <Field
                  label="Total Online Time"
                  value={formatMinutes(totalOnlineMins)}
                />
                <Field
                  label="Current Session"
                  value={driver.isOnline ? formatMinutes(liveOnlineMins) : "Not active"}
                />
                <Field
                  label="Last Completed Ride"
                  value={driver.lastCompletedRideAt ? new Date(driver.lastCompletedRideAt).toLocaleString() : "Never"}
                />
                <Field
                  label="Account Created"
                  value={
                    effectiveCreatedAt ? (
                      <span className="font-medium text-slate-700">
                        {new Date(effectiveCreatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(effectiveCreatedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      "N/A"
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-4 border border-slate-100 p-4 rounded-2xl bg-slate-50/20">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Driver Documents & Verification</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Driver Verification Selfie Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#000C7D] uppercase">Verification Selfie</span>
                    </div>
                    <div
                      onClick={() => (driver.selfiePhotoUrl || driver.avatarUrl) && handleZoomClick("selfie")}
                      className={`relative w-full h-28 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center ${
                        (driver.selfiePhotoUrl || driver.avatarUrl) ? "cursor-pointer group shadow-xs" : ""
                      }`}
                    >
                      {driverSelfiePreviewUrl ? (
                        <>
                          <img
                            src={driverSelfiePreviewUrl}
                            alt="Driver Selfie Preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                            Click to enlarge
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-300">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span className="text-[10px] font-semibold">No selfie submitted yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#000C7D] uppercase">Driver License</span>
                    <Field label="License Number" value={driver.license || "N/A"} />
                    <Field label="Expiry Date" value={driver.licenseExpiryDate || "N/A"} />
                    <div className="flex gap-2 mt-1">
                      {driver.licenseFrontUrl && <button type="button" onClick={() => handleZoomClick("front")} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg cursor-pointer">Front Image</button>}
                      {driver.licenseBackUrl && <button type="button" onClick={() => handleZoomClick("back")} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg cursor-pointer">Back Image</button>}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#000C7D] uppercase">Franchise / Permit</span>
                    <Field label="Franchise Number" value={driver.franchiseNumber || "N/A"} />
                    <Field label="Expiry Date" value={driver.franchiseExpiryDate || "N/A"} />
                    <div className="flex gap-2 mt-1">
                      {driver.franchiseUrl && <button type="button" onClick={() => handleZoomClick("franchise")} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg cursor-pointer">Front / Permit</button>}
                      {driver.franchiseBackUrl && <button type="button" onClick={() => handleZoomClick("franchise_back")} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg cursor-pointer">Back Image</button>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border border-slate-100 p-4 rounded-2xl bg-slate-50/20">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Driver Change Requests</h4>
                {visibleDriverChangeRequests.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-500">No submitted change requests.</p>
                ) : (
                  visibleDriverChangeRequests.map((request) => (
                    <div key={request.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <Field label="Field" value={fieldLabel(request.fieldName)} />
                        <Field label="Current" value={request.currentValue || "N/A"} />
                        <Field label="Requested" value={request.requestedValue} />
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                        <span className={`self-start inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(request.status)}`}>
                          {request.status}
                        </span>
                        {request.status === "PENDING" && (
                          <div className="flex flex-col md:flex-row gap-2 md:items-center">
                            <input
                              value={changeRequestReason}
                              onChange={(event) => setChangeRequestReason(event.target.value)}
                              placeholder="Rejection reason"
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => handleReviewChangeRequest(request.id, "APPROVED")}
                              disabled={reviewingRequestId === request.id}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewChangeRequest(request.id, "REJECTED")}
                              disabled={reviewingRequestId === request.id}
                              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSaveDocuments} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase text-[#000C7D] tracking-wider border-b border-slate-200 pb-2">
                  Upload & Edit Document Fields
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#000C7D] uppercase">License Input</span>
                    <input type="text" value={licenseNo} onChange={(event) => setLicenseNo(event.target.value)} placeholder="License number" className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#000C7D]" />
                    <input type="date" value={licenseExpiry} onChange={(event) => setLicenseExpiry(event.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#000C7D] cursor-pointer" />
                    <FilePicker label="Front Photo" file={licenseFrontFile} onChange={setLicenseFrontFile} />
                    <FilePicker label="Back Photo" file={licenseBackFile} onChange={setLicenseBackFile} />
                  </div>
                  <div className="flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#000C7D] uppercase">Franchise Input</span>
                    <input type="text" value={franchiseNo} onChange={(event) => setFranchiseNo(event.target.value)} placeholder="Franchise number" className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#000C7D]" />
                    <input type="date" value={franchiseExpiry} onChange={(event) => setFranchiseExpiry(event.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#000C7D] cursor-pointer" />
                    <input type="text" value={franchisePlateNo} onChange={(event) => setFranchisePlateNo(event.target.value)} placeholder="Plate number" className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#000C7D]" />
                    <FilePicker label="Permit Image" file={franchiseFile} onChange={setFranchiseFile} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button type="submit" disabled={isSavingDocs} className="px-5 py-2 bg-[#000C7D] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60">
                    {isSavingDocs ? "Saving Documents..." : "Upload & Save Documents"}
                  </button>
                </div>
              </form>

              <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/20 flex flex-col gap-3">
                {driver.adminActionType && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <p className="text-xs text-rose-800 font-bold uppercase">Restricted: {driver.adminActionType}</p>
                    <p className="text-xs text-rose-600 font-semibold mt-1">Reason: {driver.adminActionReason || "No reason specified"}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {driver.adminActionType ? (
                    <button
                      type="button"
                      onClick={() => setActiveDriverAction("clear")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Lift Restriction
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveDriverAction("restrict")}
                      className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer"
                    >
                      Restrict Driver
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isDeletingUser}
                    onClick={async () => {
                      setIsDeletingUser(true);
                      try {
                        await onDeleteDriver(driver);
                      } finally {
                        setIsDeletingUser(false);
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 text-white border border-rose-600 rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeletingUser ? "Deleting Driver..." : "Remove Driver"}
                  </button>
                </div>
                {activeDriverAction && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
                    {activeDriverAction === "restrict" ? (
                      <textarea
                        rows={2}
                        placeholder="Reason for restriction (e.g. reported violation, misconduct, temporary hold)"
                        value={driverActionReason}
                        onChange={(event) => setDriverActionReason(event.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-400 resize-none"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 font-semibold">
                        Confirm lifting this driver's restriction. The driver will be able to go online and accept rides again.
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setActiveDriverAction(null)} className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer">Cancel</button>
                      <button type="button" onClick={handleDriverAction} disabled={isExecutingDriverAction} className="px-4 py-1.5 bg-[#000C7D] hover:bg-blue-900 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60">
                        {isExecutingDriverAction ? "Processing..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {passenger && (() => {
            const isPassengerRestricted = Boolean(
              passenger.bookingRestrictionUntil && new Date(passenger.bookingRestrictionUntil) > new Date()
            );
            // passengerPolicyCancellations available if Passenger Cancellations (Max 3) field is re-enabled
            // const passengerPolicyCancellations = passenger.passengerCancelledTrips ?? passenger.canceledTrips;
            const driverCancellations = passenger.driverCancelledTrips ?? 0;
            const restrictionDaysRemaining = isPassengerRestricted && passenger.bookingRestrictionUntil
              ? Math.max(1, Math.ceil((new Date(passenger.bookingRestrictionUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0;

            return (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <Field label="Passenger Name" value={passenger.name} />
                  <Field label="Contact Number" value={passenger.contact} />
                  <Field label="Email" value={passenger.email || "N/A"} />
                  <Field label="Joined Date" value={passenger.joinedDate} />
                  <Field label="ID Verification" value={passenger.discountDocumentStatus || "NOT_REQUIRED"} />
                  <Field label="Total Rides Taken" value={`${passenger.ridesTaken} Rides`} />
                  <Field label="Cancelled Trip History" value={`${passenger.canceledTrips} Cancelled`} />
                  {/* Passenger Cancellations (Max 3) field — hidden for now
                  <Field
                    label="Passenger Cancellations (Max 3)"
                    value={
                      <div className="flex items-center gap-2">
                        <span className={passengerPolicyCancellations >= 3 ? "text-rose-600 font-extrabold" : passengerPolicyCancellations >= 2 ? "text-amber-600 font-bold" : "text-slate-700"}>
                          {passengerPolicyCancellations} / 3 Cancelled
                        </span>
                        {isPassengerRestricted && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">
                            Restricted
                          </span>
                        )}
                        {passengerPolicyCancellations === 2 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">
                            Warning
                          </span>
                        )}
                      </div>
                    }
                  />
                  */}
                  <Field label="Driver Cancellations" value={`${driverCancellations} Cancelled`} />
                  <Field
                    label="Warning Status"
                    value={
                      passenger.warningStatus ? (
                        <span className="text-amber-600 font-bold">Active Warning</span>
                      ) : (
                        <span className="text-slate-500 font-normal">No Warning</span>
                      )
                    }
                  />
                  <div className="col-span-2">
                    <Field
                      label="Booking Restriction Until"
                      value={
                        passenger.bookingRestrictionUntil ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={isPassengerRestricted ? "text-rose-600 font-bold" : "text-slate-600 font-medium"}>
                              {new Date(passenger.bookingRestrictionUntil).toLocaleString()}
                            </span>
                            {isPassengerRestricted && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-extrabold">
                                {restrictionDaysRemaining} days remaining
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold">No Restriction</span>
                        )
                      }
                    />
                  </div>
                  {isPassengerRestricted && (
                    <div className="col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                          Account Restricted
                        </p>
                        <p className="text-xs text-rose-600 font-medium mt-1">
                          Booking is restricted until{" "}
                          <span className="font-bold">
                            {new Date(passenger.bookingRestrictionUntil!).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>{" "}
                          ({restrictionDaysRemaining} days left).
                          {passenger.adminActionReason && (
                            <span className="block mt-1 font-semibold text-rose-700">
                              Reason: {passenger.adminActionReason}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onLiftPassengerRestriction
                            ? onLiftPassengerRestriction(passenger.id)
                            : onResetCanceledTrips(passenger.id)
                        }
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
                      >
                        Lift Restriction Immediately
                      </button>
                    </div>
                  )}
                {/* 1. Account Verification ID Card (Uploaded Document) */}
                <div className="col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Document Identification
                    </span>
                    <p className="font-bold text-[#000C7D]">Account Verification ID</p>
                    <p className="text-xs text-slate-500 font-semibold">
                      Status:{" "}
                      <span className={`font-bold ${
                        passenger.discountDocumentStatus === "VERIFIED"
                          ? "text-emerald-600"
                          : passenger.discountDocumentStatus === "REJECTED"
                          ? "text-rose-600"
                          : "text-amber-600"
                      }`}>
                        {passenger.discountDocumentStatus || (passenger.discountDocumentUrl ? "PENDING" : "NOT_SUBMITTED")}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Front Image Preview */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">Front Page of ID</span>
                      <div
                        onClick={() => passenger.discountDocumentUrl && handleZoomClick("discount")}
                        className={`relative w-full h-40 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center ${
                          passenger.discountDocumentUrl ? "cursor-pointer group shadow-xs" : ""
                        }`}
                      >
                        {passengerIdPreviewUrl ? (
                          <>
                            <img
                              src={passengerIdPreviewUrl}
                              alt="Front ID Preview"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                              Click to enlarge
                            </div>
                          </>
                        ) : passenger.discountDocumentUrl ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                            <span className="text-xs font-semibold">Loading front preview...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-300">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                              <circle cx="9" cy="9" r="2"/>
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                            </svg>
                            <span className="text-xs font-semibold">No front ID uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back Image Preview */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">Back Page of ID</span>
                      <div
                        onClick={() => passenger.discountDocumentBackUrl && handleZoomClick("discount_back")}
                        className={`relative w-full h-40 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center ${
                          passenger.discountDocumentBackUrl ? "cursor-pointer group shadow-xs" : ""
                        }`}
                      >
                        {passengerIdBackPreviewUrl ? (
                          <>
                            <img
                              src={passengerIdBackPreviewUrl}
                              alt="Back ID Preview"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                              Click to enlarge
                            </div>
                          </>
                        ) : passenger.discountDocumentBackUrl ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                            <span className="text-xs font-semibold">Loading back preview...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-300">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                              <circle cx="9" cy="9" r="2"/>
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                            </svg>
                            <span className="text-xs font-semibold">No back ID uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {passenger.discountDocumentStatus === "PENDING" && (passenger.discountDocumentUrl || passenger.discountDocumentBackUrl) && (
                    <div className="flex flex-col gap-3 mt-1">
                      <textarea
                        value={discountReviewReason}
                        onChange={(event) => setDiscountReviewReason(event.target.value)}
                        rows={2}
                        placeholder="Rejection reason, required only when rejecting."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 resize-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewDiscount("VERIFIED")}
                          disabled={isReviewingDiscount}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-60 cursor-pointer shadow-sm"
                        >
                          {isReviewingDiscount ? "Processing..." : "Approve ID & Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewDiscount("REJECTED")}
                          disabled={isReviewingDiscount}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-60 cursor-pointer shadow-sm"
                        >
                          {isReviewingDiscount ? "Processing..." : "Reject ID"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Passenger Verification Selfie Card (Under the ID) */}
                <div className="col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#000C7D] uppercase">Verification Selfie</span>
                  </div>
                  <div
                    onClick={() => (passenger.selfiePhotoUrl || passenger.avatarUrl) && handleZoomClick("passenger_selfie")}
                    className={`relative w-full max-w-xs h-40 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center ${
                      (passenger.selfiePhotoUrl || passenger.avatarUrl) ? "cursor-pointer group shadow-xs" : ""
                    }`}
                  >
                    {passengerSelfiePreviewUrl ? (
                      <>
                        <img
                          src={passengerSelfiePreviewUrl}
                          alt="Passenger Selfie Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          Click to enlarge
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-300">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span className="text-xs font-semibold">No selfie provided</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-5">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Ride History</h4>
                {passengerRideHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No bookings found for this passenger.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 font-bold uppercase">
                            <th className="p-2.5">Driver</th>
                            <th className="p-2.5">Route</th>
                            <th className="p-2.5">Fare</th>
                            <th className="p-2.5">Time</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {visibleRideHistory.map((request) => (
                            <tr key={request.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-[#000C7D]">{request.driver}</td>
                              <td className="p-2.5">
                                <p className="font-bold text-slate-700">{request.location}</p>
                                <p className="text-[10px] text-slate-400 font-normal">{request.destination}</p>
                              </td>
                              <td className="p-2.5 font-bold text-[#000C7D]">₱{request.fare.toLocaleString()}</td>
                              <td className="p-2.5 text-slate-500">{request.time}</td>
                              <td className="p-2.5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(request.status)}`}>
                                  {request.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {passengerRideHistory.length > 3 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-semibold">Page {ridePage} of {ridePageCount}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setRidePage((current) => Math.max(1, current - 1))} disabled={ridePage === 1} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Previous</button>
                          <button onClick={() => setRidePage((current) => Math.min(ridePageCount, current + 1))} disabled={ridePage === ridePageCount} className="px-3 py-1.5 bg-[#000C7D] text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-center flex-wrap">
                  {isPassengerRestricted ? (
                    <button
                      type="button"
                      onClick={() => setActivePassengerAction("lift")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Lift Restriction
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActivePassengerAction("restrict")}
                      className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer"
                    >
                      Restrict Passenger
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isDeletingUser}
                    onClick={async () => {
                      setIsDeletingUser(true);
                      try {
                        await onDeletePassenger(passenger);
                      } finally {
                        setIsDeletingUser(false);
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeletingUser ? "Deleting Passenger..." : "Delete Passenger"}
                  </button>
                </div>

                {activePassengerAction && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
                    {activePassengerAction === "restrict" ? (
                      <textarea
                        rows={2}
                        placeholder="Reason for restriction (e.g. repeated booking cancellations, abusive behavior, policy violation)"
                        value={passengerActionReason}
                        onChange={(event) => setPassengerActionReason(event.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#000C7D] outline-hidden focus:border-blue-400 resize-none"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 font-semibold">
                        Confirm lifting this passenger's booking restriction. The passenger will be able to book rides again immediately.
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePassengerAction(null)}
                        className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handlePassengerAction}
                        disabled={isExecutingPassengerAction}
                        className="px-4 py-1.5 bg-[#000C7D] hover:bg-blue-900 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {isExecutingPassengerAction ? "Processing..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
            <button onClick={onClose} className="px-6 py-2.5 bg-[#000C7D] hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-xs hover:shadow">
              Close
            </button>
          </div>
        </div>
      </div>

      {zoomType && signedUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[150] p-4 transition-all animate-in fade-in duration-200"
          onClick={() => {
            setZoomType(null);
            setSignedUrl(null);
          }}
        >
          <button
            onClick={() => {
              setZoomType(null);
              setSignedUrl(null);
            }}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all border border-white/20 cursor-pointer shadow-md"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="max-w-3xl max-h-[85vh] bg-white p-3 rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95" onClick={(event) => event.stopPropagation()}>
            {loadingSignedUrl ? (
              <div className="p-12 text-center text-slate-600 font-bold">Generating signed preview...</div>
            ) : (
              <img src={signedUrl} alt="Zoomed Document" className="max-h-[70vh] max-w-full object-contain rounded-lg" />
            )}
            <div className="mt-3 text-center text-[#000C7D] font-extrabold text-sm uppercase">
              {zoomType === "front"
                ? "License Front Copy"
                : zoomType === "back"
                ? "License Back Copy"
                : zoomType === "franchise_back"
                ? "Franchise Back Copy"
                : zoomType === "discount"
                ? "Passenger Verification ID (Front)"
                : zoomType === "discount_back"
                ? "Passenger Verification ID (Back)"
                : zoomType === "selfie"
                ? "Driver Verification Selfie"
                : zoomType === "passenger_selfie"
                ? "Passenger Verification Selfie"
                : "Franchise Permit Copy"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
