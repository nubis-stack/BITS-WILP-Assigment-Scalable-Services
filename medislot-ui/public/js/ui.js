// small helpers shared by the patient and admin screens

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// toast messages in the corner
function toast(message, type) {
  type = type || 'info';
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.innerHTML = `<span class="toast-icon">${{ success: '&#10003;', error: '!', info: 'i' }[type]}</span>
                   <span>${esc(message)}</span>`;
  $('#toasts').appendChild(box);
  setTimeout(() => box.classList.add('hide'), type === 'error' ? 5500 : 3800);
  setTimeout(() => box.remove(), type === 'error' ? 6000 : 4300);
}

// message shown inside a form
function formMsg(el, text, type) {
  if (!text) { el.classList.add('hidden'); return; }
  el.className = 'inline-msg ' + (type || 'error');
  el.textContent = text;
}

// disable a button while a request is running
async function withBusy(btn, busyText, fn) {
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = busyText;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

function confirmBox(title, text, yesLabel) {
  return new Promise(resolve => {
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    $('#modal-yes').textContent = yesLabel || 'Yes';
    $('#modal').classList.remove('hidden');
    const done = (val) => {
      $('#modal').classList.add('hidden');
      $('#modal-yes').onclick = $('#modal-no').onclick = null;
      resolve(val);
    };
    $('#modal-yes').onclick = () => done(true);
    $('#modal-no').onclick = () => done(false);
  });
}

function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function statusPill(status) {
  return `<span class="pill ${status.toLowerCase()}">${status}</span>`;
}

function loadingRow(text) {
  return `<div class="loading">${esc(text || 'Loading...')}</div>`;
}

function emptyState(text) {
  return `<div class="empty">${esc(text)}</div>`;
}
