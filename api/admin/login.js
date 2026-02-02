'use strict';

const bcrypt = require('bcryptjs');
const { json, readJsonBody, setCookie } = require('../_lib/utils');
const { issueAdminToken, COOKIE_NAME, CSRF_COOKIE, isIpAllowed } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Stealth: if IP not allowed -> 404
  if (!isIpAllowed(req)) return json(res, 404, { error: 'Not Found' });

  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  let body;
  try { body = await readJsonBody(req); }
  catch (e) { return json(res, 400, { ok: false, error: e.message }); }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) return json(res, 400, { ok: false, error: 'Username and password are required' });

  const envUser = process.env.ADMIN_USER || '';
  const hash = process.env.ADMIN_PASS_HASH || '';

  if (!envUser || !hash) return json(res, 500, { ok: false, error: 'Admin credentials are not configured' });

  const userOk = username === envUser;
  const passOk = userOk ? await bcrypt.compare(password, hash) : false;

  if (!passOk) return json(res, 401, { ok: false, error: 'Invalid username or password' });

  try {
    const { token, csrf } = await issueAdminToken(res, username, 1);

    // httpOnly session cookie
    setCookie(res, COOKIE_NAME, token, { httpOnly: true, sameSite: 'Strict', secure: true, path: '/' , maxAge: 3600});
    // csrf cookie (readable)
    setCookie(res, CSRF_COOKIE, csrf, { httpOnly: false, sameSite: 'Strict', secure: true, path: '/', maxAge: 3600 });

    return json(res, 200, { ok: true, message: 'Logged in' });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'Failed to login' });
  }
};
