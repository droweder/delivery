const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
let inBlock = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('{') && !line.includes('}')) inBlock += (line.match(/\{/g) || []).length;
  if (line.includes('}') && !line.includes('{')) inBlock -= (line.match(/\}/g) || []).length;
  if (line.includes('{') && line.includes('}')) {
    inBlock += (line.match(/\{/g) || []).length;
    inBlock -= (line.match(/\}/g) || []).length;
  }
  if (inBlock === 0 && line.trim() && !line.startsWith('import') && !line.startsWith('//') && !line.startsWith('let') && !line.startsWith('const')) {
    console.log(i + 1, line);
  }
}
