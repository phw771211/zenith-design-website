const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const ADMIN_HTML = path.join(ROOT, 'admin.html');
const PROJECTS_JS = path.join(ROOT, 'projects.js');
const PORT       = 3001;

const MIME = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.otf':  'font/otf',
    '.json': 'application/json',
};

const server = http.createServer((req, res) => {
    // CORS for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // POST /save-projects — write updated projects.js
    if (req.method === 'POST' && req.url === '/save-projects') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { projects } = JSON.parse(body);
                if (!Array.isArray(projects)) throw new Error('projects must be an array');
                const content = 'window.PROJECTS = ' + JSON.stringify(projects, null, 2) + ';\n';
                fs.writeFileSync(PROJECTS_JS, content, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

    // Serve admin.html at /
    if (req.method === 'GET' && (req.url === '/' || req.url === '/admin' || req.url === '/admin.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(ADMIN_HTML));
        return;
    }

    // Serve static assets (CSS, fonts, images) so the preview works
    const filePath = path.join(ROOT, req.url.split('?')[0]);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(fs.readFileSync(filePath));
        return;
    }

    res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  Zenith Admin  →  http://localhost:${PORT}\n`);
});
