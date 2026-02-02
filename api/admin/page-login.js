'use strict';

const { json } = require('../_lib/utils');
const { isIpAllowed } = require('../_lib/auth');

const HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n  <meta name=\"robots\" content=\"noindex,nofollow\" />\n  <title>Admin Login</title>\n  <style>\n    :root{--bg:#0a1628;--bg2:#1a0a2e;--card:rgba(255,255,255,.06);--border:rgba(255,255,255,.12);--txt:#fff;--muted:rgba(255,255,255,.65);--p:#8b5cf6;}\n    *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:linear-gradient(135deg,var(--bg),var(--bg2));min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;color:var(--txt)}\n    .card{width:100%;max-width:420px;background:var(--card);backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:16px;padding:32px;box-shadow:0 25px 50px rgba(0,0,0,.35)}\n    h1{margin:0 0 8px;font-size:1.6rem} p{margin:0 0 22px;color:var(--muted)}\n    label{display:block;margin:14px 0 8px;color:rgba(255,255,255,.8);font-size:.92rem}\n    input{width:100%;padding:14px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.08);color:var(--txt);outline:none}\n    input:focus{border-color:var(--p)}\n    button{width:100%;margin-top:18px;padding:14px;border:0;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-weight:700;cursor:pointer}\n    button:disabled{opacity:.6;cursor:not-allowed}\n    .err{display:none;margin-top:14px;padding:12px;border-radius:10px;background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.28);color:#fecaca}\n  </style>\n</head>\n<body>\n  <div class=\"card\">\n    <h1>Admin Login</h1>\n    <p>Restricted area.</p>\n\n    <div class=\"err\" id=\"err\"></div>\n\n    <label>Username</label>\n    <input id=\"u\" autocomplete=\"username\" />\n\n    <label>Password</label>\n    <input id=\"p\" type=\"password\" autocomplete=\"current-password\" />\n\n    <button id=\"btn\">Login</button>\n  </div>\n\n<script>\nconst err = document.getElementById('err');\nconst btn = document.getElementById('btn');\n\nfunction showErr(msg){\n  err.textContent = msg;\n  err.style.display = 'block';\n}\n\nbtn.addEventListener('click', async () => {\n  err.style.display = 'none';\n  btn.disabled = true;\n  try{\n    const username = document.getElementById('u').value.trim();\n    const password = document.getElementById('p').value;\n    const r = await fetch('/api/admin/login', {\n      method: 'POST',\n      headers: {'Content-Type':'application/json'},\n      body: JSON.stringify({username, password})\n    });\n    const j = await r.json().catch(()=>null);\n    if(!r.ok || !j || !j.ok){\n      showErr((j && j.error) ? j.error : 'Login failed');\n      btn.disabled = false;\n      return;\n    }\n    location.href = '/admin/dashboard';\n  }catch(e){\n    showErr('Network error');\n  }finally{\n    btn.disabled = false;\n  }\n});\n</script>\n</body>\n</html>\n";

module.exports = async (req, res) => {
  if (!isIpAllowed(req)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><title>404 Not Found</title><h1>Not Found</h1>');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(HTML);
};
