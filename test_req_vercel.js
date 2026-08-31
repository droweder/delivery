process.env.VERCEL = "1";
import app from './server.ts';
import http from 'http';

const server = http.createServer(app);
server.listen(9094, () => {
  http.get('http://localhost:9094/api/produtos', (res) => {
    console.log(res.statusCode);
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(data));
    setTimeout(() => process.exit(0), 100);
  });
});
