// Strike Zone multiplayer server.
// Setup:  npm install ws   then   node server.js
// Put strike-zone.html in the same folder. Open http://<your-host>:3000 on every device.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'strike-zone.html');

const srv = http.createServer((req, res) => {
  fs.readFile(FILE, (e, d) => {
    if (e) { res.writeHead(500); return res.end('strike-zone.html not found next to server.js'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(d);
  });
});

const wss = new WebSocketServer({ server: srv, maxPayload: 8192 });
const clients = new Map();
let n = 0;

wss.on('connection', ws => {
  const id = Math.random().toString(36).slice(2, 8) + (++n);
  clients.set(ws, { id, p: {} });
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || m.t !== 'p' || !m.d || typeof m.d !== 'object') return;
    const c = clients.get(ws);
    for (const k in m.d) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
      if (m.d[k] === null) delete c.p[k]; else c.p[k] = m.d[k];
    }
  });
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

// Broadcast everyone's state 20 times a second.
setInterval(() => {
  const peers = {};
  for (const c of clients.values()) peers[c.id] = c.p;
  for (const [ws, c] of clients)
    if (ws.readyState === 1) ws.send(JSON.stringify({ t: 's', you: c.id, peers }));
}, 50);

srv.listen(PORT, () => console.log('Strike Zone running on http://localhost:' + PORT));
