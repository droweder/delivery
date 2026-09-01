require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  for (const schema of ['public', 'api', 'planintex', 'droweder_ia', 'delivery']) {
    const client = createClient(url, key, { db: { schema } });
    try {
      const res = await client.from('bairros_taxas').select('*').limit(1);
      console.log(`Schema [${schema}] bairros_taxas:`, res.error ? res.error.message : 'OK (' + (res.data ? res.data.length : 0) + ' rows)');
    } catch (e) {
      console.log(`Schema [${schema}] Exception:`, e.message);
    }
  }
}
run();
