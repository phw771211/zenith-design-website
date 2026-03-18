const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const PROJECTS_JS = path.join(ROOT, 'projects.js');
const UPLOAD_DIR  = path.join(ROOT, 'images', 'projects');
const PORT        = 3000;

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
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // POST /upload-image — multipart file upload, saves to images/projects/
    if (req.method === 'POST' && req.url === '/upload-image') {
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const ct = req.headers['content-type'] || '';
        const boundary = ct.split('boundary=')[1];
        if (!boundary) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'no boundary' })); return; }
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            try {
                const buf = Buffer.concat(chunks);
                const boundaryBuf = Buffer.from('--' + boundary);
                const parts = [];
                let start = 0;
                while (true) {
                    const idx = buf.indexOf(boundaryBuf, start);
                    if (idx === -1) break;
                    if (start > 0) parts.push(buf.slice(start, idx - 2));
                    start = idx + boundaryBuf.length + 2;
                }
                for (const part of parts) {
                    const headerEnd = part.indexOf('\r\n\r\n');
                    if (headerEnd === -1) continue;
                    const header = part.slice(0, headerEnd).toString();
                    if (!header.includes('filename=')) continue;
                    const fnMatch = header.match(/filename="([^"]+)"/);
                    if (!fnMatch) continue;
                    const filename = path.basename(fnMatch[1]);
                    const fileData = part.slice(headerEnd + 4);
                    const dest = path.join(UPLOAD_DIR, filename);
                    fs.writeFileSync(dest, fileData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, path: 'images/projects/' + filename }));
                    return;
                }
                res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'no file found' }));
            } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

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

    // Serve index.html for /
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
        res.end(fs.readFileSync(filePath));
        return;
    }

    res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('\n  Zenith site  →  http://localhost:' + PORT);
    console.log('  Admin panel  →  http://localhost:' + PORT + '/admin.html\n');
});
