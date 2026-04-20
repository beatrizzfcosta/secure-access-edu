import logging
from logging.handlers import RotatingFileHandler
import os

from flask import jsonify, request, has_request_context, current_app
from werkzeug.exceptions import HTTPException

# Criar pasta para logs se não existir
if not os.path.exists('logs'):
    os.makedirs('logs')

class SecurityFilter(logging.Filter):
    """Filtro para garantir que o campo 'ip' existe sempre no log"""
    def filter(self, record):
        if has_request_context():
            # Se houver um pedido HTTP, apanha o IP real
            record.ip = request.remote_addr
        else:
            # Se for uma mensagem do sistema/startup, define como SERVER
            record.ip = 'SERVER'
        return True

# Configuração de Logs
log_formatter = logging.Formatter('%(levelname)s | %(asctime)s | [IP: %(ip)s] | %(message)s')
log_file = 'logs/app_security.log'

file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5, encoding='utf-8')
file_handler.setFormatter(log_formatter)

# Criar o logger específico (usar um nome evita conflitos com os logs base do Flask)
logger = logging.getLogger("secure_acad")
logger.setLevel(logging.INFO)
logger.addFilter(SecurityFilter())
logger.addHandler(file_handler)

def log_info(method, user, message):
    logger.info(f"[{method}] User: {user}, Message: {message}")

def audit_log(action, user=None, details=None):
    logger.info(f"AUDIT | Action: {action} | User: {user} | Details: {details}")

def log_security_event(level, message, user_id="ANONYMOUS"):
    msg = f"SEC_EVENT | USER: {user_id} | {message}"
    if level.upper() == "WARNING":
        logger.warning(f"! {msg}")
    elif level.upper() == "ERROR":
        logger.error(f"X {msg}")

def _show_error_details() -> bool:
    if os.environ.get("SHOW_ERROR_DETAILS", "").lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("FLASK_DEBUG", "true").lower() in ("1", "true", "yes"):
        return True
    try:
        return bool(current_app.debug)
    except RuntimeError:
        return False


def error_handling(app):
    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return jsonify({"error": e.description or e.name}), e.code

        logger.error(f"SYSTEM_ERROR: {str(e)}", exc_info=True)

        if _show_error_details():
            return jsonify(
                {"error": str(e), "type": type(e).__name__}
            ), 500

        return jsonify(
            {"error": "Internal server error. Access denied by default."}
        ), 500