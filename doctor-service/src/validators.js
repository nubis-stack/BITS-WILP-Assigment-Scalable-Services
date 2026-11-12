const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function checkDoctor(body, partial = false) {
  const errors = [];
  const { name, specialization, email, phone, consultationFee } = body;

  if (!partial || name !== undefined) {
    if (!name || String(name).trim().length < 3) errors.push('name must have at least 3 characters');
  }
  if (!partial || specialization !== undefined) {
    if (!specialization) errors.push('specialization is required');
  }
  if (!partial || email !== undefined) {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('valid email is required');
  }
  if (phone !== undefined && phone !== null && !/^\d{10}$/.test(phone)) {
    errors.push('phone should be 10 digits');
  }
  if (consultationFee !== undefined && (isNaN(consultationFee) || Number(consultationFee) < 0)) {
    errors.push('consultationFee must be a positive number');
  }
  return errors;
}

function checkSlot(body) {
  const errors = [];
  const { date, startTime, endTime } = body;

  if (!date || !DATE_RE.test(date)) errors.push('date should be in YYYY-MM-DD format');
  if (!startTime || !TIME_RE.test(startTime)) errors.push('startTime should be HH:MM');
  if (!endTime || !TIME_RE.test(endTime)) errors.push('endTime should be HH:MM');

  if (errors.length === 0 && startTime >= endTime) {
    errors.push('endTime must be after startTime');
  }
  return errors;
}

module.exports = { checkDoctor, checkSlot };
