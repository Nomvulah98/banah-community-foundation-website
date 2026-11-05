'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT = fs.realpathSync(path.join(__dirname, 'public'));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4200);
const HTTPS_TERMINATED = process.env.HTTPS_TERMINATED === '1';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function isInsideRoot(candidate) {
  const relative = path.relative(ROOT, candidate);
  return relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function setSecurityHeaders(response) {
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; " +
      "form-action 'self' mailto:; script-src 'self'; style-src 'self'; img-src 'self'; " +
      "font-src 'self'; connect-src 'none'"
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (HTTPS_TERMINATED) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

function sendError(response, status, message, headers = {}) {
  setSecurityHeaders(response);
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(message);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendError(response, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return;
  }

  if (request.headers['content-length'] || request.headers['transfer-encoding']) {
    sendError(response, 400, 'Request body not accepted');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch (_) {
    sendError(response, 400, 'Bad request');
    return;
  }

  if (pathname.includes('\0') || pathname.includes('\\')) {
    sendError(response, 400, 'Bad request');
    return;
  }

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, requested);
  if (!isInsideRoot(candidate)) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  try {
    const realFile = await fs.promises.realpath(candidate);
    if (!isInsideRoot(realFile)) {
      sendError(response, 403, 'Forbidden');
      return;
    }

    const extension = path.extname(realFile).toLowerCase();
    const contentType = TYPES.get(extension);
    if (!contentType) {
      sendError(response, 404, 'Not found');
      return;
    }

    const stat = await fs.promises.stat(realFile);
    if (!stat.isFile()) {
      sendError(response, 404, 'Not found');
      return;
    }

    setSecurityHeaders(response);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=86400',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(realFile);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (_) {
    sendError(response, 404, 'Not found');
  }
});

server.headersTimeout = 10000;
server.requestTimeout = 15000;
server.keepAliveTimeout = 5000;

server.listen(PORT, HOST, () => {
  console.log(`Banah site listening on ${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
