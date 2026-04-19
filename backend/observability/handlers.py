from flask import jsonify
import logging

def init_error_handlers(app):
    """
    RF26: Mecanismo centralizado de exceções.
    """

    @app.errorhandler(Exception)
    def handle_global_exception(e):
        # Regista o erro real no log (para auditoria interna - RF23)
        logging.error(f"Erro Crítico: {str(e)}", exc_info=True)
        
        # RF27: Mensagem segura (sem leaks de infraestrutura)
        return jsonify({
            "message": "Ocorreu um erro inesperado. O administrador foi notificado.",
            "code": "INTERNAL_SERVER_ERROR"
        }), 500

    @app.errorhandler(403)
    def handle_forbidden(e):
        # Regista tentativa de violação de RBAC (RF22)
        logging.warning("Tentativa de acesso não autorizado bloqueada.")
        return jsonify({"message": "Acesso negado: Permissões insuficientes."}), 403