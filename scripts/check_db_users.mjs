import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { db: { schema: 'delivery' } });

async function run() {
  const { data: users, error: errUsers } = await supabase
    .from('usuarios')
    .select('id, nome, login, email, senha, pin_acesso, perfil, empresa_id');
  console.log('--- USUARIOS NA TABELA DELIVERY.USUARIOS ---');
  console.log(JSON.stringify(users, null, 2));
  if (errUsers) console.error('Erro users:', errUsers);

  const { data: emps, error: errEmps } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, cnpj, email');
  console.log('--- EMPRESAS ---');
  console.log(JSON.stringify(emps, null, 2));
  if (errEmps) console.error('Erro emps:', errEmps);

  try {
    const adminAuth = supabase.auth.admin;
    if (adminAuth) {
      const { data: authUsers, error: errAuth } = await adminAuth.listUsers();
      console.log('--- AUTH.USERS (GO TRUE) ---');
      console.log(authUsers?.users?.map(u => ({ id: u.id, email: u.email })));
      if (errAuth) console.error('Auth error:', errAuth);
    }
  } catch (e) {
    console.log('Auth admin check failed:', e.message);
  }
}

run();
