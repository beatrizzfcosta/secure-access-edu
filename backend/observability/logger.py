from datetime import datetime
from http.client import HTTPException
import logging
from flask import jsonify

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(asctime)s | %(message)s"
)

def log_info(method, user, message):
    logging.info(f"[{method}] User: {user}, Message: {message}")

def log_error(message):
    logging.error(message)

def audit_log(action, user=None, details=None):
    logging.info(f"Audit Log - Action: {action}, User: {user}, Details: {details}, Timestamp: {datetime.now()}")
def error_handling(app):

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        print(e)
        return jsonify({
            "error": e.description
        }), e.code
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        print(e)
        logging.error(f"Unhandled exception: {e}")
        return jsonify({"error": "Internal server error"}), 500