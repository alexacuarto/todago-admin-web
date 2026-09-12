import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `testpassenger_${Date.now()}@example.com`;
  const password = 'Password1234567!';

  console.log('1. Signing up test passenger:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: 'Test',
        last_name: 'Passenger',
        role: 'passenger'
      }
    }
  });

  if (authError) {
    console.error('Sign up failed:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('Passenger user ID:', userId);

  // Retrieve the passenger ID from the passengers table
  const { data: passengerData, error: pError } = await supabase
    .from('passengers')
    .select('id')
    .eq('profile_id', userId)
    .single();

  if (pError) {
    console.error('Failed to get passenger record:', pError);
    return;
  }

  const passengerId = passengerData.id;
  console.log('Passenger ID from table:', passengerId);

  // Retrieve an active vehicle type
  const { data: vtData, error: vtError } = await supabase
    .from('vehicle_types')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (vtError) {
    console.error('Failed to get vehicle type:', vtError);
    return;
  }

  const vehicleTypeId = vtData.id;

  // 2. Create a booking
  console.log('2. Creating booking...');
  const { data: bookingData, error: bError } = await supabase
    .from('bookings')
    .insert({
      passenger_id: passengerId,
      vehicle_type_id: vehicleTypeId,
      pickup_latitude: 14.0,
      pickup_longitude: 121.0,
      pickup_address: 'Pickup Location',
      dropoff_latitude: 14.01,
      dropoff_longitude: 121.01,
      dropoff_address: 'Dropoff Location',
      estimated_fare: 50.00,
      status: 'searching'
    })
    .select('id')
    .single();

  if (bError) {
    console.error('Failed to create booking:', bError);
    return;
  }

  const bookingId = bookingData.id;
  console.log('Booking created successfully. ID:', bookingId);

  // 3. Try to cancel the booking (simulating passenger cancellation)
  console.log('3. Attempting cancellation...');
  const updatePayload = {
    status: 'cancelled',
    cancelled_by: 'passenger',
    cancelled_at: new Date().toISOString(),
    cancel_reason: 'Test cancellation reason',
    cancel_details: 'Test details',
    updated_at: new Date().toISOString(),
  };

  const { data: cancelData, error: cancelError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select();

  if (cancelError) {
    console.error('❌ Cancellation failed with error:', cancelError);
  } else {
    console.log('✅ Cancellation succeeded:', cancelData);
  }
}

run();
