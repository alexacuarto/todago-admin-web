import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nbpzwbsptfcfyxjcpqgo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icHp3YnNwdGZjZnl4amNwcWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjUwMzgsImV4cCI6MjEwMTI0MTAzOH0.k588iXV5M9qqLe_-01TiHuQBn-qlQJYhG9n3_pWgL_k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});
