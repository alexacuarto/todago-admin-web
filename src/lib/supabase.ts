import { createClient } from '@supabase/supabase-js';

// ===========================================================================
// TODA GO ADMIN WEB - TEST ENVIRONMENT CONFIGURATION
//
// Reads from .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) with fallback.
// ===========================================================================

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://nbpzwbsptfcfyxjcpqgo.supabase.co'; // <-- Replace with your Test Supabase URL or set in .env

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icHp3YnNwdGZjZnl4amNwcWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjUwMzgsImV4cCI6MjEwMTI0MTAzOH0.k588iXV5M9qqLe_-01TiHuQBn-qlQJYhG9n3_pWgL_k'; // <-- Replace with your Test Anon Key or set in .env

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
