'use strict';

const mysql = require('mysql2/promise');

let pool;

/**
 * Supports either:
 * - DATABASE_URL=mysql://user:pass@host:port/db
 * - MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
 */
function getPool() {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (url) {
    pool = mysql.createPool(url);
    return pool;
  }

  const host = process.env.MYSQL_HOST;
  const database = process.env.MYSQL_DATABASE;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;

  if (!host || !database || !user || !password) return null;

  pool = mysql.createPool({
    host, user, password, database, port,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true
  });
  return pool;
}

module.exports = { getPool };
