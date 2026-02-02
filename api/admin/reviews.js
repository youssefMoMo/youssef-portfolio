'use strict';

const { json, readJsonBody } = require('../_lib/utils');
const { getPool } = require('../_lib/db');
const { requireAdminOr404 } = require('./_require');

module.exports = async (req, res) => {
  const gate = await requireAdminOr404(req, res);
  if (!gate.ok) {
    if (gate.ended) return;
    return json(res, 404, { error: 'Not Found' });
  }

  const pool = getPool();
  if (!pool) return json(res, 500, { ok: false, error: 'Database is not configured' });

  try {
    switch (req.method) {
      case 'GET': {
        const [rows] = await pool.query(`SELECT * FROM reviews ORDER BY sort_order ASC, created_at DESC`);
        return json(res, 200, { ok: true, data: rows, count: rows.length }, { 'Cache-Control': 'no-store' });
      }

      case 'POST': {
        const body = await readJsonBody(req);
        if (!body.author || body.rating == null || !body.text) return json(res, 400, { ok: false, error: 'Author, rating, and text are required' });

        const rating = Math.max(1, Math.min(5, Math.floor(+body.rating)));
        const isActive = (body.is_active === false) ? 0 : 1;
        const sortOrder = Number.isFinite(+body.sort_order) ? Math.floor(+body.sort_order) : 0;

        const [result] = await pool.execute(
          `INSERT INTO reviews (author, rating, text, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            String(body.author).trim(),
            rating,
            String(body.text).trim(),
            body.image_url ? String(body.image_url).trim() : null,
            isActive,
            sortOrder
          ]
        );
        return json(res, 201, { ok: true, message: 'Review created successfully', id: result.insertId });
      }

      case 'PUT': {
        const body = await readJsonBody(req);
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json(res, 400, { ok: false, error: 'Review ID is required' });

        const updates = [];
        const params = [];
        const set = (col, val) => { updates.push(`${col} = ?`); params.push(val); };

        if (body.author != null) set('author', String(body.author).trim());
        if (body.rating != null) set('rating', Math.max(1, Math.min(5, Math.floor(+body.rating))));
        if (body.text != null) set('text', String(body.text).trim());
        if (Object.prototype.hasOwnProperty.call(body, 'image_url')) set('image_url', body.image_url ? String(body.image_url).trim() : null);
        if (body.is_active != null) set('is_active', body.is_active ? 1 : 0);
        if (body.sort_order != null) set('sort_order', Number.isFinite(+body.sort_order) ? Math.floor(+body.sort_order) : 0);

        if (!updates.length) return json(res, 400, { ok: false, error: 'No fields to update' });

        params.push(id);
        const [result] = await pool.execute(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, params);
        if (result.affectedRows === 0) return json(res, 404, { ok: false, error: 'Review not found' });
        return json(res, 200, { ok: true, message: 'Review updated successfully' });
      }

      case 'DELETE': {
        const body = await readJsonBody(req);
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json(res, 400, { ok: false, error: 'Review ID is required' });

        const [result] = await pool.execute(`DELETE FROM reviews WHERE id = ?`, [id]);
        if (result.affectedRows === 0) return json(res, 404, { ok: false, error: 'Review not found' });
        return json(res, 200, { ok: true, message: 'Review deleted successfully' });
      }

      default:
        return json(res, 405, { ok: false, error: 'Method not allowed' });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: 'An error occurred' });
  }
};
