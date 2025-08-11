import { createClient } from '@supabase/supabase-js';
import { Database } from '../types.ts';

export const supabaseUrl = (window as any).__env?.VITE_SUPABASE_URL;
export const supabaseAnonKey = (window as any).__env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Please check the configuration script in your index.html file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);