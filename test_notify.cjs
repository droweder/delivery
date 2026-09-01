require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reloadCache() {
  // We can't run NOTIFY directly from supabase-js unless we use rpc.
  console.log('Testing connection...');
  const { data, error } = await supabase.rpc('reload_schema'); // just a guess, doesn't exist by default
  console.log(error);
}
reloadCache();
