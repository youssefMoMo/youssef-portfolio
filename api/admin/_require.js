'use strict';

const { requireAdmin } = require('../_lib/auth');
const { json } = require('../_lib/utils');

async function requireAdminOr404(req, res, { requireCsrfForWrite = true } = {}) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return { ok: false, ended: true, auth };
  }

  // For mutating methods require CSRF header == csrf cookie
  const method = req.method || 'GET';
  const isWrite = method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';

  if (requireCsrfForWrite && isWrite) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!csrfHeader || csrfHeader !== auth.csrf) {
      json(res, 403, { ok: false, error: 'Invalid CSRF token' });
      return { ok: false, ended: true, auth };
    }
  }

  return { ok: true, ended: false, auth };
}

module.exports = { requireAdminOr404 };
