require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'delivery' } });

async function checkData() {
  const { data: bairros, error: err1 } = await supabase.from('bairros_taxas').select('*');
  console.log('Bairros:', bairros?.length, 'Err:', err1);
  const { data: clientes, error: err2 } = await supabase.from('clientes').select('*');
  console.log('Clientes:', clientes?.length, 'Err:', err2);
}
checkData();
