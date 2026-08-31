const crypto = require('crypto');

function secret() { return process.env.STUDIO_SESSION_SECRET || process.env.STUDIO_PASSWORD || 'change-me-in-vercel'; }
function sign(value) { return crypto.createHmac('sha256', secret()).update(value).digest('hex'); }
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function sessionValue() {
  const payload = `casebook-admin:${process.env.STUDIO_PASSWORD || ''}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}
function isAuthenticated(req) {
  const token = parseCookies(req).casebook_session;
  if (!token) return false;
  const expected = sessionValue();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
function setSession(res) { res.setHeader('Set-Cookie', `casebook_session=${encodeURIComponent(sessionValue())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`); }
function clearSession(res) { res.setHeader('Set-Cookie', 'casebook_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); }
function requireAuth(req, res) { if (isAuthenticated(req)) return true; res.statusCode=401; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({error:'Unauthorized'})); return false; }
module.exports={isAuthenticated,setSession,clearSession,requireAuth};
