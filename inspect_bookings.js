import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '';
const supabaseAnonKey = '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  try {
    // We can select one row or just check if querying columns fails
    const { data: pData, error: pError } = await supabase
      .from('passengers')
      .select('cancel_count, last_cancel_date, booking_restriction_until, warning_status')
      .limit(1);
    
    console.log('passengers check:', pData ? 'Success' : 'Failed', pError);

    const { data: profData, error: profError } = await supabase
      .from('profiles')
      .select('cancel_count, last_cancel_date, booking_restriction_until, warning_status')
      .limit(1);
    
    console.log('profiles check:', profData ? 'Success' : 'Failed', profError);
  } catch (e) {
    console.error('Exception:', e);
  }
}

inspect();
