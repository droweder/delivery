require('dotenv').config();
const https = require('https');

const url = new URL(process.env.VITE_SUPABASE_URL);
const options = {
  hostname: url.hostname,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Accept-Profile': 'delivery'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', body.slice(0, 500));
  });
});
req.on('error', e => console.error(e));
req.end();
