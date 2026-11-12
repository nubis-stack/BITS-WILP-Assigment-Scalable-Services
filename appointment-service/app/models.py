from datetime import datetime, timezone

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    patient_name = db.Column(db.String(100), nullable=False)
    patient_email = db.Column(db.String(120), nullable=False, index=True)
    patient_phone = db.Column(db.String(15))
    reason = db.Column(db.String(255))

    doctor_id = db.Column(db.Integer, nullable=False, index=True)
    slot_id = db.Column(db.Integer, nullable=False)

    # copied from doctor-service at booking time so that listing appointments
    # doesn't need a call to doctor-service for every row
    doctor_name = db.Column(db.String(100))
    specialization = db.Column(db.String(60))
    appointment_date = db.Column(db.String(10))
    start_time = db.Column(db.String(5))
    end_time = db.Column(db.String(5))
    fee = db.Column(db.Numeric(8, 2))

    status = db.Column(db.String(12), nullable=False, default="BOOKED")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patientName": self.patient_name,
            "patientEmail": self.patient_email,
            "patientPhone": self.patient_phone,
            "reason": self.reason,
            "doctorId": self.doctor_id,
            "doctorName": self.doctor_name,
            "specialization": self.specialization,
            "slotId": self.slot_id,
            "date": self.appointment_date,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "fee": float(self.fee) if self.fee is not None else None,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
