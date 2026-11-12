// screens for clinic admin: add doctors, publish slots, manage appointments

const Admin = {
  doctors: [],

  async init() {
    $('#doctor-form').addEventListener('submit', e => { e.preventDefault(); this.addDoctor(e.target); });
    $('#slot-form').addEventListener('submit', e => { e.preventDefault(); this.addSlot(e.target); });
    $('#appt-filter').addEventListener('submit', e => { e.preventDefault(); this.loadAppointments(true); });
    $('#slot-form').date.min = today();
    await this.loadDoctors();
  },

  async loadDoctors() {
    const box = $('#admin-doctors');
    box.innerHTML = loadingRow();
    try {
      this.doctors = await Api.doctors();
    } catch (e) {
      box.innerHTML = emptyState('Could not load doctors.');
      toast(e.message, 'error');
      return;
    }

    const options = this.doctors.map(d => `<option value="${d.id}">${esc(d.name)} (${esc(d.specialization)})</option>`).join('');
    const pickedDoctor = $('#slot-doctor').value;
    $('#slot-doctor').innerHTML = options || '<option value="">Add a doctor first</option>';
    if (pickedDoctor) $('#slot-doctor').value = pickedDoctor;
    const keep = $('#filter-doctor').value;
    $('#filter-doctor').innerHTML = '<option value="">All doctors</option>' + options;
    $('#filter-doctor').value = keep;

    if (!this.doctors.length) {
      box.innerHTML = emptyState('No doctors yet. Add the first one above.');
      return;
    }

    // open / booked slot count per doctor
    const counts = await Promise.all(this.doctors.map(d =>
      Api.slots(d.id, {}).then(list => ({
        open: list.filter(s => s.status === 'OPEN').length,
        booked: list.filter(s => s.status === 'BOOKED').length
      })).catch(() => ({ open: '-', booked: '-' }))
    ));

    box.innerHTML = `
      <table class="table">
        <thead><tr><th>#</th><th>Name</th><th>Speciality</th><th>Email</th><th>Phone</th><th>Fee</th><th>Open slots</th><th>Booked</th></tr></thead>
        <tbody>
        ${this.doctors.map((d, i) => `
          <tr>
            <td>${d.id}</td><td><b>${esc(d.name)}</b></td><td>${esc(d.specialization)}</td>
            <td class="small">${esc(d.email)}</td><td>${esc(d.phone || '-')}</td><td>Rs ${d.consultationFee}</td>
            <td>${counts[i].open}</td><td>${counts[i].booked}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  },

  async addDoctor(form) {
    const msg = $('#doctor-form-msg');
    formMsg(msg, null);
    const body = {
      name: form.name.value.trim(),
      specialization: form.specialization.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || undefined,
      consultationFee: form.consultationFee.value ? Number(form.consultationFee.value) : undefined
    };
    try {
      const d = await withBusy($('button', form), 'Saving...', () => Api.addDoctor(body));
      form.reset();
      toast(`${d.name} added (doctor #${d.id})`, 'success');
      formMsg(msg, `${d.name} added. You can publish slots now.`, 'success');
      this.loadDoctors();
    } catch (e) {
      formMsg(msg, e.message, 'error');
      toast('Doctor not added: ' + e.message, 'error');
    }
  },

  async addSlot(form) {
    const msg = $('#slot-form-msg');
    formMsg(msg, null);
    const doctorId = form.doctorId.value;
    if (!doctorId) {
      formMsg(msg, 'Add a doctor first.', 'error');
      return;
    }
    const body = { date: form.date.value, startTime: form.startTime.value, endTime: form.endTime.value };
    try {
      const s = await withBusy($('button', form), 'Saving...', () => Api.addSlot(doctorId, body));
      const doc = this.doctors.find(d => d.id === Number(doctorId));
      toast(`Slot added for ${doc.name}: ${prettyDate(s.date)} ${s.startTime}-${s.endTime}`, 'success');
      formMsg(msg, `Slot ${s.startTime}-${s.endTime} on ${prettyDate(s.date)} published.`, 'success');
      // move start to the old end so adding the next slot is quick
      form.startTime.value = s.endTime;
      form.endTime.value = '';
      this.loadDoctors();
    } catch (e) {
      formMsg(msg, e.message, 'error');
      toast('Slot not added: ' + e.message, 'error');
    }
  },

  async loadAppointments(fromFilter) {
    const box = $('#admin-appts');
    const params = {};
    if ($('#filter-doctor').value) params.doctorId = $('#filter-doctor').value;
    if ($('#filter-status').value) params.status = $('#filter-status').value;
    if ($('#filter-date').value) params.date = $('#filter-date').value;

    box.innerHTML = loadingRow();
    this.loadSummary(params.doctorId);

    try {
      const list = await Api.appointments(params);
      if (fromFilter) toast(`${list.length} appointment(s) found`, 'info');
      if (!list.length) {
        box.innerHTML = emptyState('No appointments for this filter.');
        return;
      }
      box.innerHTML = `
        <table class="table">
          <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>
          ${list.map(a => `
            <tr>
              <td>${a.id}</td>
              <td><b>${esc(a.patientName)}</b><div class="muted small">${esc(a.patientEmail)}${a.patientPhone ? ' &middot; ' + esc(a.patientPhone) : ''}</div></td>
              <td>${esc(a.doctorName)}<div class="muted small">${esc(a.specialization)}</div></td>
              <td>${prettyDate(a.date)}</td>
              <td>${a.startTime}</td>
              <td class="small">${esc(a.reason || '-')}</td>
              <td>${statusPill(a.status)}</td>
              <td class="actions">${a.status === 'BOOKED' ? `
                <button class="btn outline small" data-complete="${a.id}">Complete</button>
                <button class="btn danger small" data-acancel="${a.id}">Cancel</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`;

      $$('[data-complete]', box).forEach(b => b.addEventListener('click', () => this.complete(Number(b.dataset.complete), b)));
      $$('[data-acancel]', box).forEach(b => b.addEventListener('click', () =>
        this.cancel(list.find(a => a.id === Number(b.dataset.acancel)), b)));
    } catch (e) {
      box.innerHTML = emptyState('Could not load appointments.');
      toast(e.message, 'error');
    }
  },

  async loadSummary(doctorId) {
    const box = $('#summary-box');
    if (!doctorId) { box.classList.add('hidden'); return; }
    try {
      const s = await Api.summary(doctorId);
      box.innerHTML = ['total', 'BOOKED', 'COMPLETED', 'CANCELLED'].map(k =>
        `<div class="stat"><div class="stat-num">${s[k]}</div><div class="stat-label">${k === 'total' ? 'Total' : k.toLowerCase()}</div></div>`
      ).join('');
      box.classList.remove('hidden');
    } catch (e) {
      box.classList.add('hidden');
    }
  },

  async complete(id, btn) {
    try {
      await withBusy(btn, '...', () => Api.complete(id));
      toast(`Appointment #${id} marked as completed`, 'success');
      this.loadAppointments();
    } catch (e) {
      toast(e.message, 'error');
    }
  },

  async cancel(appt, btn) {
    const ok = await confirmBox('Cancel this appointment?',
      `${appt.patientName} with ${appt.doctorName} on ${prettyDate(appt.date)} at ${appt.startTime}.`, 'Yes, cancel');
    if (!ok) return;
    try {
      await withBusy(btn, '...', () => Api.cancel(appt.id));
      toast(`Appointment #${appt.id} cancelled, slot released`, 'success');
      this.loadAppointments();
    } catch (e) {
      toast(e.message, 'error');
    }
  }
};
