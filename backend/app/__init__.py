from flask import Flask
from app.config import Config
from observability.logger import error_handling

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    from api.routes import api
    app.register_blueprint(api)

    error_handling(app)

    return app