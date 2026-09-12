import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function safetyChecks() {
  console.log("=== DB SAFETY CHECKS ===");
  
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) console.error("Profiles error:", pError);
  console.log("Profiles count:", profiles?.length);

  const { data: passengers, error: passError } = await supabase.from('passengers').select('*');
  if (passError) console.error("Passengers error:", passError);
  console.log("Passengers count:", passengers?.length);

  const { data: bookings, error: bError } = await supabase.from('bookings').select('id, passenger_id, driver_id');
  if (bError) console.error("Bookings error:", bError);
  console.log("Bookings count:", bookings?.length);

  // Check bookings with passenger reference
  let missingPassengerRefs = 0;
  let matchingPassengerRefs = 0;
  if (bookings && passengers) {
    bookings.forEach(b => {
      const passengerExist = passengers.some(p => p.id === b.passenger_id || p.profile_id === b.passenger_id);
      if (passengerExist) {
        matchingPassengerRefs++;
      } else {
        missingPassengerRefs++;
      }
    });
  }
  console.log(`Bookings referencing valid passengers: ${matchingPassengerRefs}`);
  console.log(`Bookings with missing/invalid passenger references: ${missingPassengerRefs}`);
}

safetyChecks();
