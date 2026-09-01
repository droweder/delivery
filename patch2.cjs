const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helper = `
async function syncFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    console.log('[Supabase] Sincronizando dados no inicio...');
    const tables = [
      { name: 'bairros_taxas', ref: bairros },
      { name: 'produtos', ref: produtos },
      { name: 'clientes', ref: clientes },
      { name: 'entregadores', ref: entregadores },
      { name: 'pedidos', ref: pedidos },
      { name: 'usuarios', ref: usuarios },
      { name: 'fechamentos_caixa', ref: fechamentos },
      { name: 'movimentacoes_estoque', ref: movimentacoesEstoque }
    ];
    for (const t of tables) {
      const { data, error } = await supabase.from(t.name).select('*');
      if (!error && data) {
        t.ref.splice(0, t.ref.length, ...data);
      }
    }
  } catch (err) {
    console.error('[Supabase] Erro na sincronizacao:', err);
  }
}
`;

code = code.replace("function getSupabase() {", helper + "\nfunction getSupabase() {");
fs.writeFileSync('server.ts', code);
console.log('Second patch applied');
