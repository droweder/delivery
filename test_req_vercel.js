process.env.VERCEL = "1";
import app from './server.ts';
import http from 'http';

const server = http.createServer(app);
server.listen(9090, () => {
  http.get('http://localhost:9090/api/empresas', (res) => {
    console.log(res.statusCode);
    res.on('data', d => process.stdout.write(d));
    setTimeout(() => process.exit(0), 100);
  });
});
