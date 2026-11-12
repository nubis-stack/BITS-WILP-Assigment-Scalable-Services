// db rows use snake_case, api responses use camelCase

function toDoctor(row) {
  return {
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    email: row.email,
    phone: row.phone,
    consultationFee: Number(row.consultation_fee),
    createdAt: row.created_at
  };
}

function toSlot(row) {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    date: row.slot_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status
  };
}

module.exports = { toDoctor, toSlot };
