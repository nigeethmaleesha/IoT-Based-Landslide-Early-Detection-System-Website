const loginPanel = document.querySelector('[data-login-panel]');
const managerPanel = document.querySelector('[data-manager-panel]');
const sendOtpButton = document.querySelector('[data-send-otp]');
const otpForm = document.querySelector('[data-otp-form]');
const otpInput = document.querySelector('#otp');
const uploadForm = document.querySelector('[data-upload-form]');
const fileInput = document.querySelector('#file');
const categoryInput = document.querySelector('#category');
const progressWrap = document.querySelector('[data-progress-wrap]');
const progressBar = document.querySelector('[data-progress]');
const progressText = document.querySelector('[data-progress-text]');
const adminList = document.querySelector('[data-admin-list]');
const adminState = document.querySelector('[data-admin-state]');
const logoutButton = document.querySelector('[data-logout]');
const toast = document.querySelector('[data-toast]');

function notify(message, type = 'info') {
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function formatBytes(bytes = 0) {
  if (!bytes) return '—';
  const units = ['B','KB','MB','GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function setAuthenticated(authenticated) {
  loginPanel.hidden = authenticated;
  managerPanel.hidden = !authenticated;
  if (authenticated) loadAdminFiles();
}

async function checkAuth() {
  try {
    const data = await jsonFetch('/api/auth-status');
    setAuthenticated(Boolean(data.authenticated));
  } catch {
    setAuthenticated(false);
  }
}

sendOtpButton?.addEventListener('click', async () => {
  const original = sendOtpButton.textContent;
  sendOtpButton.disabled = true;
  sendOtpButton.textContent = 'Sending…';
  try {
    await jsonFetch('/api/send-otp', { method: 'POST', body: '{}' });
    otpForm.hidden = false;
    otpInput?.focus();
    notify('OTP sent. Check the administrator Gmail inbox.', 'success');
    let remaining = 60;
    const interval = setInterval(() => {
      remaining -= 1;
      sendOtpButton.textContent = remaining > 0 ? `Resend in ${remaining}s` : 'Send a new OTP';
      if (remaining <= 0) {
        clearInterval(interval);
        sendOtpButton.disabled = false;
      }
    }, 1000);
  } catch (error) {
    notify(error.message, 'error');
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = original;
  }
});

otpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = otpForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await jsonFetch('/api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otp: otpInput.value })
    });
    otpInput.value = '';
    notify('Verification successful.', 'success');
    setAuthenticated(true);
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

uploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = fileInput.files?.[0];
  if (!file) return notify('Choose a file first.', 'error');

  const submit = uploadForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  progressWrap.hidden = false;
  progressBar.value = 5;
  progressText.textContent = 'Preparing secure upload…';

  try {
    const ticket = await jsonFetch('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, category: categoryInput.value, size: file.size })
    });

    progressBar.value = 25;
    progressText.textContent = 'Uploading to secure storage…';

    const upload = await fetch(ticket.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: file.type ? { 'Content-Type': file.type } : {}
    });
    if (!upload.ok) throw new Error('Upload failed while sending the file to storage.');

    progressBar.value = 100;
    progressText.textContent = 'Upload complete.';
    notify('File uploaded successfully.', 'success');
    uploadForm.reset();
    setTimeout(loadAdminFiles, 700);
  } catch (error) {
    notify(error.message, 'error');
    progressText.textContent = 'Upload did not complete.';
  } finally {
    submit.disabled = false;
    setTimeout(() => { progressWrap.hidden = true; progressBar.value = 0; }, 1800);
  }
});

async function loadAdminFiles() {
  adminState.hidden = false;
  adminState.innerHTML = '<span class="spinner"></span><span>Loading uploaded files…</span>';
  adminList.innerHTML = '';
  try {
    const data = await jsonFetch('/api/admin-files');
    const files = data.files || [];
    if (!files.length) {
      adminState.innerHTML = '<strong>No uploaded files yet.</strong><span>Use the form above to add the first document or video.</span>';
      return;
    }
    adminState.hidden = true;
    adminList.innerHTML = files.map((file) => `
      <div class="admin-file-row" data-file-row>
        <div>
          <strong>${escapeHtml(file.name)}</strong>
          <span>${escapeHtml(file.category)} · ${formatBytes(file.size)} · ${new Date(file.uploadedAt).toLocaleDateString()}</span>
        </div>
        <div class="admin-file-actions">
          <a class="btn btn-small btn-outline" href="${encodeURI(file.url)}" target="_blank" rel="noopener">Open</a>
          <button class="btn btn-small btn-danger" type="button" data-delete data-url="${encodeURI(file.url)}" data-path="${escapeHtml(file.pathname)}">Delete</button>
        </div>
      </div>`).join('');
  } catch (error) {
    if (/verification/i.test(error.message)) return setAuthenticated(false);
    adminState.hidden = false;
    adminState.innerHTML = `<strong>Storage unavailable.</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

adminList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  const name = button.closest('[data-file-row]')?.querySelector('strong')?.textContent || 'this file';
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  button.disabled = true;
  try {
    await jsonFetch('/api/delete-file', {
      method: 'DELETE',
      body: JSON.stringify({ url: decodeURI(button.dataset.url), pathname: button.dataset.path })
    });
    notify('File deleted.', 'success');
    loadAdminFiles();
  } catch (error) {
    notify(error.message, 'error');
    button.disabled = false;
  }
});

logoutButton?.addEventListener('click', async () => {
  try { await jsonFetch('/api/logout', { method: 'POST', body: '{}' }); } catch {}
  setAuthenticated(false);
  notify('Signed out.', 'success');
});

checkAuth();
