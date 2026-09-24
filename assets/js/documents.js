const listEl = document.querySelector('[data-document-list]');
const stateEl = document.querySelector('[data-document-state]');
const filterButtons = document.querySelectorAll('[data-doc-filter]');
let allFiles = [];
let activeFilter = 'all';

const labels = {
  proposal: 'Proposal',
  'research-paper': 'Research Paper',
  report: 'Report',
  presentation: 'Presentation',
  design: 'Design',
  dataset: 'Dataset',
  other: 'Other'
};

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function formatBytes(bytes = 0) {
  if (!bytes) return '—';
  const units = ['B','KB','MB','GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (['ppt','pptx'].includes(ext)) return 'PPT';
  if (['doc','docx'].includes(ext)) return 'DOC';
  if (['xls','xlsx'].includes(ext)) return 'XLS';
  if (ext === 'zip') return 'ZIP';
  return 'FILE';
}

function render() {
  const files = activeFilter === 'all' ? allFiles : allFiles.filter((f) => f.category === activeFilter);
  if (!files.length) {
    listEl.innerHTML = '';
    stateEl.hidden = false;
    stateEl.innerHTML = `<strong>No ${activeFilter === 'all' ? '' : escapeHtml(labels[activeFilter] || activeFilter)} files yet.</strong><span>Uploaded project documents will appear here automatically.</span>`;
    return;
  }
  stateEl.hidden = true;
  listEl.innerHTML = files.map((file) => `
    <article class="document-card">
      <div class="file-badge">${fileIcon(file.name)}</div>
      <div class="document-card__body">
        <span class="eyebrow small">${escapeHtml(labels[file.category] || file.category)}</span>
        <h3>${escapeHtml(file.name)}</h3>
        <p>${formatBytes(file.size)} · ${new Date(file.uploadedAt).toLocaleDateString()}</p>
      </div>
      <a class="btn btn-small btn-outline" href="${encodeURI(file.url)}" target="_blank" rel="noopener">Open file</a>
    </article>`).join('');
}

async function load() {
  stateEl.hidden = false;
  stateEl.innerHTML = '<span class="spinner"></span><span>Loading project files…</span>';
  try {
    const response = await fetch('/api/files?type=document', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    allFiles = data.files || [];
    render();
    if (data.error && !allFiles.length) {
      stateEl.hidden = false;
      stateEl.innerHTML = `<strong>File storage is ready to connect.</strong><span>${escapeHtml(data.error)}</span>`;
    }
  } catch {
    allFiles = [];
    stateEl.hidden = false;
    stateEl.innerHTML = '<strong>Files are temporarily unavailable.</strong><span>Please try again shortly.</span>';
  }
}

filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.docFilter;
  filterButtons.forEach((b) => b.classList.toggle('active', b === button));
  render();
}));

load();
