import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: cols, error: err } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    console.log("drivers query result:", cols, err);
  } catch (e) {
    console.error("Error running query:", e);
  }
}

run();
