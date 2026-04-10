import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Export with both names for compatibility
export const supabaseClient = client;
export const supabase = client;