'use strict';

function json(res, statusCode, data, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.entries(extraHeaders).forEach(([k,v]) => res.setHeader(k, v));
  res.end(JSON.stringify(data));
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  const xr = req.headers['x-real-ip'];
  if (typeof xr === 'string' && xr.length) return xr.trim();
  return (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : '0.0.0.0';
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });
  return out;
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`); else parts.push('Path=/');
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`); else parts.push('SameSite=Strict');
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function readJsonBody(req, limitBytes = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = '';
    req.on('data', (d) => {
      size += d.length;
      if (size > limitBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks += d.toString('utf8');
    });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try { resolve(JSON.parse(chunks)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function allowCorsSameOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  const allowList = (process.env.CORS_ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowList.length) {
    if (allowList.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } else {
    // same-origin heuristic: allow if origin host matches request host
    try {
      const o = new URL(origin);
      const host = req.headers.host;
      if (host && (o.host === host)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    } catch (_) {}
  }
}

module.exports = { json, getClientIp, parseCookies, setCookie, readJsonBody, allowCorsSameOrigin };
