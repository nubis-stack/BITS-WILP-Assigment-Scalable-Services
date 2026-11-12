"""Small HTTP client for talking to doctor-service."""
import logging
import time

import requests

log = logging.getLogger(__name__)


class DoctorServiceError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


class DoctorServiceDown(Exception):
    pass


class DoctorClient:
    def __init__(self, base_url, timeout=3, retries=2):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries

    def _call(self, method, path, retry=True):
        url = self.base_url + path
        attempts = self.retries + 1 if retry else 1

        for i in range(attempts):
            try:
                resp = requests.request(method, url, timeout=self.timeout)
            except requests.RequestException as e:
                log.warning("doctor-service call %s %s failed (try %d): %s", method, path, i + 1, e)
                if i < attempts - 1:
                    time.sleep(0.5 * (i + 1))
                    continue
                raise DoctorServiceDown(str(e))

            if resp.status_code >= 500 and i < attempts - 1:
                time.sleep(0.5 * (i + 1))
                continue
            break

        if resp.status_code >= 500:
            raise DoctorServiceDown(f"doctor-service returned {resp.status_code}")
        if resp.status_code >= 400:
            try:
                msg = resp.json().get("message", resp.text)
            except ValueError:
                msg = resp.text
            raise DoctorServiceError(resp.status_code, msg)
        return resp.json()

    def get_doctor(self, doctor_id):
        return self._call("GET", f"/api/doctors/{doctor_id}")

    def get_slot(self, slot_id):
        return self._call("GET", f"/api/slots/{slot_id}")

    # reserve is not retried - if the first request actually reached the
    # server and only the response got lost, a retry would give a false 409
    def reserve_slot(self, slot_id):
        return self._call("PATCH", f"/api/slots/{slot_id}/reserve", retry=False)

    def release_slot(self, slot_id):
        return self._call("PATCH", f"/api/slots/{slot_id}/release")
