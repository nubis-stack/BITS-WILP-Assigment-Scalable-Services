import logging
import time

from flask import Flask, jsonify
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from .config import Config
from .doctor_client import DoctorClient
from .extensions import db


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)
    app.json.sort_keys = False

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s - %(message)s")

    db.init_app(app)
    app.extensions["doctor_client"] = DoctorClient(
        app.config["DOCTOR_SERVICE_URL"],
        timeout=app.config["DOCTOR_SERVICE_TIMEOUT"],
    )

    from .routes import bp
    app.register_blueprint(bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "resource not found"}), 404

    @app.errorhandler(405)
    def bad_method(e):
        return jsonify({"message": "method not allowed"}), 405

    with app.app_context():
        _create_tables(app)

    return app


def _create_tables(app, tries=10):
    # db pod may still be starting when this pod comes up. Also two replicas
    # starting together can both try CREATE TABLE - the loser just retries.
    for i in range(1, tries + 1):
        try:
            db.create_all()
            # gunicorn --preload forks the workers after this, so drop these
            # connections or the workers end up sharing one socket (not for sqlite tests)
            if db.engine.dialect.name != "sqlite":
                db.engine.dispose()
            return
        except (OperationalError, IntegrityError, ProgrammingError) as e:
            app.logger.warning("database not ready (%d/%d): %s", i, tries, e.orig)
            if i == tries:
                raise
            time.sleep(3)
