const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/db: \{ schema: 'delivery' \},/g, "// db: { schema: 'public' }");

fs.writeFileSync('server.ts', code);
console.log('server.ts updated');
