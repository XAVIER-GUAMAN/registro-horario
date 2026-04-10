import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseClient = client;
export const supabase = client;