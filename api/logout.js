const { clearSession } = require('./_auth');
module.exports = async (_req, res) => { clearSession(res); res.status(200).json({ ok: true }); };
