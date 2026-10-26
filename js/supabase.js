// ============================================================
// Cliente Supabase (singleton)
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (SUPABASE_URL.startsWith('COLE_AQUI') || SUPABASE_ANON_KEY.startsWith('COLE_AQUI')) {
  const msg = 'Config do Supabase não preenchida. Abra js/config.js e cole suas chaves. Veja SUPABASE_SETUP.md';
  alert(msg);
  throw new Error(msg);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth(redirectTo = 'login.html') {
  const user = await getUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}
