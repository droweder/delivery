const fs = require('fs');

['supabase/seed.sql', 'supabase/rls_policies.sql'].forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/delivery\./g, 'public.');
    fs.writeFileSync(file, code);
    console.log(file + ' updated');
  }
});
