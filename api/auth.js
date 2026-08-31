const { setSession, isAuthenticated } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ authenticated: isAuthenticated(req) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STUDIO_PASSWORD) return res.status(500).json({ error: 'STUDIO_PASSWORD is not configured in Vercel.' });
  const { password } = req.body || {};
  if (!password || password !== process.env.STUDIO_PASSWORD) return res.status(401).json({ error: 'Incorrect password.' });
  setSession(res);
  return res.status(200).json({ authenticated: true });
};
