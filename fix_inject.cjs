const fs = require('fs');
let code = fs.readFileSync('inject_supabase.cjs', 'utf8');
code = code.replace("`{sucesso: true}`", "{sucesso: true}");
fs.writeFileSync('inject_supabase.cjs', code);
