import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL:", url ? "SET" : "NOT SET");
console.log("KEY:", key ? "SET" : "NOT SET");
if (url && key) {
  const supabase = createClient(url, key, { db: { schema: 'delivery' } });
  supabase.from('clientes').select('id, nome').limit(2).then(res => console.log(res));
}
