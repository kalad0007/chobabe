import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // Try import.meta.env first, then process.env (if defined via vite)
  const value = import.meta.env[key];
  if (!value || value === 'undefined' || typeof value !== 'string') return null;
  // 따옴표나 공백 제거
  return value.trim().replace(/['"]/g, '');
};

const rawUrl = getEnv('VITE_SUPABASE_URL');
let supabaseUrl = 'https://placeholder-project.supabase.co';

if (rawUrl) {
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    supabaseUrl = rawUrl;
  } else if (rawUrl.length > 0) {
    // ID만 입력된 경우 자동으로 URL 생성
    supabaseUrl = `https://${rawUrl}.supabase.co`;
    console.log('Constructed Supabase URL from ID:', supabaseUrl);
  }
}

const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder-key';

if (supabaseUrl.includes('placeholder-project')) {
  console.error('CRITICAL: Supabase URL is invalid or missing.');
} else {
  console.log('Supabase URL:', supabaseUrl);
  if (supabaseAnonKey === 'placeholder-key') {
    console.error('CRITICAL: Supabase Anon Key is MISSING! Please check AI Studio Secrets.');
  } else {
    console.log('Supabase Key detected! (Starts with: ' + supabaseAnonKey.substring(0, 7) + '...)');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
