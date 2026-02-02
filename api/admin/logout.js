'use strict';

const { json, setCookie } = require('../_lib/utils');
const { COOKIE_NAME, CSRF_COOKIE, isIpAllowed } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (!isIpAllowed(req)) return json(res, 404, { error: 'Not Found' });
  // clear cookies
  setCookie(res, COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
  setCookie(res, CSRF_COOKIE, '', { httpOnly: false, maxAge: 0, path: '/' });
  return json(res, 200, { ok: true, message: 'Logged out' });
};
