import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: cols, error: err } = await supabase
      .rpc('get_table_columns_for_notifications');
    
    if (err) {
      // If RPC doesn't exist, we can try running a custom query through standard postgrest if possible,
      // or we can select a non-existent column to see if it throws an error listing columns.
      console.log("RPC error, attempting fallback select for non-existent column:", err);
      const { data: cols2, error: err2 } = await supabase
        .from('notifications')
        .select('notification_type')
        .limit(1);
      console.log("Check if notification_type exists:", cols2, err2);
    } else {
      console.log("Columns:", cols);
    }
  } catch (e) {
    console.error("Error running query:", e);
  }
}

run();
