const mediaState = document.querySelector('[data-video-state]');
const mediaContainer = document.querySelector('[data-video-container]');

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

async function loadVideo() {
  if (!mediaState || !mediaContainer) return;
  try {
    const response = await fetch('/api/files?type=video', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    const video = data.files?.[0];
    if (!video) {
      mediaContainer.hidden = true;
      mediaState.hidden = false;
      mediaState.innerHTML = `
        <div class="video-placeholder-icon" aria-hidden="true">▶</div>
        <div><strong>Project demonstration video slot is ready.</strong><span>Upload an MP4 or WebM from the secure Admin area and it will appear here automatically.</span></div>`;
      return;
    }
    mediaState.hidden = true;
    mediaContainer.hidden = false;
    mediaContainer.innerHTML = `
      <video controls preload="metadata" playsinline>
        <source src="${encodeURI(video.url)}" type="${escapeHtml(video.contentType || 'video/mp4')}">
        Your browser does not support HTML video.
      </video>
      <div class="video-caption"><strong>${escapeHtml(video.name)}</strong><span>Uploaded ${new Date(video.uploadedAt).toLocaleDateString()}</span></div>`;
  } catch {
    mediaContainer.hidden = true;
    mediaState.hidden = false;
    mediaState.innerHTML = '<div><strong>Video will be added shortly.</strong><span>The media section is already configured for the final project video.</span></div>';
  }
}

loadVideo();
