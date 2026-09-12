import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('discount_id_image')
      .limit(1);
    console.log("Check discount_id_image:", data, error);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
