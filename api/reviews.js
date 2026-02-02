'use strict';

const { json } = require('./_lib/utils');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const pool = getPool();
  if (!pool) return json(res, 500, { ok: false, error: 'Database is not configured' });

  try {
    const [rows] = await pool.query(
      `SELECT id, author, rating, text, image_url, created_at
       FROM reviews
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at DESC`
    );

    const data = rows.map(r => ({
      id: Number(r.id),
      author: r.author,
      rating: Number(r.rating),
      text: r.text,
      imageUrl: r.image_url,
      createdAt: r.created_at
    }));

    return json(res, 200, { ok: true, data, count: data.length }, { 'Cache-Control': 'public, max-age=300' });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'Failed to fetch reviews' });
  }
};
