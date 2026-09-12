# TodaGo — Flutter Integration Guide

> How to connect your Flutter **Passenger** and **Driver** apps to the same Supabase backend so everything syncs with the Admin Dashboard in real-time.

---

## 1. Supabase Setup (Same Project)

All three apps (Passenger, Driver, Admin) connect to the **same Supabase project**:

```
URL:  
Key:  (your VITE_SUPABASE_ANON_KEY — same anon key for all apps)
```

### Flutter `pubspec.yaml`

```yaml
dependencies:
  supabase_flutter: ^2.0.0
```

### Initialize in `main.dart`

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: '',
    anonKey: 'YOUR_ANON_KEY',
  );

  runApp(MyApp());
}

final supabase = Supabase.instance.client;
```

---

## 2. Booking Status Flow

All apps follow this status progression:

```
pending → searching → accepted → pickedUp → droppedOff → paymentSent
                                                ↗
                    cancelled ←───────────────
```

| Status       | Who Sets It | Meaning                            |
|-------------|-------------|-------------------------------------|
| `pending`    | Passenger   | Ride requested, waiting for driver  |
| `searching`  | Passenger   | Actively searching for nearby drivers |
| `accepted`   | Driver (RPC)| Driver accepted the ride            |
| `pickedUp`   | Driver      | Passenger has been picked up        |
| `droppedOff` | Driver (RPC)| Ride completed, fare charged        |
| `paymentSent`| Passenger   | Payment confirmed                   |
| `cancelled`  | Passenger   | Ride cancelled before pickup        |

---

## 3. Passenger App — Key Flows

### 3A. Sign Up / Sign In

```dart
// Sign up new passenger
final res = await supabase.auth.signUp(
  email: email,
  password: password,
  data: {
    'first_name': firstName,
    'last_name': lastName,
    'phone_number': phoneNumber,
    'role': 'passenger',
  },
);
// The database trigger `handle_new_user` automatically creates
// a profiles row + passengers row.
```

### 3B. Request a Ride (INSERT booking)

```dart
// 1. Get the passenger's ID from the passengers table
final passengerId = await supabase
    .from('passengers')
    .select('id')
    .eq('profile_id', supabase.auth.currentUser!.id)
    .single()
    .then((data) => data['id']);

// 2. Get fare config
final fareConfig = await supabase
    .from('fare_configurations')
    .select('base_fare, per_km_rate, minimum_fare, booking_fee')
    .eq('is_active', true)
    .single();

// 3. Calculate estimated fare
double estimatedFare = fareConfig['base_fare'] +
    (distanceKm * fareConfig['per_km_rate']) +
    fareConfig['booking_fee'];
if (estimatedFare < fareConfig['minimum_fare']) {
  estimatedFare = fareConfig['minimum_fare'];
}

// 4. Insert the booking
final booking = await supabase.from('bookings').insert({
  'passenger_id': passengerId,
  'pickup_address': pickupAddress,
  'dropoff_address': dropoffAddress,
  'pickup_lat': pickupLat,
  'pickup_lng': pickupLng,
  'dropoff_lat': dropoffLat,
  'dropoff_lng': dropoffLng,
  'estimated_fare': estimatedFare,
  'status': 'pending',
}).select().single();

// This INSERT is immediately visible to:
//   - Admin dashboard (via Realtime subscription on bookings)
//   - All online drivers (via Realtime subscription on bookings)
```

### 3C. Listen for Ride Status Updates (Realtime)

```dart
final channel = supabase.channel('my-booking-${bookingId}')
  .onPostgresChanges(
    event: PostgresChangeEvent.update,
    schema: 'public',
    table: 'bookings',
    filter: PostgresChangeFilter(
      type: PostgresChangeFilterType.eq,
      column: 'id',
      value: bookingId,
    ),
    callback: (payload) {
      final newStatus = payload.newRecord['status'];
      // Update UI: pending → accepted → pickedUp → droppedOff
      setState(() => currentStatus = newStatus);

      if (newStatus == 'accepted') {
        // Show driver info
        final driverId = payload.newRecord['driver_id'];
        loadDriverInfo(driverId);
      }
    },
  )
  .subscribe();
```

### 3D. Cancel a Ride

```dart
// Only works while status is: pending, searching, or accepted
await supabase
    .from('bookings')
    .update({'status': 'cancelled'})
    .eq('id', bookingId);
```

---

## 4. Driver App — Key Flows

### 4A. Sign In

Drivers are created by the admin through the admin dashboard.
They sign in with the credentials the admin set up:

```dart
final res = await supabase.auth.signInWithPassword(
  email: driverEmail,
  password: driverPassword,
);
```

### 4B. Go Online / Offline

```dart
// Get driver record
final driverId = await supabase
    .from('drivers')
    .select('id')
    .eq('profile_id', supabase.auth.currentUser!.id)
    .single()
    .then((data) => data['id']);

// Toggle online status
await supabase
    .from('drivers')
    .update({'is_online': true})  // or false
    .eq('id', driverId);
