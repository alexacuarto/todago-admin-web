import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('cancellation_reason, cancelled_by, cancelled_at')
      .limit(1);
    console.log("standard cancellation columns:", data, error);

    const { data: data2, error: error2 } = await supabase
      .from('bookings')
      .select('cancel_reason')
      .limit(1);
    console.log("cancel_reason column check:", data2, error2);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
