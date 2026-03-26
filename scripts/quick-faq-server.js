const fs = require('fs');
const http = require('http');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'src', 'faq.seed.ts');
let data = [];
try {
  const raw = fs.readFileSync(seedPath, 'utf8');
  data = JSON.parse(raw);
} catch (err) {
  console.error('Failed to read/parse seed file:', err.message);
  process.exit(1);
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/debug/faqs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data.slice(0, 5), null, 2));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`Quick FAQ server listening on http://localhost:${port}/debug/faqs`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});
