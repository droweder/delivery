import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { db: { schema: 'delivery' } });

async function run() {
  const { data, error } = await supabase.from('clientes').upsert([{
          id: 'test_c_1',
          empresa_id: 'emp1',
          nome: 'Test Client',
          telefone: '9999',
          cpf_cnpj: '',
          email: '',
          cep: '',
          endereco: 'End',
          numero: '1',
          complemento: '',
          bairro_id: 'b1',
          bairro_nome: 'Centro',
          cidade: 'SP',
          estado: 'SP',
          referencia: '',
          lat: 0,
          lng: 0,
        }]);
  console.log("Upsert Error:", error);
}
run();
