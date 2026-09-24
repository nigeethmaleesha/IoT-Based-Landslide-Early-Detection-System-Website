import { clearCookie } from './_security.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Set-Cookie', clearCookie('admin_session'));
  return res.status(200).json({ ok: true });
}
