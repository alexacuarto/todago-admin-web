import { useState, useMemo, useEffect, useRef } from "react";
import { fetchAllRows } from "./lib/databaseRows";
import { createDriverAccount } from "./lib/driverService";
import { createAdminAccount, deleteAdminAccount, updateAdminAccount } from "./lib/adminAccountService";
import { getDriverActivityStatus } from "./lib/driverActivity";
import { supabase } from "./lib/supabase";
import { AdminAccount, BookingStop, Driver, DriverProfileChangeRequest, FeedbackReport, Passenger, RideRequest } from "./types";

// Layout components
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";

// Views
import LoginView from "./components/views/LoginView";
import DashboardView from "./components/views/DashboardView";
import RideRequestsView from "./components/views/RideRequestsView";
import EarningsView from "./components/views/EarningsView";
import UsersView from "./components/views/UsersView";
import ProfileView from "./components/views/ProfileView";
import CreateDriverView from "./components/views/CreateDriverView";
import FareSettingsView from "./components/views/FareSettingsView";
import FeedbackView from "./components/views/FeedbackView";

// Modals
import EditDriverModal from "./components/modals/EditDriverModal";
import AddRequestModal from "./components/modals/AddRequestModal";
import ViewRequestModal from "./components/modals/ViewRequestModal";
import ViewUserModal from "./components/modals/ViewUserModal";
import StatBreakdownModal from "./components/modals/StatBreakdownModal";

