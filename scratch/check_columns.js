import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('passengers').select('*').limit(1);
  console.log("passengers sample:", data, error);
  
  const { data: profiles, error: error2 } = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles sample:", profiles, error2);
}

run();
