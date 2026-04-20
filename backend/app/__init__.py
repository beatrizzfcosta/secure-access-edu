import os

from flask import Flask
from app.config import Config
from observability.logger import error_handling
from flask_cors import CORS

_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://localhost:3000,"
    "http://127.0.0.1:3000"
)


def create_app():
    app = Flask(__name__)

    origins_raw = os.environ.get("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
    cors_origins = [o.strip() for o in origins_raw.split(",") if o.strip()]

    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        supports_credentials=True
    )

    app.config.from_object(Config)

    from api.routes import api
    app.register_blueprint(api)

    error_handling(app)

    return app