const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will replace `await supabase.from(X).upsert(Y);` with `const { error } = await supabase.from(X).upsert(Y); if (error) throw new Error(error.message);`
// Wait, doing this safely via regex is hard because it can span multiple lines.

