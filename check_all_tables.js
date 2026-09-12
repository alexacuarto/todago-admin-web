import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: drivers, error: dErr } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    console.log("Sample driver row:", drivers, dErr);
  } catch (e) {
    console.error(e);
  }
}

run();

