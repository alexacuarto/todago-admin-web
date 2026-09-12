/**
 * Shared domain types for the TodaGo Admin Dashboard.
 * All data is sourced from Supabase — these types reflect the
 * live booking, profile, driver, passenger, and fare rows used by the app.
 */

export interface Driver {
  id: string;
  name: string;
  toda: string;
  status: "Active" | "Inactive" | "Restricted";
  isVerified?: boolean;
  phone: string;
  license: string;
  bodyNumber?: string;
  trips: number;
  joinedDate: string;
  createdAt?: string | null;
  created_at?: string | null;
  email: string;
  address?: string;
  plateNumber: string;
  isOnline: boolean;
  licensePhotoUrl?: string | null;
  avatarUrl?: string;
  selfiePhotoUrl?: string | null;
  licenseImageUrl?: string;
  licenseImageName?: string;
  activityStatus: "ACTIVE" | "INACTIVE";
  accountStatus?: string;
  licenseFrontUrl?: string | null;
  licenseBackUrl?: string | null;
  licenseExpiryDate?: string | null;
  franchiseUrl?: string | null;
  franchiseBackUrl?: string | null;
  franchiseNumber?: string | null;
  franchiseExpiryDate?: string | null;
  documentStatus?: string;
  rejectionReason?: string | null;
  profileId: string;
  lastOnlineAt?: string | null;
  totalOnlineMinutes?: number;
  liveOnlineMinutes?: number;
  lastCompletedRideAt?: string | null;
  adminActionType?: string | null;
  adminActionReason?: string | null;
  adminActionDate?: string | null;
  adminActionBy?: string | null;
  documentIssueReason?: string | null;
}

export interface DriverProfileChangeRequest {
  id: string;
  driverId: string;
  profileId: string;
  fieldName: string;
  currentValue?: string | null;
  requestedValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface FeedbackReport {
  id: string;
  reportType: "APP_FEEDBACK" | "DRIVER_FEEDBACK" | string;
  title: string;
  message: string;
  category?: string | null;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED" | string;
  reporterProfileId?: string | null;
  reporterPassengerId?: string | null;
  reporterRole?: "passenger" | "driver" | string;
  reporterName?: string;
  driverId?: string | null;
  driverProfileId?: string | null;
  driverName?: string;
  bookingId?: string | null;
  route?: string;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Passenger {
  id: string;
  profileId?: string;
  name: string;
  contact: string;
  email?: string;
  canceledTrips: number;
  status: string;
  joinedDate: string;
  ridesTaken: number;
  passengerCancelledTrips?: number;
  driverCancelledTrips?: number;
  warningStatus?: boolean;
  bookingRestrictionUntil?: string | null;
  lastCancelDate?: string | null;
  avatarUrl?: string;
  selfiePhotoUrl?: string | null;
  accountPassengerType?: string;
  discountDocumentUrl?: string | null;
  discountDocumentStatus?: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | string;
  discountDocumentType?: string | null;
  discountDocumentRejectionReason?: string | null;
  discountDocumentSubmittedAt?: string | null;
  discountDocumentReviewedAt?: string | null;
  discountEligible?: boolean;
}

export interface RideRequest {
  id: string;
  passenger: string;
  passengerId: string;
  driver: string;
  driverId: string;
  location: string;
  destination: string;
  returnLocation?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  returnLatitude?: number | null;
  returnLongitude?: number | null;
  status: "Pending" | "In Transit" | "Awaiting Payment" | "Payment Confirmation" | "Scheduled" | "Completed" | "Cancelled";
  fare: number;
  time: string;
  requestedAt?: string;
  tripType?: string | null;
  toda: string;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancel_reason?: string | null;
  cancel_details?: string | null;
  regularPassengerCount?: number;
  studentPassengerCount?: number;
  pwdPassengerCount?: number;
  seniorPassengerCount?: number;
  earningId?: string;
  earningAmount?: number;
  earningDate?: string;
  regularFare?: number | null;
  provisionalDiscountedFare?: number | null;
  finalFare?: number | null;
  discountReviewStatus?: string | null;
  stops?: BookingStop[];
  totalStops?: number;
  currentStopIndex?: number;
  bookingDiscountRequests?: BookingDiscountRequest[];
}

export interface BookingStop {
  stop_number: number;
  address: string;
  sub_address?: string;
  latitude: number;
  longitude: number;
  arrived_at?: string | null;
  status?: string;
}

export interface BookingDiscountRequest {
  id: string;
  bookingId: string;
  discountType: "Student" | "Senior Citizen" | "PWD" | string;
  companionIndex: number;
  idImagePath: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  reviewedByDriverId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

export interface EarningsRecord {
  id: string;
  date: string;
  toda: string;
  completedRides: number;
  totalEarnings: number;
  commissionEarned: number;
  driverName?: string;
}

export type TripType = "one_way" | "round_trip";

export type AdminTab =
  | "dashboard"
  | "ride-requests"
  | "earnings"
  | "fare-settings"
  | "admin-management"
  | "users"
  | "feedback"
  | "profile"
  | "create-driver";

export interface FareSetting {
  tripType: TripType;
  label: string;
  baseFare: number;
  includedKm: number;
  perSucceedingKm: number;
  studentDiscountPercent: number;
  pwdDiscountPercent: number;
  seniorDiscountPercent: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  isPrimaryAdmin: boolean;
  createdAt: string;
}

export interface CreateDriverFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
  plateNumber: string;
  toda: string;
  status: "Active" | "Inactive";
  licenseImage: File | null;
  licenseImageName: string;
}

export interface DriverEditFormData {
  name: string;
  phone: string;
  license: string;
  bodyNumber: string;
  toda: string;
  status: "Active" | "Inactive";
  email: string;
  address?: string;
  password: string;
  plateNumber: string;
  isVerified: boolean;
  licenseImage: File | null;
  licenseImageName: string;
}

export interface PassengerEditFormData {
  name: string;
  contact: string;
  email: string;
  status: "Active" | "Inactive";
  password: string;
}
