'use strict';

const { json, readJsonBody } = require('../_lib/utils');
const { getPool } = require('../_lib/db');
const { requireAdminOr404 } = require('./_require');

module.exports = async (req, res) => {
  const gate = await requireAdminOr404(req, res);
  if (!gate.ok) {
    // stealth for unauthorized:
    if (gate.ended) return;
    return json(res, 404, { error: 'Not Found' });
  }

  const pool = getPool();
  if (!pool) return json(res, 500, { ok: false, error: 'Database is not configured' });

  try {
    switch (req.method) {
      case 'GET': {
        const [rows] = await pool.query(`SELECT * FROM pricing_items ORDER BY sort_order ASC, created_at ASC`);
        const data = rows.map(r => {
          let features = [];
          try { features = typeof r.features === 'string' ? (JSON.parse(r.features) || []) : (r.features || []); } catch (_) {}
          return { ...r, features };
        });
        return json(res, 200, { ok: true, data, count: data.length }, { 'Cache-Control': 'no-store' });
      }

      case 'POST': {
        const body = await readJsonBody(req);
        if (!body.title || !body.description || !body.price) return json(res, 400, { ok: false, error: 'Title, description, and price are required' });

        const featuresJson = JSON.stringify(Array.isArray(body.features) ? body.features : []);
        const isPopular = body.is_popular ? 1 : 0;
        const isActive = (body.is_active === false) ? 0 : 1;
        const sortOrder = Number.isFinite(+body.sort_order) ? Math.floor(+body.sort_order) : 0;

        const [result] = await pool.execute(
          `INSERT INTO pricing_items (title, description, price, price_robux, features, is_popular, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(body.title).trim(),
            String(body.description).trim(),
            String(body.price).trim(),
            body.price_robux != null ? String(body.price_robux).trim() : null,
            featuresJson,
            isPopular,
            isActive,
            sortOrder
          ]
        );
        return json(res, 201, { ok: true, message: 'Pricing item created successfully', id: result.insertId });
      }

      case 'PUT': {
        const body = await readJsonBody(req);
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json(res, 400, { ok: false, error: 'Pricing item ID is required' });

        const updates = [];
        const params = [];

        const set = (col, val) => { updates.push(`${col} = ?`); params.push(val); };

        if (body.title != null) set('title', String(body.title).trim());
        if (body.description != null) set('description', String(body.description).trim());
        if (body.price != null) set('price', String(body.price).trim());
        if (Object.prototype.hasOwnProperty.call(body, 'price_robux')) set('price_robux', body.price_robux ? String(body.price_robux).trim() : null);
        if (body.features != null) set('features', JSON.stringify(Array.isArray(body.features) ? body.features : []));
        if (body.is_popular != null) set('is_popular', body.is_popular ? 1 : 0);
        if (body.is_active != null) set('is_active', body.is_active ? 1 : 0);
        if (body.sort_order != null) set('sort_order', Number.isFinite(+body.sort_order) ? Math.floor(+body.sort_order) : 0);

        if (!updates.length) return json(res, 400, { ok: false, error: 'No fields to update' });

        params.push(id);
        const [result] = await pool.execute(`UPDATE pricing_items SET ${updates.join(', ')} WHERE id = ?`, params);
        if (result.affectedRows === 0) return json(res, 404, { ok: false, error: 'Pricing item not found' });
        return json(res, 200, { ok: true, message: 'Pricing item updated successfully' });
      }

      case 'DELETE': {
        const body = await readJsonBody(req);
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json(res, 400, { ok: false, error: 'Pricing item ID is required' });

        const [result] = await pool.execute(`DELETE FROM pricing_items WHERE id = ?`, [id]);
        if (result.affectedRows === 0) return json(res, 404, { ok: false, error: 'Pricing item not found' });
        return json(res, 200, { ok: true, message: 'Pricing item deleted successfully' });
      }

      default:
        return json(res, 405, { ok: false, error: 'Method not allowed' });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: 'An error occurred' });
  }
};
