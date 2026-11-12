// screens for a logged in patient: find doctor, book, my appointments

const Patient = {
  doctors: [],
  selected: null,   // doctor whose slots are shown
  pickedSlot: null,

  async init() {
    $('#search-form').addEventListener('submit', e => {
      e.preventDefault();
      this.search();
    });
    await this.search(true);
  },

  async search(first) {
    const name = $('#search-name').value.trim().toLowerCase();
    const spec = $('#search-spec').value;
    $('#doctor-list').innerHTML = loadingRow('Searching doctors...');

    try {
      const all = await Api.doctors(spec);
      if (first || !spec) this.fillSpecialities(all);
      this.doctors = all.filter(d => !name || d.name.toLowerCase().includes(name));
      this.renderDoctors();
      if (!first) {
        toast(this.doctors.length ? `${this.doctors.length} doctor(s) found` : 'No doctors match your search',
              this.doctors.length ? 'info' : 'error');
      }
    } catch (e) {
      $('#doctor-list').innerHTML = emptyState('Could not load doctors.');
      toast(e.message, 'error');
    }
  },

  fillSpecialities(list) {
    const sel = $('#search-spec');
    const current = sel.value;
    const specs = [...new Set(list.map(d => d.specialization))].sort();
    sel.innerHTML = '<option value="">All specialities</option>' +
      specs.map(s => `<option ${s === current ? 'selected' : ''}>${esc(s)}</option>`).join('');
  },

  renderDoctors() {
    $('#doctor-count').textContent = this.doctors.length ? `${this.doctors.length} doctor(s)` : '';
    if (!this.doctors.length) {
      $('#doctor-list').innerHTML = emptyState('No doctors found. Try another name or speciality.');
      return;
    }
    $('#doctor-list').innerHTML = this.doctors.map(d => `
      <div class="doctor-card ${this.selected && this.selected.id === d.id ? 'active' : ''}" data-id="${d.id}">
        <div class="avatar">${esc(d.name.replace(/^Dr\.?\s*/i, '').charAt(0))}</div>
        <div class="doc-info">
          <div class="doc-name">${esc(d.name)}</div>
          <div class="doc-spec">${esc(d.specialization)}</div>
        </div>
        <div class="doc-fee">Rs ${d.consultationFee}</div>
        <button class="btn outline small" data-slots="${d.id}">View slots</button>
      </div>`).join('');

    $$('[data-slots]').forEach(b => b.addEventListener('click', () => {
      const doc = this.doctors.find(d => d.id === Number(b.dataset.slots));
      this.showSlots(doc);
    }));
  },

  async showSlots(doctor, date) {
    this.selected = doctor;
    this.pickedSlot = null;
    this.renderDoctors();

    const panel = $('#slot-panel');
    date = date || '';
    panel.innerHTML = `
      <h3>${esc(doctor.name)}</h3>
      <div class="muted small">${esc(doctor.specialization)} &middot; Rs ${doctor.consultationFee}</div>
      <label class="date-filter">Date
        <input type="date" id="slot-date" value="${date}" min="${today()}">
      </label>
      <div id="slot-list">${loadingRow('Loading slots...')}</div>
      <div id="book-box"></div>`;

    $('#slot-date').addEventListener('change', e => this.showSlots(doctor, e.target.value));

    try {
      const params = { status: 'OPEN' };
      if (date) params.date = date;
      let slots = await Api.slots(doctor.id, params);
      slots = slots.filter(s => s.date >= today());
      this.renderSlots(slots);
    } catch (e) {
      $('#slot-list').innerHTML = emptyState('Could not load slots.');
      toast(e.message, 'error');
    }
  },

  renderSlots(slots) {
    if (!slots.length) {
      $('#slot-list').innerHTML = emptyState('No open slots' + ($('#slot-date').value ? ' on this date.' : ' right now.'));
      return;
    }
    // group by date
    const byDate = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    $('#slot-list').innerHTML = Object.keys(byDate).sort().map(d => `
      <div class="slot-day">
        <div class="slot-date">${prettyDate(d)}</div>
        <div class="slot-chips">
          ${byDate[d].map(s => `<button class="slot" data-slot="${s.id}">${s.startTime}</button>`).join('')}
        </div>
      </div>`).join('');

    $$('[data-slot]').forEach(b => b.addEventListener('click', () => {
      $$('.slot').forEach(x => x.classList.remove('picked'));
      b.classList.add('picked');
      this.pickedSlot = slots.find(s => s.id === Number(b.dataset.slot));
      this.renderBookBox();
    }));
  },

  renderBookBox() {
    const s = this.pickedSlot;
    const user = Session.user;
    $('#book-box').innerHTML = `
      <form id="book-form" class="book-form">
        <div class="book-summary">
          <b>${prettyDate(s.date)}</b>, ${s.startTime} - ${s.endTime}
        </div>
        <div id="book-msg" class="inline-msg hidden"></div>
        <label>Reason for visit
          <textarea name="reason" rows="2" maxlength="255" placeholder="e.g. fever since 3 days"></textarea>
        </label>
        <label>Phone
          <input name="phone" value="${esc(user.phone || '')}" placeholder="10 digit mobile">
        </label>
        <button class="btn primary full" type="submit" id="book-btn">Confirm booking</button>
      </form>`;

    $('#book-form').addEventListener('submit', e => {
      e.preventDefault();
      this.book(e.target);
    });
  },

  async book(form) {
    const s = this.pickedSlot;
    const body = { doctorId: this.selected.id, slotId: s.id, reason: form.reason.value.trim() || null };
    if (form.phone.value.trim()) body.patientPhone = form.phone.value.trim();

    try {
      const appt = await withBusy($('#book-btn'), 'Booking...', () => Api.book(body));
      toast(`Appointment booked with ${appt.doctorName} on ${prettyDate(appt.date)} at ${appt.startTime}`, 'success');
      this.showSlots(this.selected, $('#slot-date').value);
    } catch (e) {
      formMsg($('#book-msg'), e.message, 'error');
      toast('Booking failed: ' + e.message, 'error');
      if (e.status === 409) {
        // someone else took it - refresh the list
        setTimeout(() => this.showSlots(this.selected, $('#slot-date').value), 1200);
      }
    }
  },

  async loadMine() {
    const box = $('#mine-table');
    box.innerHTML = loadingRow('Loading your appointments...');
    try {
      const list = await Api.appointments();
      if (!list.length) {
        box.innerHTML = emptyState('You have no appointments yet. Go to "Find a doctor" to book one.');
        return;
      }
      box.innerHTML = `
        <table class="table">
          <thead><tr><th>#</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Fee</th><th>Status</th><th></th></tr></thead>
          <tbody>
          ${list.map(a => `
            <tr>
              <td>${a.id}</td>
              <td><b>${esc(a.doctorName)}</b><div class="muted small">${esc(a.specialization)}</div></td>
              <td>${prettyDate(a.date)}</td>
              <td>${a.startTime} - ${a.endTime}</td>
              <td class="small">${esc(a.reason || '-')}</td>
              <td>Rs ${a.fee}</td>
              <td>${statusPill(a.status)}</td>
              <td>${a.status === 'BOOKED' ? `<button class="btn danger small" data-cancel="${a.id}">Cancel</button>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;

      $$('[data-cancel]', box).forEach(b => b.addEventListener('click', () => {
        this.cancel(list.find(a => a.id === Number(b.dataset.cancel)), b);
      }));
    } catch (e) {
      box.innerHTML = emptyState('Could not load appointments.');
      toast(e.message, 'error');
    }
  },

  async cancel(appt, btn) {
    const ok = await confirmBox('Cancel appointment?',
      `${appt.doctorName} on ${prettyDate(appt.date)} at ${appt.startTime}. The slot will be released for other patients.`,
      'Yes, cancel');
    if (!ok) return;
    try {
      await withBusy(btn, 'Cancelling...', () => Api.cancel(appt.id));
      toast(`Appointment #${appt.id} cancelled. The slot is open again.`, 'success');
      this.loadMine();
    } catch (e) {
      toast('Could not cancel: ' + e.message, 'error');
    }
  }
};
