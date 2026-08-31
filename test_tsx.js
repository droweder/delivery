import app from './server.ts';
import http from 'http';

const server = http.createServer(app);
server.listen(9097, () => {
  http.get('http://localhost:9097/api/empresas', (res) => {
    console.log("Status:", res.statusCode);
    res.on('data', d => console.log(d.toString()));
    setTimeout(() => process.exit(0), 100);
  });
});
