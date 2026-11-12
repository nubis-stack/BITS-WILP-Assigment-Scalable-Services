import jwt
import pytest

from app import create_app
from app.doctor_client import DoctorServiceDown, DoctorServiceError


class FakeDoctorClient:
    """stands in for doctor-service so tests don't need it running"""

    def __init__(self):
        self.doctors = {1: {"id": 1, "name": "Dr. Anita Rao", "specialization": "Cardiology",
                            "consultationFee": 700}}
        self.slots = {
            10: {"id": 10, "doctorId": 1, "date": "2026-11-20", "startTime": "10:00",
                 "endTime": "10:20", "status": "OPEN"},
            11: {"id": 11, "doctorId": 1, "date": "2026-11-20", "startTime": "10:20",
                 "endTime": "10:40", "status": "BOOKED"},
        }
        self.down = False

    def _check(self):
        if self.down:
            raise DoctorServiceDown("connection refused")

    def get_doctor(self, doctor_id):
        self._check()
        if doctor_id not in self.doctors:
            raise DoctorServiceError(404, "doctor not found")
        return self.doctors[doctor_id]

    def get_slot(self, slot_id):
        self._check()
        if slot_id not in self.slots:
            raise DoctorServiceError(404, "slot not found")
        return self.slots[slot_id]

    def reserve_slot(self, slot_id):
        self._check()
        if self.slots[slot_id]["status"] == "BOOKED":
            raise DoctorServiceError(409, "slot is already booked")
        self.slots[slot_id]["status"] = "BOOKED"
        return self.slots[slot_id]

    def release_slot(self, slot_id):
        self._check()
        self.slots[slot_id]["status"] = "OPEN"
        return self.slots[slot_id]


SECRET = "unit-test-secret-for-medislot-0001"


def token(role="patient", email="rahul.sen@gmail.com", name="Rahul Sen"):
    t = jwt.encode({"sub": "P1001", "name": name, "email": email,
                    "phone": "9123456780", "role": role}, SECRET, algorithm="HS256")
    return {"Authorization": "Bearer " + t}


RAHUL = token()
PRIYA = token(email="priya.nair@gmail.com", name="Priya Nair")
ADMIN = token(role="admin", email="admin@medislot.in", name="Clinic Admin")


@pytest.fixture
def ctx():
    app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "TESTING": True,
                      "JWT_SECRET": SECRET})
    fake = FakeDoctorClient()
    app.extensions["doctor_client"] = fake
    return app.test_client(), fake


def booking(**kw):
    body = {"doctorId": 1, "slotId": 10, "reason": "chest pain"}
    body.update(kw)
    return body


def test_health(ctx):
    client, _ = ctx
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["db"] == "UP"


def test_book_and_fetch(ctx):
    client, fake = ctx
    r = client.post("/api/appointments", json=booking(), headers=RAHUL)
    assert r.status_code == 201
    data = r.get_json()
    assert data["doctorName"] == "Dr. Anita Rao"
    assert data["status"] == "BOOKED"
    assert fake.slots[10]["status"] == "BOOKED"

    r = client.get(f"/api/appointments/{data['id']}", headers=RAHUL)
    assert r.status_code == 200
    assert r.get_json()["startTime"] == "10:00"


def test_booked_slot_gives_conflict(ctx):
    client, _ = ctx
    r = client.post("/api/appointments", json=booking(slotId=11), headers=RAHUL)
    assert r.status_code == 409


def test_unknown_doctor(ctx):
    client, _ = ctx
    r = client.post("/api/appointments", json=booking(doctorId=99), headers=RAHUL)
    assert r.status_code == 404


def test_validation(ctx):
    client, _ = ctx
    r = client.post("/api/appointments", json={"doctorId": "x"}, headers=RAHUL)
    assert r.status_code == 400
    assert len(r.get_json()["errors"]) == 2


def test_doctor_service_down(ctx):
    client, fake = ctx
    fake.down = True
    r = client.post("/api/appointments", json=booking(), headers=RAHUL)
    assert r.status_code == 503


def test_cancel_releases_slot(ctx):
    client, fake = ctx
    appt_id = client.post("/api/appointments", json=booking(), headers=RAHUL).get_json()["id"]

    r = client.patch(f"/api/appointments/{appt_id}/cancel", headers=RAHUL)
    assert r.status_code == 200
    assert r.get_json()["status"] == "CANCELLED"
    assert fake.slots[10]["status"] == "OPEN"

    # second cancel should fail
    assert client.patch(f"/api/appointments/{appt_id}/cancel", headers=RAHUL).status_code == 409


def test_list_and_summary(ctx):
    client, _ = ctx
    appt_id = client.post("/api/appointments", json=booking(), headers=RAHUL).get_json()["id"]
    client.patch(f"/api/appointments/{appt_id}/complete", headers=ADMIN)

    r = client.get("/api/appointments?doctorId=1&status=completed", headers=ADMIN)
    assert len(r.get_json()) == 1

    s = client.get("/api/appointments/doctor/1/summary", headers=ADMIN).get_json()
    assert s["COMPLETED"] == 1 and s["total"] == 1


def test_booking_needs_login(ctx):
    client, _ = ctx
    assert client.post("/api/appointments", json=booking()).status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.post("/api/appointments", json=booking(), headers=bad).status_code == 401


def test_patient_details_taken_from_token(ctx):
    client, _ = ctx
    # body tries to book in someone else's name - ignored for patients
    r = client.post("/api/appointments", json=booking(patientName="Someone Else",
                    patientEmail="x@y.com"), headers=RAHUL)
    assert r.get_json()["patientEmail"] == "rahul.sen@gmail.com"


def test_patient_sees_only_own_appointments(ctx):
    client, _ = ctx
    appt_id = client.post("/api/appointments", json=booking(), headers=RAHUL).get_json()["id"]

    assert len(client.get("/api/appointments", headers=RAHUL).get_json()) == 1
    assert client.get("/api/appointments", headers=PRIYA).get_json() == []
    assert client.get(f"/api/appointments/{appt_id}", headers=PRIYA).status_code == 404
    assert client.patch(f"/api/appointments/{appt_id}/cancel", headers=PRIYA).status_code == 404


def test_admin_books_for_walk_in_patient(ctx):
    client, _ = ctx
    r = client.post("/api/appointments", json=booking(), headers=ADMIN)
    assert r.status_code == 400   # admin must give patient details
    r = client.post("/api/appointments", json=booking(patientName="Walk In",
                    patientEmail="walkin@gmail.com"), headers=ADMIN)
    assert r.status_code == 201


def test_patient_cannot_complete(ctx):
    client, _ = ctx
    appt_id = client.post("/api/appointments", json=booking(), headers=RAHUL).get_json()["id"]
    assert client.patch(f"/api/appointments/{appt_id}/complete", headers=RAHUL).status_code == 403
