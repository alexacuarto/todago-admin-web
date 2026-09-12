import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', { sql: 'SELECT 1;' });
    console.log("exec_sql result:", data, error);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
