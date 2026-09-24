import { list } from '@vercel/blob';
import { requireAdmin } from './_security.js';

function cleanName(pathname) {
  return (pathname.split('/').pop() || 'file')
    .replace(/^\d{13}-[a-f0-9]{8}-/, '')
    .replace(/[-_]+/g, ' ');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Admin verification required.' });

  try {
    const { blobs } = await list({ prefix: 'uploads/', limit: 1000 });
    const files = blobs
      .map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        contentType: blob.contentType || '',
        category: blob.pathname.split('/')[1] || 'other',
        name: cleanName(blob.pathname)
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return res.status(200).json({ files });
  } catch (error) {
    console.error('admin-files error', error);
    return res.status(503).json({ files: [], error: 'Vercel Blob is not connected yet.' });
  }
}
