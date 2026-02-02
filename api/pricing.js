'use strict';

const { json } = require('./_lib/utils');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const pool = getPool();
  if (!pool) return json(res, 500, { ok: false, error: 'Database is not configured' });

  try {
    const [rows] = await pool.query(
      `SELECT id, title, description, price, price_robux, features, is_popular, created_at
       FROM pricing_items
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at ASC`
    );

    const data = rows.map(r => {
      let features = [];
      try { features = typeof r.features === 'string' ? (JSON.parse(r.features) || []) : (r.features || []); } catch (_) {}
      return {
        id: Number(r.id),
        title: r.title,
        description: r.description,
        price: r.price,
        priceRobux: r.price_robux,
        features,
        isPopular: Boolean(r.is_popular),
        createdAt: r.created_at
      };
    });

    return json(res, 200, { ok: true, data, count: data.length }, { 'Cache-Control': 'public, max-age=300' });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'Failed to fetch pricing' });
  }
};
