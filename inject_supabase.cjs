const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will add a sync helper function
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

// Insert the helper after `function getSupabase() { ... }`
code = code.replace(/function getSupabase\(\) \{[\s\S]*?return supabaseClient;\n\}/, match => match + '\n' + helper);

// Call syncFromSupabase() when server starts
code = code.replace(/app\.listen\(PORT, '0\.0\.0\.0', \(\) => \{/, "app.listen(PORT, '0.0.0.0', async () => {\n  await syncFromSupabase();");

// Now we need a generic middleware to handle POST/PUT/DELETE
// We can intercept `res.send` or `res.json` to capture the final object, but it's easier to just intercept req/res methods.
// Actually, let's write a middleware that intercepts POST/PUT/DELETE after the route has been handled.
// Wait, the routes do not call next(). They call res.json() and finish the request.
// So we can patch `res.json`!

const resPatch = `
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    // Let the original function run first
    originalJson.call(this, body);
    
    // Now handle side-effects for Supabase
    if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const supabase = getSupabase();
      if (!supabase) return;
      
      const path = req.path;
      let tableName = '';
      if (path.startsWith('/api/bairros')) tableName = 'bairros_taxas';
      else if (path.startsWith('/api/produtos')) tableName = 'produtos';
      else if (path.startsWith('/api/clientes')) tableName = 'clientes';
      else if (path.startsWith('/api/entregadores')) tableName = 'entregadores';
      else if (path.startsWith('/api/pedidos')) tableName = 'pedidos';
      else if (path.startsWith('/api/usuarios')) tableName = 'usuarios';
      else if (path.startsWith('/api/fechamentos')) tableName = 'fechamentos_caixa';
      else if (path.startsWith('/api/estoque/ajustar')) tableName = 'movimentacoes_estoque';
      else if (path.startsWith('/api/empresas')) tableName = 'empresas';
      
      if (tableName) {
        (async () => {
          try {
             if (req.method === 'POST') {
               // body might be the created object, or { sucesso: true, produto: ..., movimentacao: ... }
               let objToInsert = body;
               if (body.movimentacao) objToInsert = body.movimentacao; // for estoque
               else if (body.bairro) objToInsert = body.bairro;
               // if it's an array, maybe we don't handle it easily this way, but standard routes return the object.
               
               // Avoid trying to insert {sucesso: true} objects directly if they wrap the entity
               if (body.sucesso && Object.keys(body).length > 1) {
                  // Find the first object property that has an 'id'
                  for (const key in body) {
                     if (body[key] && body[key].id) {
                         objToInsert = body[key];
                         break;
                     }
                  }
               }
               
               if (objToInsert && objToInsert.id) {
                 const { error } = await supabase.from(tableName).upsert(objToInsert);
                 if (error) console.error('[Supabase] Insert error:', tableName, error.message);
               }
             } else if (req.method === 'PUT') {
               let objToUpdate = body;
               if (body.sucesso && Object.keys(body).length > 1) {
                  for (const key in body) {
                     if (body[key] && body[key].id) {
                         objToUpdate = body[key];
                         break;
                     }
                  }
               }
               if (objToUpdate && objToUpdate.id) {
                 const { error } = await supabase.from(tableName).update(objToUpdate).eq('id', objToUpdate.id);
                 if (error) console.error('[Supabase] Update error:', tableName, error.message);
               }
             } else if (req.method === 'DELETE') {
               // ID is usually in req.params or the deleted object is in body
               const id = req.params.id || (body && body.id) || (body && body.removido && body.removido.id) || (body && body.bairro && body.bairro.id);
               let deleteId = id;
               if (!deleteId && body.sucesso) {
                  for (const key in body) {
                     if (body[key] && body[key].id) {
                         deleteId = body[key].id;
                         break;
                     }
                  }
               }
               if (deleteId) {
                 const { error } = await supabase.from(tableName).delete().eq('id', deleteId);
                 if (error) console.error('[Supabase] Delete error:', tableName, error.message);
               }
             }
          } catch(e) {
             console.error('[Supabase] Middleware sync error:', e);
          }
        })();
      }
    }
  };
  next();
});
`;

code = code.replace("app.use(express.json({ limit: '10mb' }));", "app.use(express.json({ limit: '10mb' }));\n" + resPatch);

fs.writeFileSync('server.ts', code);
console.log('Patch aplicado!');
