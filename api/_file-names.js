/**
 * Return the human-readable filename from a Vercel Blob pathname.
 *
 * Older uploads may include the 30-character Blob-generated suffix.
 * The 13-digit timestamp and 8-character hex prefix were created by our own
 * upload API; keep both identifiers in storage, never in displayed names.
 */
export function displayFilename(pathname) {
  const leaf = String(pathname || '').split('/').pop() || 'file';
  const generated = /^\d{13}-[a-f0-9]{8}-/i.test(leaf);
  const withoutPrefix = leaf.replace(/^\d{13}-[a-f0-9]{8}-/i, '');
  const dot = withoutPrefix.lastIndexOf('.');
  const stem = dot > 0 ? withoutPrefix.slice(0, dot) : withoutPrefix;
  const extension = dot > 0 ? withoutPrefix.slice(dot) : '';
  // Only remove a Blob suffix from files uploaded using this site's format.
  const cleanStem = generated ? stem.replace(/-[a-zA-Z0-9]{30}$/, '') : stem;
  return `${cleanStem.replace(/[-_]+/g, ' ')}${extension}`;
}
