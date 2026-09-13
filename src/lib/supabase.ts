import { createClient } from '@supabase/supabase-js';

// ===========================================================================
// TODA GO ADMIN WEB - TEST ENVIRONMENT CONFIGURATION
//
// Reads from .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) with fallback.
// ===========================================================================

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://psbubwtegbipjqjqezzc.supabase.co'; // <-- Replace with Test Supabase URL or set in .env

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzYnVid3RlZ2JpcGpxanFlenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDEyNTcsImV4cCI6MjEwNDg3NzI1N30.fveQqpO1ju3OSYuQExEwhQ10lb-LmqTbusQtY80_8z0'; // <-- Replace with your Test Anon Key or set in .env

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
