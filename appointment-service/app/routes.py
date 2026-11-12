import logging
import re

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import text

from .auth import is_admin, login_required
from .doctor_client import DoctorServiceDown, DoctorServiceError
from .extensions import db
from .models import Appointment

log = logging.getLogger(__name__)
bp = Blueprint("appointments", __name__)

EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")
DOCTOR_DOWN = "doctor-service is not reachable, try again later"


def doctor_client():
    return current_app.extensions["doctor_client"]


def error(msg, code):
    return jsonify({"message": msg}), code


def validate_booking(data, need_patient):
    errors = []
    for field in ("doctorId", "slotId"):
        if not isinstance(data.get(field), int):
            errors.append(f"{field} is required and must be an integer")
    if need_patient:
        name = (data.get("patientName") or "").strip()
        if len(name) < 3:
            errors.append("patientName must have at least 3 characters")
        if not EMAIL_RE.match(data.get("patientEmail") or ""):
            errors.append("valid patientEmail is required")
    phone = data.get("patientPhone")
    if phone and not re.fullmatch(r"\d{10}", str(phone)):
        errors.append("patientPhone should be 10 digits")
    if data.get("reason") and len(data["reason"]) > 255:
        errors.append("reason is too long (max 255 characters)")
    return errors


def load_own(appt_id):
    """Fetch appointment and make sure a patient only touches their own."""
    appt = db.session.get(Appointment, appt_id)
    if not appt:
        return None, error("appointment not found", 404)
    if not is_admin() and appt.patient_email != (g.user.get("email") or "").lower():
        # same answer as not found, don't reveal other patients' bookings
        return None, error("appointment not found", 404)
    return appt, None


@bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "UP"
    except Exception:
        db_status = "DOWN"
    code = 200 if db_status == "UP" else 503
    return jsonify({"service": "appointment-service", "status": "UP" if code == 200 else "DOWN",
                    "db": db_status}), code


@bp.post("/api/appointments")
@login_required("patient", "admin")
def book_appointment():
    data = request.get_json(silent=True)
    if not data:
        return error("request body must be JSON", 400)

    # patients book for themselves - details come from the login token.
    # admin (front desk) can book for someone by sending the patient details.
    admin = is_admin()
    errors = validate_booking(data, need_patient=admin)
    if errors:
        return jsonify({"errors": errors}), 400

    if admin:
        p_name, p_email = data["patientName"].strip(), data["patientEmail"].lower()
        p_phone = data.get("patientPhone")
    else:
        p_name, p_email = g.user["name"], g.user["email"].lower()
        p_phone = data.get("patientPhone") or g.user.get("phone")

    client = doctor_client()
    doctor_id, slot_id = data["doctorId"], data["slotId"]

    try:
        doctor = client.get_doctor(doctor_id)
        slot = client.get_slot(slot_id)
    except DoctorServiceError as e:
        return error(e.message, 404 if e.status == 404 else 400)
    except DoctorServiceDown:
        return error(DOCTOR_DOWN, 503)

    if slot["doctorId"] != doctor_id:
        return error("slot does not belong to this doctor", 400)
    if slot["status"] != "OPEN":
        return error("slot is already booked", 409)

    try:
        client.reserve_slot(slot_id)
    except DoctorServiceError as e:
        return error(e.message, e.status)
    except DoctorServiceDown:
        return error(DOCTOR_DOWN, 503)

    appt = Appointment(
        patient_name=p_name,
        patient_email=p_email,
        patient_phone=p_phone,
        reason=data.get("reason"),
        doctor_id=doctor_id,
        slot_id=slot_id,
        doctor_name=doctor["name"],
        specialization=doctor["specialization"],
        appointment_date=slot["date"],
        start_time=slot["startTime"],
        end_time=slot["endTime"],
        fee=doctor.get("consultationFee"),
    )
    try:
        db.session.add(appt)
        db.session.commit()
    except Exception:
        db.session.rollback()
        log.exception("saving appointment failed, releasing slot %s", slot_id)
        # compensate - otherwise the slot stays BOOKED with no appointment
        try:
            client.release_slot(slot_id)
        except Exception:
            log.error("could not release slot %s, needs manual fix", slot_id)
        return error("could not save appointment", 500)

    log.info("appointment %s booked for slot %s by %s", appt.id, slot_id, g.user.get("sub"))
    return jsonify(appt.to_dict()), 201


@bp.get("/api/appointments")
@login_required("patient", "admin")
def list_appointments():
    q = Appointment.query
    if is_admin():
        if request.args.get("email"):
            q = q.filter_by(patient_email=request.args["email"].lower())
    else:
        q = q.filter_by(patient_email=g.user["email"].lower())

    if request.args.get("doctorId"):
        q = q.filter_by(doctor_id=request.args.get("doctorId", type=int))
    if request.args.get("status"):
        q = q.filter_by(status=request.args["status"].upper())
    if request.args.get("date"):
        q = q.filter_by(appointment_date=request.args["date"])

    rows = q.order_by(Appointment.appointment_date.desc(), Appointment.start_time).all()
    return jsonify([a.to_dict() for a in rows])


@bp.get("/api/appointments/<int:appt_id>")
@login_required("patient", "admin")
def get_appointment(appt_id):
    appt, err = load_own(appt_id)
    if err:
        return err
    return jsonify(appt.to_dict())


@bp.patch("/api/appointments/<int:appt_id>/cancel")
@login_required("patient", "admin")
def cancel_appointment(appt_id):
    appt, err = load_own(appt_id)
    if err:
        return err
    if appt.status != "BOOKED":
        return error(f"only BOOKED appointments can be cancelled, current status is {appt.status}", 409)

    try:
        doctor_client().release_slot(appt.slot_id)
    except DoctorServiceDown:
        return error(DOCTOR_DOWN, 503)
    except DoctorServiceError as e:
        # slot was deleted along with the doctor - nothing to free, just cancel
        if e.status != 404:
            return error(e.message, e.status)

    appt.status = "CANCELLED"
    db.session.commit()
    log.info("appointment %s cancelled by %s", appt.id, g.user.get("sub"))
    return jsonify(appt.to_dict())


@bp.patch("/api/appointments/<int:appt_id>/complete")
@login_required("admin")
def complete_appointment(appt_id):
    appt = db.session.get(Appointment, appt_id)
    if not appt:
        return error("appointment not found", 404)
    if appt.status != "BOOKED":
        return error(f"cannot complete an appointment in status {appt.status}", 409)
    appt.status = "COMPLETED"
    db.session.commit()
    return jsonify(appt.to_dict())


@bp.get("/api/appointments/doctor/<int:doctor_id>/summary")
@login_required("admin")
def doctor_summary(doctor_id):
    rows = (db.session.query(Appointment.status, db.func.count(Appointment.id))
            .filter(Appointment.doctor_id == doctor_id)
            .group_by(Appointment.status).all())
    counts = {"BOOKED": 0, "CANCELLED": 0, "COMPLETED": 0}
    for status, n in rows:
        counts[status] = n
    return jsonify({"doctorId": doctor_id, "total": sum(counts.values()), **counts})
