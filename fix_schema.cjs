const fs = require('fs');
let code = fs.readFileSync('supabase/schema.sql', 'utf8');

// replace "delivery." with "public."
code = code.replace(/delivery\./g, 'public.');
code = code.replace(/CREATE SCHEMA IF NOT EXISTS delivery;/g, '-- CREATE SCHEMA IF NOT EXISTS public;');
code = code.replace(/SET search_path TO delivery, public;/g, 'SET search_path TO public;');

fs.writeFileSync('supabase/schema.sql', code);
console.log('schema.sql updated');
