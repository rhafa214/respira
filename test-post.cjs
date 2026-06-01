const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/open-finance/token',
  method: 'POST',
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY (length):', data.length, 'BODY:', data));
});
req.on('error', e => console.error(e));
req.end();
