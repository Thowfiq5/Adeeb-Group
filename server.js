const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_PATH = path.join(__dirname, 'data', 'vendor-applications.json');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]');
}

function readApplications() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw || '[]');
}

function writeApplications(apps) {
  ensureDataFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(apps, null, 2));
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readBody(req);
    const { username, password } = body;
    if (username === 'admin' && password === 'admin123') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ token: 'demo-token' }));
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  if (url.pathname === '/api/vendor-applications' && req.method === 'GET') {
    const apps = readApplications();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(apps));
  }

  if (url.pathname === '/api/vendor-applications' && req.method === 'POST') {
    const body = await readBody(req);
    const apps = readApplications();
    const newApp = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      company: body.company || '',
      contact: body.contact || '',
      email: body.email || '',
      phone: body.phone || '',
      status: 'pending',
    };
    apps.unshift(newApp);
    writeApplications(apps);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(newApp));
  }

  if (url.pathname.startsWith('/api/vendor-applications/') && req.method === 'PATCH') {
    const idStr = url.pathname.split('/').pop();
    const id = Number(idStr);
    const body = await readBody(req);
    const apps = readApplications();
    const idx = apps.findIndex(a => a.id === id);
    if (idx === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    if (body.status) apps[idx].status = body.status;
    writeApplications(apps);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(apps[idx]));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
