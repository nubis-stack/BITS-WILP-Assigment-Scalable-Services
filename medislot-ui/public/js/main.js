// startup, login / logout and tab switching

const TABS = {
  patient: [
    { id: 'find', label: 'Find a doctor', onShow: () => {} },
    { id: 'mine', label: 'My appointments', onShow: () => Patient.loadMine() }
  ],
  admin: [
    { id: 'manage', label: 'Doctors & slots', onShow: () => Admin.loadDoctors() },
    { id: 'appts', label: 'Appointments', onShow: () => Admin.loadAppointments() }
  ]
};

function showLogin(message, type) {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  formMsg($('#login-msg'), message, type);
  $('#login-user').focus();
}

function showTab(id) {
  const role = Session.user.role;
  $$('.tab').forEach(t => t.classList.add('hidden'));
  $('#tab-' + id).classList.remove('hidden');
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  const tab = TABS[role].find(t => t.id === id);
  if (tab) tab.onShow();
}

async function startApp() {
  const user = Session.user;
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = user.name;
  $('#user-role').textContent = user.role === 'admin' ? 'Clinic staff' : 'Patient';

  const tabs = TABS[user.role] || TABS.patient;
  $('#nav').innerHTML = tabs.map(t => `<button data-tab="${t.id}">${t.label}</button>`).join('');
  $$('#nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  if (user.role === 'admin') {
    await Admin.init();
  } else {
    await Patient.init();
  }
  showTab(tabs[0].id);
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const u = $('#login-user').value.trim();
  const p = $('#login-pass').value;
  if (!u || !p) {
    formMsg($('#login-msg'), 'Please enter username and password.', 'error');
    return;
  }
  try {
    const res = await withBusy($('#login-btn'), 'Signing in...', () => Api.login(u, p));
    Session.save(res.token, res.user);
    formMsg($('#login-msg'), null);
    $('#login-form').reset();
    startApp();
    toast(`Welcome, ${res.user.name}!`, 'success');
  } catch (err) {
    formMsg($('#login-msg'), err.status === 401 ? 'Wrong username or password.' : err.message, 'error');
  }
});

$$('.demo-list .chip').forEach(c => c.addEventListener('click', () => {
  $('#login-user').value = c.dataset.u;
  $('#login-pass').value = c.dataset.p;
}));

$('#logout-btn').addEventListener('click', () => {
  const name = Session.user ? Session.user.name : '';
  Session.clear();
  // reload clears all the screens, message is shown after
  sessionStorage.setItem('ms_flash', `Goodbye ${name}, you have been logged out.`);
  location.reload();
});

window.addEventListener('session-expired', e => {
  Session.clear();
  sessionStorage.setItem('ms_flash_err', 'Your session has expired. Please login again.');
  location.reload();
});

// on page load
(function () {
  const flash = sessionStorage.getItem('ms_flash');
  const flashErr = sessionStorage.getItem('ms_flash_err');
  sessionStorage.removeItem('ms_flash');
  sessionStorage.removeItem('ms_flash_err');

  if (Session.token && Session.user) {
    startApp();
  } else if (flashErr) {
    showLogin(flashErr, 'error');
  } else {
    showLogin(flash, 'success');
  }
})();
