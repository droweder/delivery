require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const publicClient = createClient(url, key);
  // Let's test if there is any table or function in public
  const res = await publicClient.from('usuarios').select('*');
  console.log('Public usuarios:', res.error ? res.error.message : res.data);
  
  const drowederClient = createClient(url, key, { db: { schema: 'droweder_ia' } });
  const res2 = await drowederClient.from('usuarios').select('*');
  console.log('droweder_ia usuarios:', res2.error ? res2.error.message : res2.data);

  const planintexClient = createClient(url, key, { db: { schema: 'planintex' } });
  const res3 = await planintexClient.from('usuarios').select('*');
  console.log('planintex usuarios:', res3.error ? res3.error.message : res3.data);
}
check();
