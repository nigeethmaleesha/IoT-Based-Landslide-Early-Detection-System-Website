import { list } from '@vercel/blob';

const allowedPrefix = 'uploads/';

function displayName(pathname) {
  const leaf = pathname.split('/').pop() || 'file';
  return leaf.replace(/^\d{13}-[a-f0-9]{8}-/, '').replace(/[-_]+/g, ' ');
}

function categoryFromPath(pathname) {
  const parts = pathname.split('/');
  return parts[1] || 'other';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { blobs } = await list({ prefix: allowedPrefix, limit: 1000 });
    const type = String(req.query?.type || '').toLowerCase();
    const files = blobs
      .map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        contentType: blob.contentType || '',
        category: categoryFromPath(blob.pathname),
        name: displayName(blob.pathname)
      }))
      .filter((file) => !type || (type === 'video' ? file.category === 'video' : file.category !== 'video'))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ files });
  } catch (error) {
    console.error('files list error', error);
    return res.status(503).json({
      files: [],
      error: 'Document storage is not connected yet. Connect a Vercel Blob store to enable uploads.'
    });
  }
}
