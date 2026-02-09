import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ FATAL: Supabase credentials not found!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

// Validate that anon key looks like a JWT
const isValidKey = supabaseAnonKey?.startsWith('eyJ');
if (supabaseAnonKey && !isValidKey) {
  console.error('❌ FATAL: Supabase anon key format invalid!');
  console.error('The key should be a JWT starting with "eyJ". Check your Supabase dashboard.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && isValidKey);
};
