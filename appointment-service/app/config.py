import os


def _db_url():
    # full url wins if given, else build it from parts (that is how k8s passes it)
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    user = os.getenv("DB_USER", "postgres")
    pwd = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "appointment_db")
    return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{name}"


class Config:
    SQLALCHEMY_DATABASE_URI = _db_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    DOCTOR_SERVICE_URL = os.getenv("DOCTOR_SERVICE_URL", "http://localhost:4001")
    DOCTOR_SERVICE_TIMEOUT = float(os.getenv("DOCTOR_SERVICE_TIMEOUT", "3"))

    # same secret as auth-service, used only to verify login tokens
    JWT_SECRET = os.getenv("JWT_SECRET", "medislot-local-dev-secret-0f8a2c91")
