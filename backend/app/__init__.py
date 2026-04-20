from flask import Flask
from app.config import Config
from observability.logger import error_handling
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True
    )

    app.config.from_object(Config)

    from api.routes import api
    app.register_blueprint(api)

    error_handling(app)

    return app