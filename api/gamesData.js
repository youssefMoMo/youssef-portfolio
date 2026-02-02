'use strict';

const { json, allowCorsSameOrigin, getClientIp } = require('./_lib/utils');

const ALLOWED_HOSTS = new Set(['apis.roblox.com', 'games.roblox.com', 'thumbnails.roblox.com']);

// Simple in-memory limiter (best-effort on serverless)
const rateState = global.__yd_rateState || (global.__yd_rateState = new Map());

function rateLimit(ip, limit = 30, windowSec = 60) {
  const now = Date.now();
  const key = `${ip}`;
  const bucket = rateState.get(key) || [];
  const fresh = bucket.filter(t => (now - t) < windowSec * 1000);
  if (fresh.length >= limit) {
    rateState.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateState.set(key, fresh);
  return true;
}

function validatePlaceIds(idsStr) {
  if (!idsStr) return [];
  const raw = idsStr.split(',');
  const out = [];
  for (const r of raw) {
    const id = r.trim();
    if (/^\d{1,20}$/.test(id)) out.push(id);
    if (out.length >= 20) break;
  }
  return out;
}

async function fetchJson(url, timeoutMs = 8000) {
  const u = new URL(url);
  if (!ALLOWED_HOSTS.has(u.host)) return null;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'YoussefDesign-Portfolio/1.0' },
      redirect: 'error',
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function placeToUniverseId(placeId) {
  const data = await fetchJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (data && typeof data.universeId === 'number') return String(data.universeId);
  if (data && typeof data.universeId === 'string' && /^\d+$/.test(data.universeId)) return String(data.universeId);
  return placeId;
}

module.exports = async (req, res) => {
  allowCorsSameOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!rateLimit(ip, 30, 60)) return json(res, 429, { ok: false, error: 'Rate limit exceeded. Please try again later.', code: 429 });

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const placeIds = validatePlaceIds(url.searchParams.get('ids') || '');
  if (!placeIds.length) return json(res, 400, { ok: false, error: 'No valid place IDs provided. IDs must be numeric.', code: 400 });

  try {
    const universeMap = {};
    for (const pid of placeIds) universeMap[pid] = await placeToUniverseId(pid);
    const uniqueUniverses = [...new Set(Object.values(universeMap))];

    const infoData = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${uniqueUniverses.join(',')}`);
    const iconData = await fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${uniqueUniverses.join(',')}&size=420x420&format=Png&isCircular=false`);

    const gameInfo = {};
    if (infoData && Array.isArray(infoData.data)) {
      for (const g of infoData.data) {
        if (g && g.id != null) {
          gameInfo[String(g.id)] = { name: g.name ?? null, visits: g.visits ?? null };
        }
      }
    }

    const gameIcons = {};
    if (iconData && Array.isArray(iconData.data)) {
      for (const i of iconData.data) {
        if (i && i.targetId != null && i.imageUrl) {
          gameIcons[String(i.targetId)] = i.imageUrl;
        }
      }
    }

    const out = [];
    let total = 0;
    for (const pid of placeIds) {
      const uid = universeMap[pid];
      const info = gameInfo[uid] || { name: null, visits: null };
      const icon = gameIcons[uid] || null;
      out.push({ inputId: pid, universeId: uid, name: info.name, visits: info.visits, icon });
      if (typeof info.visits === 'number' && Number.isFinite(info.visits)) total += Math.floor(info.visits);
    }

    return json(res, 200, { ok: true, data: out, totalVisits: String(total), count: out.length }, { 'Cache-Control': 'public, max-age=60, s-maxage=60' });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'An error occurred while fetching game data. Please try again.', code: 500 });
  }
};
