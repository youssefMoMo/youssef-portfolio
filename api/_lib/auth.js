'use strict';

const { jwtVerify, SignJWT } = require('jose');
const { getClientIp, parseCookies } = require('./utils');

const COOKIE_NAME = 'yd_admin';
const CSRF_COOKIE = 'yd_csrf';

function parseAllowlist() {
  return (process.env.ADMIN_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isIpAllowed(req) {
  const ip = getClientIp(req);
  const allow = parseAllowlist();
  if (!allow.length) return false; // fail-closed
  return allow.includes(ip) || allow.includes('::1') || allow.includes('127.0.0.1');
}

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

async function requireAdmin(req) {
  if (!isIpAllowed(req)) return { ok: false, reason: 'ip' };
  const secret = getJwtSecret();
  if (!secret) return { ok: false, reason: 'secret' };

  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return { ok: false, reason: 'token' };

  try {
    const { payload } = await jwtVerify(token, secret);
    return { ok: true, payload, csrf: cookies[CSRF_COOKIE] || null };
  } catch (e) {
    return { ok: false, reason: 'invalid' };
  }
}

async function issueAdminToken(res, username, userId = 1) {
  const secret = getJwtSecret();
  if (!secret) throw new Error('Missing ADMIN_JWT_SECRET');

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ username, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1h
    .sign(secret);

  // CSRF double-submit token
  const csrf = cryptoRandomHex(32);

  return { token, csrf };
}

function cryptoRandomHex(bytes = 32) {
  const b = require('crypto').randomBytes(bytes);
  return b.toString('hex');
}

module.exports = { requireAdmin, issueAdminToken, COOKIE_NAME, CSRF_COOKIE, isIpAllowed };
