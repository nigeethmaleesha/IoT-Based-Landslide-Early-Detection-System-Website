import { del } from '@vercel/blob';
import { requireAdmin } from './_security.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Admin verification required.' });

  try {
    const { url, pathname } = req.body || {};
    if (!url || !pathname || !String(pathname).startsWith('uploads/')) {
      return res.status(400).json({ error: 'Invalid file.' });
    }
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
      return res.status(400).json({ error: 'Invalid storage URL.' });
    }
    await del(url);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('delete-file error', error);
    return res.status(500).json({ error: 'Unable to delete the file.' });
  }
}
