#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(process.env.ROOT_DIR || process.cwd());
const port = Number(process.env.STATIC_PORT || 8000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function ensureUploadsDir() {
  const uploadsDir = path.resolve(rootDir, 'images', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

function sanitizeFilename(filename) {
  const raw = String(filename || '').trim();
  const base = raw.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return base || 'image';
}

function extensionFromMime(mime) {
  const normalized = String(mime || '').toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/jpeg') return '.jpg';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/svg+xml') return '.svg';
  return null;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function safeResolveFile(filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/')) {
    throw new Error('Invalid file path');
  }

  const normalized = path.posix.normalize(filePath);
  if (normalized.includes('..')) {
    throw new Error('Path traversal is not allowed');
  }

  const absPath = path.resolve(rootDir, `.${normalized}`);
  if (!absPath.startsWith(rootDir)) {
    throw new Error('Path outside workspace root is not allowed');
  }

  const ext = path.extname(absPath).toLowerCase();
  if (ext !== '.html' && ext !== '.json') {
    throw new Error('Only .html and .json files can be written');
  }

  return absPath;
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

async function handleWriteFiles(req, res) {
  try {
    const body = await parseRequestBody(req);
    const files = Array.isArray(body.files) ? body.files : null;

    if (!files || files.length === 0) {
      throw new Error('files[] is required');
    }

    const written = [];
    for (const file of files) {
      if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
        throw new Error('Each file must contain path and content');
      }

      const absPath = safeResolveFile(file.path);
      fs.writeFileSync(absPath, file.content, 'utf8');
      written.push(file.path);
    }

    sendJson(res, 200, { ok: true, written });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Failed to write files' });
  }
}

async function handleUploadImage(req, res) {
  try {
    const body = await parseRequestBody(req);
    const filename = sanitizeFilename(body.filename || 'image');
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      throw new Error('Invalid image payload');
    }

    const mimeType = match[1].toLowerCase();
    const extensionFromType = extensionFromMime(mimeType);
    if (!extensionFromType) {
      throw new Error('Unsupported image mime type');
    }

    const originalExt = path.extname(filename).toLowerCase();
    const extension = ALLOWED_IMAGE_EXTENSIONS.has(originalExt) ? originalExt : extensionFromType;
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      throw new Error('Unsupported image file extension');
    }

    const safeBase = path.basename(filename, path.extname(filename)) || 'image';
    const stampedName = `${Date.now()}-${safeBase}${extension}`;
    const uploadsDir = ensureUploadsDir();
    const absPath = path.resolve(uploadsDir, stampedName);
    if (!absPath.startsWith(uploadsDir)) {
      throw new Error('Invalid upload destination');
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0) {
      throw new Error('Empty image payload');
    }

    fs.writeFileSync(absPath, buffer);
    sendJson(res, 200, {
      ok: true,
      path: `/images/uploads/${stampedName}`,
      bytes: buffer.length,
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Failed to upload image' });
  }
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname;
  if (relativePath.endsWith('/')) {
    relativePath = `${relativePath}index.html`;
  }

  const absPath = path.resolve(rootDir, `.${path.posix.normalize(relativePath)}`);
  if (!absPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(absPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(absPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(absPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { ok: false, error: 'Missing URL' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, rootDir, port });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/write-files') {
    await handleWriteFiles(req, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/upload-image') {
    await handleUploadImage(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url.pathname);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Dev static server listening on http://0.0.0.0:${port}`);
  console.log(`Workspace root: ${rootDir}`);
});
