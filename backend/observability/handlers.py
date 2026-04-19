from flask import jsonify

from observability.logger import logger, log_security_event

def init_error_handlers(app):
    """
    RF26: Mecanismo centralizado de exceções.
    """

    @app.errorhandler(Exception)
    def handle_global_exception(e):
        # Regista o erro real no log (para auditoria interna - RF23)
        logger.error(f"Erro Crítico: {str(e)}", exc_info=True)
        log_security_event("ERROR", f"Unhandled exception: {str(e)}")
        
        # RF27: Mensagem segura (sem leaks de infraestrutura)
        return jsonify({
            "message": "Ocorreu um erro inesperado. O administrador foi notificado.",
            "code": "INTERNAL_SERVER_ERROR"
        }), 500

    @app.errorhandler(403)
    def handle_forbidden(e):
        # Regista tentativa de violação de RBAC (RF22)
        logger.warning("Tentativa de acesso não autorizado bloqueada.")
        log_security_event("WARNING", "Blocked unauthorized access attempt")
        return jsonify({"message": "Acesso negado: Permissões insuficientes."}), 403