require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { db: { schema: 'delivery' } });

async function checkAll() {
  const tables = ['empresas', 'usuarios', 'bairros_taxas', 'produtos', 'clientes', 'entregadores', 'pedidos'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    console.log(`Tabela [${t}]:`, error ? `ERRO: ${error.message}` : `${data.length} registros`);
    if (data && data.length > 0 && t === 'produtos') {
      console.log('Exemplo produto:', data[0].nome);
    }
    if (data && data.length > 0 && t === 'usuarios') {
      console.log('Exemplo usuario:', data[0].login, data[0].perfil);
    }
  }
}
checkAll();