// Admin dashboard sees this change instantly via Realtime
```

### 4C. Listen for Pending Bookings (Realtime)

```dart
final channel = supabase.channel('available-rides')
  .onPostgresChanges(
    event: PostgresChangeEvent.insert,
    schema: 'public',
    table: 'bookings',
    callback: (payload) {
      final status = payload.newRecord['status'];
      if (status == 'pending' || status == 'searching') {
        // Show new ride request to driver
        addToAvailableRides(payload.newRecord);
      }
    },
  )
  .onPostgresChanges(
    event: PostgresChangeEvent.update,
    schema: 'public',
    table: 'bookings',
    callback: (payload) {
      final status = payload.newRecord['status'];
      if (status != 'pending' && status != 'searching') {
        // Remove from available list (someone else accepted it)
        removeFromAvailableRides(payload.newRecord['id']);
      }
    },
  )
  .subscribe();
```

### 4D. Accept a Ride (Atomic RPC)

```dart
// This RPC uses SELECT ... FOR UPDATE to prevent race conditions.
// If two drivers tap "Accept" at the same time, only one succeeds.
final result = await supabase.rpc('accept_booking', params: {
  'p_booking_id': bookingId,
});

if (result['success'] == true) {
  // Ride is now assigned to you
  // Passenger and Admin both see this instantly via Realtime
  navigateToRideScreen(bookingId);
} else {
  // Another driver got it first
  showError(result['error']);
}
```

### 4E. Update Ride Status

```dart
// After arriving at pickup location:
await supabase
    .from('bookings')
    .update({'status': 'pickedUp'})
    .eq('id', bookingId);

// After dropping off passenger — use the RPC for completion:
final result = await supabase.rpc('complete_booking', params: {
  'p_booking_id': bookingId,
});
// This sets status = 'droppedOff' and actual_fare = estimated_fare
// Both passenger and admin see the completion instantly
```

---

## 5. Admin Dashboard — What It Already Does

The admin React app at `todago-admin-react/` is already fully connected:

- **Realtime subscriptions** on `bookings`, `drivers`, `profiles`, `vehicles`, `passengers`
- **Auto-refetch** on any database change
- **Manual driver assignment** — admin can assign drivers to bookings
- **Create drivers** — admin creates driver auth accounts + profiles
- **View all ride requests** — with status filters and search
- **Manage users** — activate/deactivate drivers and passengers

No changes needed in the admin app beyond what's already been updated.

---

## 6. How Sync Works End-to-End

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PASSENGER APP   │     │   SUPABASE DB    │     │  ADMIN DASHBOARD │
│  (Flutter)       │     │  (PostgreSQL)    │     │  (React)         │
└───────┬──────────┘     └────────┬─────────┘     └────────┬─────────┘
        │                         │                         │
        │ INSERT booking          │                         │
        │ (status=pending) ──────►│                         │
        │                         │──── Realtime event ────►│ Shows new
        │                         │                         │ "Pending" ride
        │                         │                         │
        │                         │     ┌──────────────────┐│
        │                         │     │  DRIVER APP      ││
        │                         │     │  (Flutter)       ││
        │                         │     └───────┬──────────┘│
        │                         │             │           │
        │                         │◄── RPC ─────┤           │
        │                         │ accept_     │           │
        │                         │ booking     │           │
        │                         │             │           │
        │ ◄── Realtime ──────────│             │           │
        │ (status=accepted,      │──── Realtime ──────────►│ Shows
        │  driver assigned)      │             │           │ "In Transit"
        │                        │             │           │
        │                        │◄── UPDATE ──┤           │
        │                        │ (pickedUp)  │           │
        │ ◄── Realtime ─────────│             │           │
        │                        │──── Realtime ──────────►│ Updates
        │                        │             │           │ status
        │                        │◄── RPC ─────┤           │
        │                        │ complete_   │           │
        │                        │ booking     │           │
        │ ◄── Realtime ─────────│             │           │
        │ (droppedOff)           │──── Realtime ──────────►│ Shows
        │                        │             │           │ "Completed"
```

---

## 7. Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | All user profiles (passenger, driver, admin) |
| `passengers` | Links profile → passenger with passenger-specific data |
| `drivers` | Links profile → driver with license, online status, approval |
| `vehicles` | Driver vehicles with plate numbers |
| `bookings` | All ride requests and their lifecycle |
| `vehicle_types` | Tricycle, E-Trike, etc. |
| `fare_configurations` | Base fare, per-km rate, minimum fare |

---

## 8. Available RPCs

| RPC | Called By | Purpose |
|-----|-----------|---------|
| `accept_booking(p_booking_id)` | Driver | Atomically accept a pending ride |
| `complete_booking(p_booking_id)` | Driver | Complete a ride (sets actual_fare = estimated_fare) |
| `create_driver_account(...)` | Admin | Create a new driver auth user + profile + vehicle |
| `rollback_user_creation(p_user_id)` | Admin | Clean up failed driver creation |
| `get_email_by_phone(p_phone, p_role)` | Passenger | Look up email from phone number for sign-in |