export default function App() {
  // Authentication & Navigation State
  const [isVerifyingRole, setIsVerifyingRole] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setIsAuthorized] = useState<boolean | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [errorState, setErrorState] = useState<string | null>(null);
  const fetchInFlight = useRef(false);
  const refreshQueued = useRef(false);
  const sessionUserId = useRef<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings">("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState({
    name: "",
    email: "",
    status: "Active",
    password: "",
    avatarSeed: "alexa",
    avatarColor: "#38bdf8",
    avatarUrl: ""
  });

  // Drivers, Passengers, Ride Requests
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [driverChangeRequests, setDriverChangeRequests] = useState<DriverProfileChangeRequest[]>([]);
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([]);

  // Modal display states
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [showViewRequestModal, setShowViewRequestModal] = useState(false);
  const [showViewUserModal, setShowViewUserModal] = useState(false);
  const [activeStatModal, setActiveStatModal] = useState<string | null>(null);

  // Selected item states
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [viewingRequest, setViewingRequest] = useState<RideRequest | null>(null);
  const [viewingUser, setViewingUser] = useState<Driver | Passenger | null>(null);
  const [viewingUserType, setViewingUserType] = useState<"driver" | "passenger" | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    plateNumber: "",
    toda: "LHITC-TODA",
    status: "Active" as "Active" | "Inactive",
    licenseFrontImage: null as File | null,
    licenseFrontName: "",
    licenseBackImage: null as File | null,
    licenseBackName: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    franchiseImage: null as File | null,
    franchiseImageName: "",
    franchiseBackImage: null as File | null,
    franchiseBackName: "",
    franchiseNumber: "",
    franchiseExpiryDate: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    license: "",
    toda: "",
    status: "Active" as "Active" | "Inactive",
    email: "",
    address: "",
    plateNumber: "",
    licenseExpiryDate: "",
    franchiseNumber: "",
    franchiseExpiryDate: ""
  });

  const [newRequestData, setNewRequestData] = useState({
    passenger: "",
    driverId: "",
    location: "",
    destination: "",
    status: "Pending" as "Pending" | "In Transit" | "Scheduled" | "Completed" | "Cancelled",
    fare: ""
  });

  // Search & Filter states
  const [driverSearch, setDriverSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [earningsTodaFilter, setEarningsTodaFilter] = useState("All");
  const [userTodaFilter, setUserTodaFilter] = useState("All");
  const [usersSubTab, setUsersSubTab] = useState<"drivers" | "passengers" | "requests" | "admins">("drivers");

  // Administrator accounts state
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [activeAdminActionId, setActiveAdminActionId] = useState("");
  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });


  // Load live data from Supabase
  const fetchData = async (isInitial = false) => {
    if (fetchInFlight.current) {
      refreshQueued.current = true;
      return;
    }
    const requestedUserId = sessionUserId.current;
    if (!requestedUserId) return;
    fetchInFlight.current = true;
    if (isInitial) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setErrorState(null);
    try {
      console.log("[Supabase Query] Fetching profiles...");
      const profiles = await fetchAllRows("profiles");
      if (sessionUserId.current !== requestedUserId) return;
      const currentAdmin = profiles.find(profile => profile.id === requestedUserId);
      if (currentAdmin?.role !== 'admin' || currentAdmin.is_active !== true) {
        sessionUserId.current = null;
        setDrivers([]);
        setPassengers([]);
        setRideRequests([]);
        setAdminAccounts([]);
        setIsLoggedIn(false);
        setLoginError('Administrator access is no longer active.');
        return;
      }
      console.log("[Supabase Response] Profiles fetched:", profiles.length);

      console.log("[Supabase Query] Fetching passengers map...");
      const passengersColumns = `
          id,
          profile_id,
          created_at,
          cancel_count,
          last_cancel_date,
          booking_restriction_until,
          warning_status,
          account_passenger_type,
          selfie_photo_url,
          discount_document_url,
          discount_document_back_url,
          discount_document_status,
          discount_document_type,
          discount_document_rejection_reason,
          discount_document_submitted_at,
          discount_document_reviewed_at,
          discount_eligible,
          admin_action_type,
          admin_action_reason
        `;
      let passengersData: any[] = [];
      try {
        passengersData = await fetchAllRows("passengers", passengersColumns);
      } catch (err: any) {
        if (err?.message?.includes("admin_action") || String(err).includes("admin_action")) {
          console.warn("[Supabase Warning] admin_action fields not found on passengers table; falling back without them.");
          const passengersColumnsFallback = passengersColumns.replace(/admin_action_type,?\s*/g, "").replace(/admin_action_reason,?\s*/g, "");
          passengersData = await fetchAllRows("passengers", passengersColumnsFallback);
        } else {
          throw err;
        }
      }
      console.log("[Supabase Response] Passengers fetched:", passengersData?.length);

      console.log("[Supabase Query] Fetching vehicles...");
      const vehiclesData = await fetchAllRows("vehicles");
      console.log("[Supabase Response] Vehicles fetched:", vehiclesData?.length);

      console.log("[Supabase Query] Fetching drivers with profiles and vehicles...");
      const driversColumns = `
          id,
          status,
          license_number,
          license_photo_url,
          selfie_photo_url,
          is_online,
          created_at,
          toda_association,
          account_status,
          document_status,
          license_front_url,
          license_back_url,
          license_expiry_date,
          franchise_url,
          franchise_back_url,
          rejection_reason,
          franchise_number,
          franchise_expiry_date,
          profile_id,
          last_online_at,
          total_online_minutes,
          last_completed_ride_at,
          admin_action_type,
          admin_action_reason,
          admin_action_date,
          admin_action_by,
          document_issue_reason
        `;

      let driversData: any[] = [];
      try {
        driversData = await fetchAllRows("drivers", driversColumns);
      } catch (err: any) {
        if (err?.message?.includes("franchise_back_url") || String(err).includes("franchise_back_url")) {
          console.warn("[Supabase Warning] franchise_back_url not found on drivers table; falling back to schema without franchise_back_url.");
          const driversColumnsFallback = driversColumns.replace(/franchise_back_url,?\s*/g, "");
          driversData = await fetchAllRows("drivers", driversColumnsFallback);
        } else {
          throw err;
        }
      }
      console.log("[Supabase Response] Drivers fetched:", driversData.length);

      console.log("[Supabase Query] Fetching bookings...");
      const bookings = await fetchAllRows("bookings", `
          id,
          passenger_id,
          driver_id,
          status,
          trip_type,
          stops,
          total_stops,
          current_stop_index,
          pickup_address,
          dropoff_address,
          return_address,
          estimated_fare,
          actual_fare,
          regular_fare,
          provisional_discounted_fare,
          final_fare,
          discount_review_status,
          created_at,
          completed_at,
          pickup_latitude,
          pickup_longitude,
          dropoff_latitude,
          dropoff_longitude,
          return_latitude,
          return_longitude,
          passenger_qty,
          discount_passenger_type,
          cancelled_by,
          cancelled_at,
          cancel_reason,
          cancel_details,
          booking_discount_requests (
            id,
            booking_id,
            discount_type,
            companion_index,
            id_image_path,
            status,
            reviewed_by_driver_id,
            reviewed_at,
            rejection_reason
          )
        `, "created_at");
      console.log("[Supabase Response] Bookings fetched:", bookings.length);

      const changeRequestRows = await fetchAllRows("driver_profile_change_requests", "*", "created_at");
      const reportRows = await fetchAllRows("reports", "*", "created_at");

      // Map Passengers
      const allPassengerIds = new Set<string>();
      (profiles || [])
        .filter(p => p.role === "passenger")
        .forEach(p => allPassengerIds.add(p.id));
      (passengersData || []).forEach(pd => {
        allPassengerIds.add(pd.profile_id || pd.id);
      });

      const mappedPassengers: Passenger[] = Array.from(allPassengerIds).map(id => {
        const p = (profiles || []).find(prof => prof.id === id);
        const pd = (passengersData || []).find(pass => pass.profile_id === id || pass.id === id);
        const passengerId = pd ? pd.id : id;
        const profileId = pd?.profile_id || p?.id || id;

        const passengerBookings = bookings.filter(b => b.passenger_id === passengerId || b.passenger_id === id);
        const ridesTaken = passengerBookings.filter(b => b.status === "completed").length;
        const cancelledBookings = passengerBookings.filter(b => b.status === "cancelled");
        const policyCutoffMs = Date.now() - 31 * 24 * 60 * 60 * 1000;
        const canceledTrips = cancelledBookings.length;
        const passengerCancelledTrips = cancelledBookings.filter(
          b => {
            if (!(b.cancelled_by === "passenger" || b.cancelled_by == null)) return false;
            const policyDate = b.cancelled_at || b.created_at;
            return policyDate ? new Date(policyDate).getTime() >= policyCutoffMs : false;
          }
        ).length;
        const driverCancelledTrips = cancelledBookings.filter(b => b.cancelled_by === "driver").length;
        const lastCancelDate = pd ? (pd.last_cancel_date || null) : null;

        const rawCreatedAt = pd?.created_at || p?.created_at || null;
        let resolvedName = "Incomplete Profile";
        let resolvedContact = "No Contact";
        let resolvedStatus = "Inactive";
        let resolvedJoinedDate = rawCreatedAt ? rawCreatedAt.split("T")[0] : "N/A";
        let warningStatus = false;
        let bookingRestrictionUntil = null;

        if (p) {
          const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
          if (fullName) {
            resolvedName = fullName;
          } else if (p.full_name && p.full_name.trim()) {
            resolvedName = p.full_name.trim();
          } else if (p.email) {
            resolvedName = p.email.split("@")[0];
          } else if (p.phone_number) {
            resolvedName = `Passenger (${p.phone_number})`;
          }
          resolvedContact = p.phone_number || p.email || "No Contact";
          
          warningStatus = passengerCancelledTrips >= 2 || (pd ? (pd.warning_status || false) : false);
          bookingRestrictionUntil = pd ? (pd.booking_restriction_until || null) : null;

          if (bookingRestrictionUntil && new Date(bookingRestrictionUntil) > new Date()) {
            const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
            const dateStr = new Date(bookingRestrictionUntil).toLocaleDateString('en-US', options);
            resolvedStatus = `Restricted until ${dateStr}`;
          } else if (warningStatus) {
            resolvedStatus = "Warning";
          } else if (pd?.discount_document_status === "PENDING") {
            resolvedStatus = "For Approval";
          } else if (pd?.discount_document_status === "REJECTED" || !p.is_active) {
            resolvedStatus = "Inactive";
          } else {
            resolvedStatus = "Active";
          }
        }

        return {
          id: passengerId,
          profileId,
          name: resolvedName,
          contact: resolvedContact,
          email: p?.email || "",
          canceledTrips,
          passengerCancelledTrips,
          driverCancelledTrips,
          status: resolvedStatus,
          joinedDate: resolvedJoinedDate,
          createdAt: rawCreatedAt,
          created_at: rawCreatedAt,
          ridesTaken,
          warningStatus,
          bookingRestrictionUntil,
          lastCancelDate,
          avatarUrl: p?.avatar_url || pd?.selfie_photo_url || null,
          selfiePhotoUrl: pd?.selfie_photo_url || p?.avatar_url || pd?.discount_document_url || null,
          accountPassengerType: pd?.account_passenger_type || "Regular",
          discountDocumentUrl: pd?.discount_document_url || null,
          discountDocumentBackUrl: pd?.discount_document_back_url || null,
          discountDocumentStatus: pd?.discount_document_status || "NOT_REQUIRED",
          discountDocumentType: pd?.discount_document_type || null,
          discountDocumentRejectionReason: pd?.discount_document_rejection_reason || null,
          discountDocumentSubmittedAt: pd?.discount_document_submitted_at || null,
          discountDocumentReviewedAt: pd?.discount_document_reviewed_at || null,
          discountEligible: pd?.discount_eligible || false,
          adminActionType: pd?.admin_action_type || null,
          adminActionReason: pd?.admin_action_reason || null
        };
      }).filter(passenger => passenger.name !== "Incomplete Profile" && passenger.name !== "Unnamed Passenger");

      // Map Drivers
      const mappedDrivers: Driver[] = driversData.map((d: any) => {
        const profile = (profiles || []).find((p: any) => p.id === d.profile_id) || {};
        const vehicle = (vehiclesData || []).find((v: any) => v.driver_id === d.id) || {};
        const driverBookings = bookings.filter(b => b.driver_id === d.id && b.status === "completed");
        const tripsCount = driverBookings.length;

        const toda = (d.toda_association && d.toda_association.trim() && d.toda_association !== "Not provided")
          ? d.toda_association.trim()
          : "Not provided";

        // Compute activityStatus via single source of truth utility
        let lastCompletedTripDate: string | null = null;
        if (driverBookings.length > 0) {
          lastCompletedTripDate = driverBookings.reduce((latest: string | null, b: any) => {
            const date = b.completed_at || b.created_at;
            if (!date) return latest;
            if (!latest) return date;
            return new Date(date) > new Date(latest) ? date : latest;
          }, null);
        }
        const lastOnlineVal = d.last_online_at || null;
        const lastCompletedRideVal = d.last_completed_ride_at || lastCompletedTripDate;
        const activityStatus = getDriverActivityStatus(lastOnlineVal, lastCompletedRideVal, !!d.is_online);
        const liveOnlineMinutes = d.is_online && lastOnlineVal
          ? Math.max(0, Math.floor((Date.now() - new Date(lastOnlineVal).getTime()) / 60000))
          : 0;

        return {
          id: d.id,
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.full_name || profile.email?.split("@")[0] || (d.license_number && d.license_number !== "PENDING" ? `Driver (${d.license_number})` : "") || `Driver (${d.id.slice(0, 6)})`,
          toda,
          // Status is derived from document_status + admin_action_type.
          // The legacy `status` column is kept for backward compat only.
          status: d.admin_action_type
            ? "Restricted"
            : d.document_status === "VERIFIED"
            ? "Active"
            : "Inactive",
          phone: profile.phone_number || "No Contact",
          license: d.license_number || "PENDING",
          trips: tripsCount,
          joinedDate: d.created_at ? d.created_at.split("T")[0] : (profile.created_at ? profile.created_at.split("T")[0] : "N/A"),
          createdAt: d.created_at || profile.created_at || null,
          created_at: d.created_at || profile.created_at || null,
          email: profile.email || "",
          address: profile.address || "",
          plateNumber: vehicle.plate_number || "No Plate",
          isOnline: !!d.is_online,
          licensePhotoUrl: d.license_photo_url || null,
          avatarUrl: profile.avatar_url || d.selfie_photo_url || null,
          selfiePhotoUrl: d.selfie_photo_url || profile.avatar_url || null,
          activityStatus,
          accountStatus: d.account_status || "PENDING",
          licenseFrontUrl: d.license_front_url || null,
          licenseBackUrl: d.license_back_url || null,
          licenseExpiryDate: d.license_expiry_date || null,
          franchiseUrl: d.franchise_url || null,
          franchiseBackUrl: d.franchise_back_url || null,
          franchiseNumber: d.franchise_number || null,
          franchiseExpiryDate: d.franchise_expiry_date || null,
          documentStatus: d.document_status || "PENDING",
          rejectionReason: d.rejection_reason || null,
          profileId: d.profile_id,
          lastOnlineAt: lastOnlineVal,
          totalOnlineMinutes: d.total_online_minutes || 0,
          liveOnlineMinutes,
          lastCompletedRideAt: lastCompletedRideVal,
          adminActionType: d.admin_action_type || null,
          adminActionReason: d.admin_action_reason || null,
          adminActionDate: d.admin_action_date || null,
          adminActionBy: d.admin_action_by || null,
          documentIssueReason: d.document_issue_reason || null,
        };
      });

      const mappedChangeRequests: DriverProfileChangeRequest[] = (changeRequestRows || []).map((row: any) => ({
        id: row.id,
        driverId: row.driver_id,
        profileId: row.profile_id,
        fieldName: row.field_name,
        currentValue: row.current_value || null,
        requestedValue: row.requested_value || "",
        status: row.status || "PENDING",
        rejectionReason: row.rejection_reason || null,
        reviewedBy: row.reviewed_by || null,
        reviewedAt: row.reviewed_at || null,
        createdAt: row.created_at,
      }));

      // Map Ride Requests
      const mappedRequests: RideRequest[] = bookings.map((b: any) => {
        let passengerProfile: any = profiles.find(p => p.id === b.passenger_id);

        if (!passengerProfile && passengersData) {
          const passengerRow = passengersData.find(pd => pd.id === b.passenger_id);
          if (passengerRow) {
            passengerProfile = profiles.find(p => p.id === passengerRow.profile_id);
          }
        }

        passengerProfile = passengerProfile || {};
        const passengerName = `${passengerProfile.first_name || ""} ${passengerProfile.last_name || ""}`.trim() || passengerProfile.phone_number || passengerProfile.email || "Unknown Passenger";

        const driverObj = driversData.find((d: any) => d.id === b.driver_id || d.profile_id === b.driver_id);
        const driverProfile: any = driverObj
          ? (profiles || []).find((p: any) => p.id === driverObj.profile_id) || {}
          : (profiles || []).find((p: any) => p.id === b.driver_id) || {};

        let driverName = "Unassigned";
        if (driverObj || b.driver_id) {
          const resolvedName = `${driverProfile.first_name || ""} ${driverProfile.last_name || ""}`.trim() ||
            driverProfile.full_name ||
            driverProfile.email?.split("@")[0] ||
            (driverObj?.license_number && driverObj.license_number !== "PENDING" ? `Driver (${driverObj.license_number})` : "") ||
            (b.driver_id ? `Driver (${String(b.driver_id).slice(0, 6)})` : "");
          driverName = resolvedName || "Unassigned";
        }

        let toda = "Unassigned";
        if (driverObj || b.driver_id) {
          toda = (driverObj?.toda_association && driverObj.toda_association.trim() && driverObj.toda_association !== "Not provided")
            ? driverObj.toda_association.trim()
            : "LHITC-TODA";
        }

        let uiStatus: RideRequest["status"] = "Pending";
        if (b.status === "pending" || b.status === "searching") {
          uiStatus = "Pending";
        } else if (b.status === "accepted" || b.status === "driver_arriving" || b.status === "pickedUp") {
          uiStatus = "In Transit";
        } else if (b.status === "droppedOff") {
          uiStatus = "Awaiting Payment";
        } else if (b.status === "paymentSent") {
          uiStatus = "Payment Confirmation";
        } else if (b.status === "completed") {
          uiStatus = "Completed";
        } else if (b.status === "cancelled") {
          uiStatus = "Cancelled";
        }

        let rawStops: any[] = [];
        if (Array.isArray(b.stops)) {
          rawStops = b.stops;
        } else if (typeof b.stops === "string" && b.stops.trim()) {
          try {
            let decoded = JSON.parse(b.stops);
            if (typeof decoded === "string") {
              try {
                decoded = JSON.parse(decoded);
              } catch (_) {}
            }
            if (Array.isArray(decoded)) {
              rawStops = decoded;
            } else if (decoded && typeof decoded === "object") {
              if (Array.isArray(decoded.stops)) {
                rawStops = decoded.stops;
              } else {
                rawStops = Object.values(decoded);
              }
            }
          } catch (e) {
            console.warn("Failed to parse stops JSON for booking", b.id, e);
          }
        } else if (b.stops && typeof b.stops === "object") {
          if (Array.isArray(b.stops.stops)) {
            rawStops = b.stops.stops;
          } else {
            rawStops = Object.values(b.stops);
          }
        }

        const parsedStops: BookingStop[] = rawStops
          .filter((stop: any) => stop && typeof stop === "object")
          .map((stop: any, idx: number) => ({
            stop_number: Number(stop.stop_number ?? stop.stopNumber ?? idx + 1),
            address: String(stop.address || stop.name || stop.location || stop.dropoff_address || `Stop ${idx + 1}`),
            sub_address: stop.sub_address || stop.subAddress ? String(stop.sub_address || stop.subAddress) : "",
            latitude: Number(stop.latitude ?? stop.lat ?? 0),
            longitude: Number(stop.longitude ?? stop.lng ?? stop.long ?? 0),
            arrived_at: stop.arrived_at || stop.arrivedAt || null,
            status: stop.status || "pending",
          }));

        const resolvedTotalStops = Math.max(
          Number(b.total_stops || 0),
          parsedStops.length,
          1
        );

        return {
          id: b.id,
          passenger: passengerName,
          passengerId: b.passenger_id,
          driver: driverName,
          driverId: b.driver_id || "",
          location: b.pickup_address || "Unknown Pickup",
          destination: b.dropoff_address || "Unknown Dropoff",
          returnLocation: b.return_address || null,
          status: uiStatus,
          fare: Number(b.final_fare ?? b.actual_fare ?? b.estimated_fare ?? 0),
          pickupLatitude: b.pickup_latitude != null ? Number(b.pickup_latitude) : null,
          pickupLongitude: b.pickup_longitude != null ? Number(b.pickup_longitude) : null,
          dropoffLatitude: b.dropoff_latitude != null ? Number(b.dropoff_latitude) : null,
          dropoffLongitude: b.dropoff_longitude != null ? Number(b.dropoff_longitude) : null,
          returnLatitude: b.return_latitude != null ? Number(b.return_latitude) : null,
          returnLongitude: b.return_longitude != null ? Number(b.return_longitude) : null,
          regularFare: b.regular_fare != null ? Number(b.regular_fare) : null,
          provisionalDiscountedFare: b.provisional_discounted_fare != null ? Number(b.provisional_discounted_fare) : null,
          finalFare: b.final_fare != null ? Number(b.final_fare) : null,
          discountReviewStatus: b.discount_review_status || null,
          tripType: b.trip_type || null,
          stops: parsedStops,
          totalStops: resolvedTotalStops,
          currentStopIndex: b.current_stop_index != null ? Number(b.current_stop_index) : 0,
          bookingDiscountRequests: Array.isArray(b.booking_discount_requests)
            ? b.booking_discount_requests.map((request: any) => ({
                id: request.id,
                bookingId: request.booking_id,
                discountType: request.discount_type,
                companionIndex: Number(request.companion_index || 0),
                idImagePath: request.id_image_path,
                status: request.status,
                reviewedByDriverId: request.reviewed_by_driver_id || null,
                reviewedAt: request.reviewed_at || null,
                rejectionReason: request.rejection_reason || null,
              }))
            : [],
          time: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
          requestedAt: b.created_at || undefined,
          regularPassengerCount: b.passenger_qty && (!b.discount_passenger_type || b.discount_passenger_type === "Regular") ? Number(b.passenger_qty) : 0,
          studentPassengerCount: b.discount_passenger_type === "Student" ? Number(b.passenger_qty || 0) : 0,
          pwdPassengerCount: b.discount_passenger_type === "PWD" ? Number(b.passenger_qty || 0) : 0,
          seniorPassengerCount: b.discount_passenger_type === "Senior Citizen" ? Number(b.passenger_qty || 0) : 0,
          toda,
          cancelled_by: b.cancelled_by || null,
          cancelled_at: b.cancelled_at || null,
          cancel_reason: b.cancel_reason || null,
          cancel_details: b.cancel_details || null
        };
      });

      const mappedReports: FeedbackReport[] = (reportRows || []).map((row: any) => {
        const reporterProfile = (profiles || []).find((p: any) => p.id === row.reporter_profile_id) || {};
        const reporterName = `${reporterProfile.first_name || ""} ${reporterProfile.last_name || ""}`.trim() || reporterProfile.email || "Unknown User";
        const isDriverReporter = reporterProfile.role === "driver" || (!row.reporter_passenger_id && driversData.some((d: any) => d.profile_id === row.reporter_profile_id));
        const reporterRole = isDriverReporter ? "driver" : (reporterProfile.role || (row.reporter_passenger_id ? "passenger" : "user"));

        // Driver referenced in report
        const driverRow = row.driver_id ? driversData.find((d: any) => d.id === row.driver_id) : null;
        const driverProfile = driverRow ? (profiles || []).find((p: any) => p.id === driverRow.profile_id) || {} : {};
        const driverName = driverRow ? `${driverProfile.first_name || ""} ${driverProfile.last_name || ""}`.trim() || "Unnamed Driver" : undefined;
        const driverProfileId = driverRow ? driverRow.profile_id : null;

        // Passenger referenced in report (for PASSENGER_FEEDBACK from driver)
        const targetPassengerId = row.passenger_id || row.data?.passenger_id || null;
        const passengerRow = targetPassengerId ? mappedPassengers.find((p: any) => p.id === targetPassengerId) : null;
        const passengerName = row.data?.passenger_name || (passengerRow ? passengerRow.name : undefined);

        const booking = row.booking_id ? bookings.find((b: any) => b.id === row.booking_id) : null;
        const route = booking
          ? `${booking.pickup_address || "Pickup"} -> ${booking.dropoff_address || "Dropoff"}`
          : (row.data?.pickup_address && row.data?.dropoff_address)
            ? `${row.data.pickup_address} -> ${row.data.dropoff_address}`
            : undefined;

        return {
          id: row.id,
          reportType: row.report_type || "APP_FEEDBACK",
          title: row.title || "Feedback",
          message: row.message || row.description || "",
          category: row.category || null,
          status: row.status || "OPEN",
          reporterProfileId: row.reporter_profile_id || row.generated_by || null,
          reporterPassengerId: row.reporter_passenger_id || null,
          reporterRole,
          reporterName,
          driverId: row.driver_id || null,
          driverProfileId,
          driverName,
          passengerId: targetPassengerId,
          passengerName,
          bookingId: row.booking_id || null,
          route,
          adminNotes: row.admin_notes || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at || null,
        };
      });

      if (sessionUserId.current !== requestedUserId) return;

      const getSafeTimestamp = (item: { createdAt?: string | null; created_at?: string | null; joinedDate?: string | null }) => {
        const raw = item.createdAt || item.created_at || item.joinedDate;
        if (!raw) return 0;
        const time = new Date(raw).getTime();
        return Number.isFinite(time) ? time : 0;
      };

      mappedDrivers.sort((a, b) => {
        const diff = getSafeTimestamp(b) - getSafeTimestamp(a);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });

      mappedPassengers.sort((a, b) => {
        const diff = getSafeTimestamp(b) - getSafeTimestamp(a);
        if (diff !== 0) return diff;
        return (b.id || "").localeCompare(a.id || "");
      });

      setPassengers(mappedPassengers);
      setDrivers(mappedDrivers);
      setRideRequests(mappedRequests);
      setDriverChangeRequests(mappedChangeRequests);
      setFeedbackReports(mappedReports);

      // Map Admin Accounts
      const adminProfiles = (profiles || []).filter((p: any) => p.role === 'admin');
      adminProfiles.sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      const firstAdminId = adminProfiles[0]?.id;
      const mappedAdminAccounts: AdminAccount[] = adminProfiles.map((row: any, index: number) => ({
        id: row.id,
        name: row.full_name?.trim() || [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email?.split("@")[0] || "Admin",
        email: row.email || "",
        phone: row.phone_number || "",
        status: "Active" as const,
        isPrimaryAdmin: row.id === firstAdminId || index === 0,
        createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-",
      }));
      setAdminAccounts(mappedAdminAccounts);

      setViewingRequest(current => current ? mappedRequests.find(row => row.id === current.id) ?? null : null);
      setViewingUser(current => current ? [...mappedDrivers, ...mappedPassengers].find(row => row.id === current.id) ?? null : null);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error("[Supabase Error] Error fetching live data:", err);
      if (sessionUserId.current === requestedUserId) setErrorState(err.message || "Failed to load database records.");
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      fetchInFlight.current = false;
      if (refreshQueued.current) {
        refreshQueued.current = false;
        void fetchData();
      }
    }
  };

  // Check session and authorize admin
  const checkSessionAndRole = async (session: any) => {
    sessionUserId.current = session?.user?.id ?? null;
    if (!session) {
      setDrivers([]);
      setPassengers([]);
      setRideRequests([]);
      setFeedbackReports([]);
      setDriverChangeRequests([]);
      setAdminAccounts([]);
      setViewingUser(null);
      setViewingRequest(null);
      console.log("SESSION USER: null");
      setIsLoggedIn(false);
      setIsAuthorized(null);
      setSessionChecked(true);
      return;
    }

    console.log("SESSION USER:", session.user);
    setIsVerifyingRole(true);

    try {
      console.log("[Supabase Query] Fetching profile for user ID:", session.user.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_active, full_name, first_name, last_name, phone_number, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      console.log("PROFILE FETCH RESULT:", profile);

      if (error) throw error;
      if (sessionUserId.current !== session.user.id) return;

      if (profile?.role === 'admin' && profile.is_active) {
        const firstLastName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
        const profileName = profile.full_name || firstLastName;
        setAdminProfile({
          name: profileName || session.user.email || "Administrator",
          email: session.user.email || "",
          status: "Active",
          password: "",
          avatarSeed: "alexa",
          avatarColor: "#38bdf8",
          avatarUrl: profile.avatar_url || ""
        });
        setIsAuthorized(true);
        setIsLoggedIn(true);
        fetchData(true);
      } else {
        await supabase.auth.signOut();
        setIsAuthorized(false);
        setIsLoggedIn(false);
        setLoginError("Only administrator accounts can access the dashboard.");
      }
    } catch (err) {
      console.error("Unexpected error in checkSessionAndRole:", err);
      setIsAuthorized(false);
      setIsLoggedIn(false);
      setLoginError("Unable to verify administrator access. Check your connection and sign in again.");
    } finally {
      setIsVerifyingRole(false);
      setSessionChecked(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSessionAndRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase queries must run outside the synchronous auth callback.
      setTimeout(() => { void checkSessionAndRole(session); }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void fetchData(); }, 600);
    };
    const channel = supabase.channel("admin-database-sync");
    for (const table of ["bookings", "profiles", "passengers", "drivers", "vehicles", "booking_discount_requests", "driver_profile_change_requests", "reports"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();
    const poll = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [isLoggedIn]);

  // Derived calculations
  const onlineDriversCount = drivers.filter(d => d.isOnline).length;
  const activeDriversCount = drivers.filter(d => d.status === "Active").length;
  const completedRequests = useMemo(() => {
    return rideRequests.filter(r => r.status === "Completed");
  }, [rideRequests]);

  const isSameLocalDay = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  };

  const earningsToday = useMemo(() => {
    return completedRequests
      .filter(r => isSameLocalDay(r.requestedAt))
      .reduce((sum, r) => sum + r.fare, 0);
  }, [completedRequests]);

  const totalEarnings = useMemo(() => {
    return completedRequests.reduce((sum, r) => sum + (r.fare || 0), 0);
  }, [completedRequests]);

  // Handlers
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingDriver) return;

    if (!formData.name || !formData.phone || !formData.email || !formData.password || !formData.plateNumber) {
      alert("Please fill in all required fields (Name, Phone, Email, Password, Plate Number, TODA).");
      return;
    }

    console.log("Initiating driver signup request...", {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      plateNumber: formData.plateNumber,
      toda: formData.toda
    });
    setIsCreatingDriver(true);

    try {
      const result = await createDriverAccount({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        contactNumber: formData.phone,
        plateNumber: formData.plateNumber,
        todaAssociation: formData.toda,
        licenseFrontImage: formData.licenseFrontImage,
        licenseBackImage: formData.licenseBackImage,
        licenseNumber: formData.licenseNumber || undefined,
        licenseExpiryDate: formData.licenseExpiryDate || undefined,
        franchiseImage: formData.franchiseImage,
        franchiseBackImage: formData.franchiseBackImage,
        franchiseNumber: formData.franchiseNumber || undefined,
        franchiseExpiryDate: formData.franchiseExpiryDate || undefined,
      });

      if (!result.success) {
        console.error("Signup failed:", result.error);
        alert(`Failed to create driver account: ${result.error}`);
        return;
      }

      console.log("Signup successful:", result);

      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        plateNumber: "",
        toda: "LHITC-TODA",
        status: "Active",
        licenseFrontImage: null,
        licenseFrontName: "",
        licenseBackImage: null,
        licenseBackName: "",
        licenseNumber: "",
        licenseExpiryDate: "",
        franchiseImage: null,
        franchiseImageName: "",
        franchiseBackImage: null,
        franchiseBackName: "",
        franchiseNumber: "",
        franchiseExpiryDate: "",
      });
      setActiveTab("users");
      setUsersSubTab("drivers");
      alert("Driver account successfully created");
      fetchData();
    } catch (err: any) {
      console.error("Unexpected error during signup:", err);
      alert(`Unexpected error: ${err.message || err}`);
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    console.log("[Supabase Query] Updating profile and driver...");
    const nameParts = editFormData.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let profileId = editingDriver.profileId || (editingDriver as any).profile_id;
    if (!profileId) {
      console.log("Profile ID missing in editingDriver state. Fetching from database...");
      const { data: dRec } = await supabase
        .from('drivers')
        .select('profile_id')
        .eq('id', editingDriver.id)
        .maybeSingle();
      if (dRec?.profile_id) {
        profileId = dRec.profile_id;
      }
    }
    if (!profileId) {
      alert("Error: Profile ID is missing for this driver.");
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: editFormData.phone,
        email: editFormData.email || null,
        address: editFormData.address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (profileError) {
      console.error("[Supabase Error] Profile update failed:", profileError);
      alert(`Failed to update profile: ${profileError.message}`);
      return;
    }



    // NOTE: document_status, status, and account_status are intentionally
    // NOT written here. The database trigger (fn_update_driver_status) computes
    // them automatically whenever any document field changes.
    const { error: driverError } = await supabase
      .from('drivers')
      .update({
        license_number: editFormData.license || null,
        license_expiry_date: editFormData.licenseExpiryDate || null,
        franchise_number: editFormData.franchiseNumber || null,
        franchise_expiry_date: editFormData.franchiseExpiryDate || null,
        toda_association: editFormData.toda,
      })
      .eq('id', editingDriver.id);

    if (driverError) {
      console.error("[Supabase Error] Driver update failed:", driverError);
      alert(`Failed to update driver: ${driverError.message}`);
      return;
    }

    // Update vehicle using driver's table primary key directly
    await supabase
      .from('vehicles')
      .update({
        plate_number: editFormData.plateNumber
      })
      .eq('driver_id', editingDriver.id);

    setShowEditDriverModal(false);
    setEditingDriver(null);
    alert("Driver profile updated successfully!");
    fetchData();
  };

  const handleDeactivatePassengerToggle = async (id: string) => {
    const passengerObj = passengers.find(p => p.id === id);
    if (!passengerObj) return;

    const nextStatus = passengerObj.status === "Active" ? false : true;
    const profileId = passengerObj.profileId || id;

    console.log("[Supabase Query] Toggling passenger is_active status...");
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: nextStatus })
      .eq('id', profileId);

    if (error) {
      console.error("[Supabase Error] Passenger toggle failed:", error);
      alert(`Failed to toggle passenger status: ${error.message}`);
      return;
    }

    if (viewingUser && viewingUser.id === id && viewingUserType === "passenger") {
      setViewingUser(prev => {
        if (!prev) return null;
        return { ...prev, status: prev.status === "Active" ? "Inactive" : "Active" };
      });
    }

    alert(`Passenger status updated successfully!`);
    fetchData();
  };

  const handleLiftPassengerRestriction = async (id: string) => {
    console.log("[Supabase Query] Lifting passenger restriction immediately for ID:", id);
    try {
      // 1. Resolve passenger and profile records reliably
      let passengerId = id;
      let profileId = id;

      const { data: passData } = await supabase
        .from('passengers')
        .select('id, profile_id')
        .or(`id.eq.${id},profile_id.eq.${id}`)
        .maybeSingle();

      if (passData) {
        passengerId = passData.id;
        profileId = passData.profile_id;
      }

      // 2. Attempt stored procedure RPC first
      const { error: rpcError } = await supabase.rpc('admin_lift_passenger_restriction', {
        p_passenger_id: passengerId
      });

      if (rpcError) {
        console.warn("RPC admin_lift_passenger_restriction error or fallback needed:", rpcError);
      }

      // 3. Direct table update guarantee
      const liftPayload: any = {
        booking_restriction_until: null,
        cancel_count: 0,
        warning_status: false,
        admin_action_type: null,
        admin_action_reason: null,
        admin_action_date: null,
        updated_at: new Date().toISOString()
      };
      let { error: updateError } = await supabase
        .from('passengers')
        .update(liftPayload)
        .eq('id', passengerId);

      if (updateError && (updateError.message?.includes('admin_action') || updateError.message?.includes('schema cache'))) {
        console.warn("Direct update on passengers without admin_action columns due to schema cache.");
        const { error: fallbackError } = await supabase
          .from('passengers')
          .update({
            booking_restriction_until: null,
            cancel_count: 0,
            warning_status: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', passengerId);
        updateError = fallbackError;
      }

      if (updateError) {
        console.warn("Direct update on passengers table had error:", updateError);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (profileError) {
        console.warn("Direct update on profiles table had error:", profileError);
      }

      // Send in-app notification to passenger
      try {
        await supabase.from("notifications").insert({
          recipient_id: profileId,
          type: "in_app",
          title: "Restriction Lifted",
          body: "Your booking restriction has been lifted by the administrator. You may now book rides again.",
          notification_category: "account_status",
          data: {
            action: "passenger_restriction_lifted",
            date: new Date().toISOString(),
          },
        });
      } catch (notifErr) {
        console.warn("Could not insert passenger notification:", notifErr);
      }

      // Update local modal state immediately if currently viewing this passenger
      if (viewingUser && viewingUserType === "passenger" && (viewingUser.id === id || viewingUser.id === passengerId || (viewingUser as Passenger).profileId === profileId)) {
        setViewingUser(prev => prev ? {
          ...prev,
          bookingRestrictionUntil: null,
          adminActionReason: null,
          adminActionType: null,
          canceledTrips: 0,
          passengerCancelledTrips: 0,
          warningStatus: false,
          status: "Active"
        } as Passenger : null);
      }

      alert("Passenger restriction lifted. Booking history is preserved.");
      fetchData(false);
    } catch (err: any) {
      console.error("[Supabase Error] Failed to lift passenger restriction:", err);
      alert(`Failed to lift passenger restriction: ${err?.message || err}`);
    }
  };

  const handleRestrictPassenger = async (id: string, reason?: string, days = 31) => {
    const formattedReason = reason?.trim() || "Administrative restriction";
    console.log(`[Supabase Query] Restricting passenger ID ${id} for ${days} days with reason: ${formattedReason}...`);
    try {
      const restrictionDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // 1. Resolve passenger and profile records reliably
      let passengerId = id;
      let profileId = id;

      const { data: passData } = await supabase
        .from('passengers')
        .select('id, profile_id')
        .or(`id.eq.${id},profile_id.eq.${id}`)
        .maybeSingle();

      if (passData) {
        passengerId = passData.id;
        profileId = passData.profile_id;
      }

      // 2. Attempt stored procedure RPC first
      const { error: rpcError } = await supabase.rpc('admin_restrict_passenger', {
        p_passenger_id: passengerId,
        p_days: days
      });

      if (rpcError) {
        console.warn("RPC admin_restrict_passenger error or fallback needed:", rpcError);
      }

      // 3. Direct table update guarantee with safe fallback
      const restrictPayload: any = {
        booking_restriction_until: restrictionDate.toISOString(),
        admin_action_type: 'restricted',
        admin_action_reason: formattedReason,
        admin_action_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      let { error: updateError } = await supabase
        .from('passengers')
        .update(restrictPayload)
        .eq('id', passengerId);

      if (updateError && (updateError.message?.includes('admin_action') || updateError.message?.includes('schema cache'))) {
        console.warn("Direct update on passengers without admin_action columns due to schema cache.");
        const { error: fallbackError } = await supabase
          .from('passengers')
          .update({
            booking_restriction_until: restrictionDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', passengerId);
        updateError = fallbackError;
      }

      if (updateError && rpcError) throw updateError;

      const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
      const formattedDate = restrictionDate.toLocaleDateString('en-US', options);

      // Send in-app notification to passenger
      try {
        await supabase.from("notifications").insert({
          recipient_id: profileId,
          type: "in_app",
          title: "Account Restricted",
          body: `Your account has been restricted from booking by the administrator.\n\nReason: ${formattedReason}\n\nRestriction until: ${formattedDate}`,
          notification_category: "account_status",
          data: {
            action: "passenger_restricted",
            reason: formattedReason,
            restriction_until: restrictionDate.toISOString(),
            days,
          },
        });
      } catch (notifErr) {
        console.warn("Could not insert passenger notification:", notifErr);
      }

      // Update local modal state immediately if currently viewing this passenger
      if (viewingUser && viewingUserType === "passenger" && (viewingUser.id === id || viewingUser.id === passengerId || (viewingUser as Passenger).profileId === profileId)) {
        setViewingUser(prev => prev ? {
          ...prev,
          bookingRestrictionUntil: restrictionDate.toISOString(),
          adminActionReason: formattedReason,
          adminActionType: 'restricted',
          status: `Restricted until ${formattedDate}`
        } as Passenger : null);
      }

      alert(`Passenger restricted from booking for ${days} days (until ${formattedDate}).`);
      fetchData(false);
    } catch (err: any) {
      console.error("[Supabase Error] Failed to restrict passenger:", err);
      alert(`Failed to restrict passenger: ${err?.message || err}`);
    }
  };

  const handleResetCanceledTrips = handleLiftPassengerRestriction;

  const handleReviewDriverChangeRequest = async (
    requestId: string,
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    console.log(`[Supabase Query] Reviewing driver change request ${requestId} with status: ${status}...`);
    try {
      // 1. Attempt RPC first
      const { error: rpcError } = await supabase.rpc("review_driver_profile_change_request", {
        p_request_id: requestId,
        p_status: status,
        p_reason: status === "REJECTED" ? reason?.trim() || null : null,
      });

      if (rpcError) {
        console.warn("RPC review_driver_profile_change_request error, falling back to direct table update:", rpcError);
        const targetReq = driverChangeRequests.find((r) => r.id === requestId);
        if (!targetReq) throw new Error("Change request not found.");

        if (status === "APPROVED") {
          const field = targetReq.fieldName;
          const val = targetReq.requestedValue;
          const driverId = targetReq.driverId;
          const profileId = targetReq.profileId;

          if (field === "full_name") {
            const parts = val.trim().split(/\s+/);
            const first = parts[0] || "";
            const last = parts.slice(1).join(" ") || "";
            await supabase.from("profiles").update({ first_name: first, last_name: last, updated_at: new Date().toISOString() }).eq("id", profileId);
          } else if (["first_name", "last_name", "phone_number", "email", "address"].includes(field)) {
            await supabase.from("profiles").update({ [field]: val, updated_at: new Date().toISOString() }).eq("id", profileId);
          } else if (["license_number", "toda_association", "license_expiry_date", "franchise_number", "franchise_expiry_date", "license_front_url", "license_back_url", "franchise_url", "franchise_back_url"].includes(field)) {
            await supabase.from("drivers").update({ [field]: val, updated_at: new Date().toISOString() }).eq("id", driverId);
          } else if (field === "toda") {
            await supabase.from("drivers").update({ toda_association: val, updated_at: new Date().toISOString() }).eq("id", driverId);
          } else if (field === "plate_number" || field === "plate") {
            await supabase.from("vehicles").update({ plate_number: val, updated_at: new Date().toISOString() }).eq("driver_id", driverId);
          }
        }

        await supabase
          .from("driver_profile_change_requests")
          .update({
            status,
            rejection_reason: status === "REJECTED" ? reason?.trim() || null : null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        const readableField = targetReq.fieldName.replace(/_/g, " ");
        await supabase.from("notifications").insert({
          recipient_id: targetReq.profileId,
          title: status === "APPROVED" ? "Profile update approved" : "Profile update rejected",
          body: status === "APPROVED"
            ? `Your ${readableField} update request was approved.`
            : `Your ${readableField} update request was rejected.${reason ? ` Reason: ${reason}` : ""}`,
          notification_category: "driver_profile_change_request",
          data: { request_id: requestId, field_name: targetReq.fieldName, status },
        });
      }

      alert(status === "APPROVED" ? "Driver modification request approved! Details updated in database." : "Driver modification request rejected.");
      await fetchData(false);
    } catch (err: any) {
      console.error("[Supabase Error] Failed to review change request:", err);
      alert(`Failed to review change request: ${err?.message || err}`);
    }
  };

  const deleteRows = async (table: string, column: string, value: string) => {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) {
      console.warn(`[Supabase Warning] Could not delete from ${table}.${column}:`, error.message);
    }
  };

  const handleDeleteRideRequest = async (id: string) => {
    if (!window.confirm("Delete this ride request from the database?")) return;

    await deleteRows("booking_discount_requests", "booking_id", id);
    await deleteRows("booking_status_history", "booking_id", id);
    await deleteRows("driver_locations", "booking_id", id);
    await deleteRows("passenger_locations", "booking_id", id);
    await deleteRows("ratings", "booking_id", id);
    await deleteRows("notifications", "booking_id", id);

    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error("[Supabase Error] Ride request delete failed:", error);
      alert(`Failed to delete ride request: ${error.message}`);
      return;
    }

    setShowViewRequestModal(false);
    setViewingRequest(null);
    alert("Ride request deleted.");
    fetchData();
  };

  const handleDeleteDriver = async (driver: Driver) => {
    if (!window.confirm(`Delete ${driver.name} from the database? Related active assignments will be detached.`)) return;

    try {
      console.log(`[Supabase Query] Deleting driver ID ${driver.id}...`);
      // 1. Attempt server-side atomic deletion RPC
      const { data, error: rpcError } = await supabase.rpc("admin_delete_driver", {
        p_driver_id: driver.id,
      });

      if (rpcError) {
        console.warn("RPC admin_delete_driver unavailable, attempting multi-table cascading delete:", rpcError);
        // Fallback: manually detach and cascade
        await supabase.from("bookings").update({ driver_id: null }).eq("driver_id", driver.id);
        await deleteRows("booking_discount_requests", "reviewed_by_driver_id", driver.id);
        await deleteRows("driver_locations", "driver_id", driver.id);
        await deleteRows("driver_sessions", "driver_id", driver.id);
        await deleteRows("vehicles", "driver_id", driver.id);
        await deleteRows("ratings", "driver_id", driver.id);
        await deleteRows("reports", "driver_id", driver.id);
        await deleteRows("driver_profile_change_requests", "driver_id", driver.id);

        const { error: driverError } = await supabase.from("drivers").delete().eq("id", driver.id);
        if (driverError) {
          console.error("[Supabase Error] Driver delete failed:", driverError);
          alert(`Failed to delete driver: ${driverError.message}`);
          return;
        }

        if (driver.profileId) {
          await deleteRows("notifications", "recipient_id", driver.profileId);
          await deleteRows("reports", "reporter_id", driver.profileId);
          await deleteRows("reports", "reporter_profile_id", driver.profileId);
          await deleteRows("profiles", "id", driver.profileId);
        }
      } else if (data && data.success === false) {
        alert(data.message || "Failed to delete driver.");
        return;
      }

      // Immediately update local state so the driver vanishes instantly
      setDrivers(prev => prev.filter(d => d.id !== driver.id));

      setShowViewUserModal(false);
      setViewingUser(null);
      setViewingUserType(null);
      alert(`Driver ${driver.name} has been successfully deleted.`);
      fetchData(false);
    } catch (err: any) {
      console.error("[Supabase Error] Failed to delete driver:", err);
      alert(`Failed to delete driver: ${err?.message || err}`);
    }
  };

  const handleDeletePassenger = async (passenger: Passenger) => {
    if (!window.confirm(`Delete ${passenger.name} and their ride records from the database?`)) return;

    try {
      console.log(`[Supabase Query] Deleting passenger ID ${passenger.id}...`);
      // 1. Attempt server-side atomic deletion RPC
      const { data, error: rpcError } = await supabase.rpc("admin_delete_passenger", {
        p_passenger_id: passenger.id,
      });

      if (rpcError) {
        console.warn("RPC admin_delete_passenger unavailable, attempting multi-table cascading delete:", rpcError);
        const passengerRideIds = rideRequests
          .filter(r => r.passengerId === passenger.id)
          .map(r => r.id);

        for (const rideId of passengerRideIds) {
          await deleteRows("booking_discount_requests", "booking_id", rideId);
          await deleteRows("booking_status_history", "booking_id", rideId);
          await deleteRows("driver_locations", "booking_id", rideId);
          await deleteRows("passenger_locations", "booking_id", rideId);
          await deleteRows("ratings", "booking_id", rideId);
          await deleteRows("notifications", "booking_id", rideId);
          await deleteRows("reports", "booking_id", rideId);
        }

        await deleteRows("passenger_locations", "passenger_id", passenger.id);
        await deleteRows("reports", "passenger_id", passenger.id);
        await deleteRows("reports", "reporter_passenger_id", passenger.id);
        await deleteRows("bookings", "passenger_id", passenger.id);

        const { error: passengerError } = await supabase.from("passengers").delete().eq("id", passenger.id);
        if (passengerError) {
          console.error("[Supabase Error] Passenger delete failed:", passengerError);
          alert(`Failed to delete passenger: ${passengerError.message}`);
          return;
        }

        if (passenger.profileId) {
          await deleteRows("notifications", "recipient_id", passenger.profileId);
          await deleteRows("reports", "reporter_id", passenger.profileId);
          await deleteRows("reports", "reporter_profile_id", passenger.profileId);
          await deleteRows("profiles", "id", passenger.profileId);
        }
      } else if (data && data.success === false) {
        alert(data.message || "Failed to delete passenger.");
        return;
      }

      // Immediately update local state so the passenger vanishes instantly
      setPassengers(prev => prev.filter(p => p.id !== passenger.id));

      setShowViewUserModal(false);
      setViewingUser(null);
      setViewingUserType(null);
      alert(`Passenger ${passenger.name} has been successfully deleted.`);
      fetchData(false);
    } catch (err: any) {
      console.error("[Supabase Error] Failed to delete passenger:", err);
      alert(`Failed to delete passenger: ${err?.message || err}`);
    }
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestData.passenger || !newRequestData.location || !newRequestData.destination || !newRequestData.fare) {
      alert("Please fill in all fields.");
      return;
    }

    const matchPassenger = passengers.find(p => p.name.toLowerCase() === newRequestData.passenger.toLowerCase());
    const passengerId = matchPassenger?.id;
    if (!passengerId) {
      alert("Passenger name must match an existing passenger profile in the database.");
      return;
    }

    const assignedDriver = drivers.find(d => d.id === newRequestData.driverId);

    console.log("[Supabase Query] Inserting new booking...");
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        passenger_id: passengerId,
        driver_id: assignedDriver ? assignedDriver.id : null,
        pickup_address: newRequestData.location,
        dropoff_address: newRequestData.destination,
        estimated_fare: Number(newRequestData.fare),
        status: newRequestData.status === "Pending" ? "searching" :
          newRequestData.status === "In Transit" ? "pickedUp" :
            newRequestData.status === "Completed" ? "completed" : "cancelled"
      })
      .select('*')
      .single();

    if (error) {
      console.error("[Supabase Error] Error creating booking:", error);
      alert(`Failed to create ride request: ${error.message}`);
      return;
    }

    console.log("[Supabase Response] Booking created:", data);
    setShowAddRequestModal(false);
    setNewRequestData({
      passenger: "",
      driverId: "",
      location: "",
      destination: "",
      status: "Pending",
      fare: ""
    });
    alert("Ride request dispatched successfully!");
    fetchData();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name.trim() || !newAdminForm.email.trim() || !newAdminForm.password.trim()) {
      alert("Please fill in all required fields (Name, Email, Password).");
      return;
    }
    if (newAdminForm.password.trim().length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const res = await createAdminAccount({
        fullName: newAdminForm.name,
        email: newAdminForm.email,
        phone: newAdminForm.phone,
        password: newAdminForm.password,
      });

      if (!res.success) {
        alert(`Failed to create administrator account: ${res.error || "Unknown error"}`);
        return;
      }

      alert(`Administrator account for ${res.adminName || newAdminForm.name} created successfully!`);
      setNewAdminForm({
        name: "",
        email: "",
        phone: "",
        password: "",
      });
      fetchData(false);
    } catch (err: any) {
      console.error("Error creating admin account:", err);
      alert(`Error creating administrator: ${err?.message || err}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleUpdateAdmin = async (
    account: AdminAccount,
    updates: { name: string; email: string; phone: string; password?: string }
  ): Promise<boolean> => {
    setActiveAdminActionId(account.id);
    try {
      const res = await updateAdminAccount(account.id, {
        fullName: updates.name,
        email: updates.email,
        phone: updates.phone,
        password: updates.password,
      });
      if (!res.success) {
        alert(`Failed to update administrator: ${res.error || "Unknown error"}`);
        return false;
      }
      alert("Administrator account updated successfully.");
      await fetchData(false);
      return true;
    } catch (err: any) {
      console.error("Error updating admin account:", err);
      alert(`Error updating administrator: ${err?.message || err}`);
      return false;
    } finally {
      setActiveAdminActionId("");
    }
  };

  const handleDeleteAdmin = async (account: AdminAccount): Promise<boolean> => {
    if (account.isPrimaryAdmin) {
      alert("Primary administrator accounts cannot be deleted.");
      return false;
    }

    if (sessionUserId.current === account.id) {
      alert("You cannot delete your own logged-in administrator account.");
      return false;
    }

    setActiveAdminActionId(account.id);
    try {
      const res = await deleteAdminAccount(account.id);
      if (!res.success) {
        alert(`Failed to delete administrator account: ${res.error || "Unknown error"}`);
        return false;
      }
      setAdminAccounts(prev => prev.filter(a => a.id !== account.id));
      alert(`Administrator account "${account.name}" deleted successfully.`);
      await fetchData(false);
      return true;
    } catch (err: any) {
      console.error("Error deleting admin account:", err);
      alert(`Error deleting administrator: ${err?.message || err}`);
      return false;
    } finally {
      setActiveAdminActionId("");
    }
  };

  // Filters
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.toda.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.plateNumber.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.license.toLowerCase().includes(driverSearch.toLowerCase());
      const matchToda = userTodaFilter === "All" || d.toda === userTodaFilter;
      return matchSearch && matchToda;
    });
  }, [drivers, driverSearch, userTodaFilter]);

  const filteredPassengers = useMemo(() => {
    return passengers.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        p.contact.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (p.email || "").toLowerCase().includes(driverSearch.toLowerCase());
      return matchSearch;
    });
  }, [passengers, driverSearch]);

  const filteredRequests = useMemo(() => {
    return rideRequests.filter(r => {
      const matchSearch = r.passenger.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.driver.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.location.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.destination.toLowerCase().includes(requestSearch.toLowerCase()) ||
        (r.stops && r.stops.some(s => s.address?.toLowerCase().includes(requestSearch.toLowerCase())));
      let matchStatus = false;
      if (statusFilter === "All") {
        matchStatus = true;
      } else if (statusFilter === "Ongoing") {
        matchStatus = ["Pending", "In Transit", "Awaiting Payment", "Payment Confirmation"].includes(r.status);
      } else {
        matchStatus = r.status === statusFilter;
      }
      return matchSearch && matchStatus;
    });
  }, [rideRequests, requestSearch, statusFilter]);

  // Notification badge counts for Sidebar
  const pendingRequestsCount = useMemo(() => {
    return rideRequests.filter((r) => r.status === "Pending").length;
  }, [rideRequests]);

  const openFeedbackCount = useMemo(() => {
    return feedbackReports.filter((r) => r.status === "OPEN").length;
  }, [feedbackReports]);

  const pendingDriversCount = useMemo(() => {
    return drivers.filter((d) => d.documentStatus === "PENDING").length;
  }, [drivers]);

  const pendingPassengersCount = useMemo(() => {
    return passengers.filter(
      (p) => p.discountDocumentStatus === "PENDING" || p.status === "For Approval"
    ).length;
  }, [passengers]);

  const pendingChangeRequestsCount = useMemo(() => {
    return driverChangeRequests.filter((r) => r.status === "PENDING").length;
  }, [driverChangeRequests]);

  const newUsersCount = pendingDriversCount + pendingPassengersCount + pendingChangeRequestsCount;

  // Loading screen
  if (!sessionChecked || isVerifyingRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3f8fc] font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#000C7D] border-t-transparent"></div>
        <p className="text-[#000C7D] font-semibold mt-4 text-sm">Verifying Session...</p>
      </div>
    );
  }

  // Login View render condition
  if (!isLoggedIn) {
    return (
      <LoginView
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        setLoginError={setLoginError}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        setIsLoggedIn={setIsLoggedIn}
      />
    );
  }

  // Unauthorized View block removed to bypass access restriction check.

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f3f8fc] font-sans antialiased text-slate-800">
      {/* HEADER SECTION */}
      <Header
        adminProfile={adminProfile}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onRefresh={() => fetchData(false)}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
      />

      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          usersSubTab={usersSubTab}
          setUsersSubTab={setUsersSubTab}
          pendingRequestsCount={pendingRequestsCount}
          openFeedbackCount={openFeedbackCount}
          newUsersCount={newUsersCount}
          pendingDriversCount={pendingDriversCount}
          pendingPassengersCount={pendingPassengersCount}
          pendingChangeRequestsCount={pendingChangeRequestsCount}
          adminsCount={adminAccounts.length}
        />

        {/* MAIN PANEL CONTENT VIEW */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-6 z-0 relative">
          {errorState && (
            <div className="mb-6 p-4 bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex items-center justify-between">
              <span>⚠️ Error: {errorState}</span>
              <button onClick={() => fetchData(false)} className="px-4 py-1.5 bg-rose-200 hover:bg-rose-300 rounded-lg text-xs font-bold transition-all">Retry</button>
            </div>
          )}

          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent mb-3"></div>
              <p className="text-xs font-bold uppercase tracking-wider">Syncing Supabase Database...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardView
                  rideRequests={rideRequests}
                  drivers={drivers}
                  onlineDriversCount={onlineDriversCount}
                  activeDriversCount={activeDriversCount}
                  totalEarnings={totalEarnings}
                  setActiveTab={setActiveTab}
                  setActiveStatModal={setActiveStatModal}
                />
              )}

              {activeTab === "ride-requests" && (
                <RideRequestsView
                  filteredRequests={filteredRequests}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  requestSearch={requestSearch}
                  setRequestSearch={setRequestSearch}
                  setViewingRequest={setViewingRequest}
                  setShowViewRequestModal={setShowViewRequestModal}
                />
              )}

              {activeTab === "earnings" && (
                <EarningsView
                  drivers={drivers}
                  rideRequests={rideRequests}
                  earningsTodaFilter={earningsTodaFilter}
                  setEarningsTodaFilter={setEarningsTodaFilter}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === "users" && (
                <UsersView
                  filteredDrivers={filteredDrivers}
                  filteredPassengers={filteredPassengers}
                  driverChangeRequests={driverChangeRequests}
                  drivers={drivers}
                  driverSearch={driverSearch}
                  setDriverSearch={setDriverSearch}
                  userTodaFilter={userTodaFilter}
                  setUserTodaFilter={setUserTodaFilter}
                  usersSubTab={usersSubTab}
                  setUsersSubTab={setUsersSubTab}
                  setViewingUser={setViewingUser}
                  setViewingUserType={setViewingUserType}
                  setShowViewUserModal={setShowViewUserModal}
                  onReviewChangeRequest={handleReviewDriverChangeRequest}
                  adminAccounts={adminAccounts}
                  newAdminForm={newAdminForm}
                  setNewAdminForm={setNewAdminForm}
                  isCreatingAdmin={isCreatingAdmin}
                  activeAdminActionId={activeAdminActionId}
                  onCreateAdmin={handleCreateAdmin}
                  onUpdateAdmin={handleUpdateAdmin}
                  onDeleteAdmin={handleDeleteAdmin}
                />
              )}

              {activeTab === "feedback" && (
                <FeedbackView reports={feedbackReports} onRefresh={() => fetchData(false)} />
              )}

              {activeTab === "profile" && (
                <ProfileView
                  adminProfile={adminProfile}
                  setAdminProfile={setAdminProfile}
                  setActiveTab={setActiveTab}
                  setIsLoggedIn={setIsLoggedIn}
                  setLoginEmail={setLoginEmail}
                  setLoginPassword={setLoginPassword}
                  setLoginError={setLoginError}
                />
              )}
              {activeTab === "create-driver" && (
                <CreateDriverView
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleAddDriver}
                  onCancel={() => setActiveTab("dashboard")}
                  isCreatingDriver={isCreatingDriver}
                />
              )}
              {activeTab === "fare-settings" && (
                <FareSettingsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL WINDOWS */}

      <EditDriverModal
        isOpen={showEditDriverModal}
        onClose={() => {
          setShowEditDriverModal(false);
          setEditingDriver(null);
        }}
        editingDriver={editingDriver}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSubmit={handleEditDriver}
      />

      <AddRequestModal
        isOpen={showAddRequestModal}
        onClose={() => setShowAddRequestModal(false)}
        newRequestData={newRequestData}
        setNewRequestData={setNewRequestData}
        drivers={drivers}
        onSubmit={handleAddRequest}
      />

      <ViewRequestModal
        isOpen={showViewRequestModal}
        onClose={() => {
          setShowViewRequestModal(false);
          setViewingRequest(null);
        }}
        viewingRequest={viewingRequest}
        onDeleteRequest={handleDeleteRideRequest}
      />

      <ViewUserModal
        isOpen={showViewUserModal}
        onClose={() => {
          setShowViewUserModal(false);
          setViewingUser(null);
          setViewingUserType(null);
        }}
        viewingUser={viewingUser}
        viewingUserType={viewingUserType}
        onDeactivatePassengerToggle={handleDeactivatePassengerToggle}
        onResetCanceledTrips={handleResetCanceledTrips}
        onLiftPassengerRestriction={handleLiftPassengerRestriction}
        onRestrictPassenger={handleRestrictPassenger}
        onDeleteDriver={handleDeleteDriver}
        onDeletePassenger={handleDeletePassenger}
        onRefreshData={() => fetchData(false)}
        rideRequests={rideRequests}
        driverChangeRequests={driverChangeRequests}
        onReviewChangeRequest={handleReviewDriverChangeRequest}
      />

      <StatBreakdownModal
        isOpen={activeStatModal !== null}
        activeStatModal={activeStatModal}
        onClose={() => setActiveStatModal(null)}
        drivers={drivers}
        passengers={passengers}
        rideRequests={rideRequests}
        earningsToday={earningsToday}
      />
    </div>
  );
}
