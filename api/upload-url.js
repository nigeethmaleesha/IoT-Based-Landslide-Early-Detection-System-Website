import crypto from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { requireAdmin } from './_security.js';

const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm']);
const CATEGORIES = new Set(['proposal', 'research-paper', 'report', 'presentation', 'design', 'dataset', 'other', 'video']);
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

function safeFilename(name) {
  const parts = String(name || '').split('.');
  const ext = parts.pop()?.toLowerCase() || '';
  const base = parts.join('.')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100) || 'file';
  return { base, ext };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req)) return res.status(401).json({ error: 'Admin verification required.' });

  try {
    const { filename, category = 'other', size = 0 } = req.body || {};
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Invalid file category.' });

    const { base, ext } = safeFilename(filename);
    const isVideo = category === 'video';
    const allowed = isVideo ? VIDEO_EXTENSIONS : DOC_EXTENSIONS;
    if (!allowed.has(ext)) return res.status(400).json({ error: `.${ext || '?'} files are not allowed in this category.` });

    const numericSize = Number(size) || 0;
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_DOCUMENT_SIZE;
    if (numericSize <= 0 || numericSize > maxSize) {
      return res.status(400).json({ error: `File must be smaller than ${Math.round(maxSize / 1024 / 1024)} MB.` });
    }

    const pathname = `uploads/${category}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}.${ext}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const token = await issueSignedToken({
      pathname,
      operations: ['put'],
      maximumSizeInBytes: maxSize,
      validUntil
    });
    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'put',
      validUntil
    });

    return res.status(200).json({ presignedUrl, pathname, validUntil });
  } catch (error) {
    console.error('upload-url error', error);
    return res.status(503).json({ error: 'Unable to prepare the upload. Check the Vercel Blob connection.' });
  }
}
