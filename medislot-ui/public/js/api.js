// Thin wrapper over fetch. All calls go to the same origin (/api/...)
// and the ui server forwards them to the right service.

const Session = {
  get token() { return sessionStorage.getItem('ms_token'); },
  get user() {
    try { return JSON.parse(sessionStorage.getItem('ms_user')); } catch (e) { return null; }
  },
  save(token, user) {
    sessionStorage.setItem('ms_token', token);
    sessionStorage.setItem('ms_user', JSON.stringify(user));
  },
  clear() {
    sessionStorage.removeItem('ms_token');
    sessionStorage.removeItem('ms_user');
  }
};

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

async function api(method, url, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (Session.token) headers['Authorization'] = 'Bearer ' + Session.token;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok) {
    const msg = (data && data.message) ||
      (data && data.errors && data.errors.join(', ')) ||
      `Request failed (${res.status})`;
    // token expired while using the app
    if (res.status === 401 && Session.token && !url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('session-expired', { detail: msg }));
    }
    throw new ApiError(res.status, msg, data && data.errors);
  }
  return data;
}

const Api = {
  login: (username, password) => api('POST', '/api/auth/login', { username, password }),

  doctors: (spec) => api('GET', '/api/doctors' + (spec ? '?specialization=' + encodeURIComponent(spec) : '')),
  addDoctor: (d) => api('POST', '/api/doctors', d),
  slots: (doctorId, params) => api('GET', `/api/doctors/${doctorId}/slots?` + new URLSearchParams(params)),
  addSlot: (doctorId, s) => api('POST', `/api/doctors/${doctorId}/slots`, s),

  appointments: (params) => api('GET', '/api/appointments?' + new URLSearchParams(params || {})),
  book: (b) => api('POST', '/api/appointments', b),
  cancel: (id) => api('PATCH', `/api/appointments/${id}/cancel`),
  complete: (id) => api('PATCH', `/api/appointments/${id}/complete`),
  summary: (doctorId) => api('GET', `/api/appointments/doctor/${doctorId}/summary`)
};
