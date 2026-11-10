import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { db: { schema: 'delivery' } });

async function run() {
  const { data, error } = await supabase.from('clientes').select('*').limit(1);
  console.log(data);
}
run();
