/**
 * Políticas de segurança:
 * - mandatory: primeira alteração obrigatória — só continua com aceitação.
 * - readonly: consulta voluntária — pode fechar e voltar a abrir quando quiser.
 */
export default function SecurityPoliciesModal({
  open,
  variant = "mandatory",
  onAccept,
  onClose,
}) {
  if (!open) return null;

  const isMandatory = variant === "mandatory";

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget && !isMandatory && typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      aria-hidden={!open}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 max-h-[min(90vh,32rem)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-policies-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto flex-1">
          <h2
            id="security-policies-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            Políticas de segurança
          </h2>
          {isMandatory ? (
            <p className="text-sm text-gray-600 mb-4">
              Antes de definir a sua nova palavra-passe, confirme que leu e aceita
              as regras de utilização segura desta plataforma.
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Consulte as regras de utilização segura desta plataforma. Pode fechar
              esta janela e voltar a abri-la a qualquer momento a partir do perfil.
            </p>
          )}
          <ul className="text-sm text-gray-700 space-y-3 list-disc pl-5 mb-4">
            <li>
              A palavra-passe deve ter <strong>pelo menos 8 caracteres</strong>,
              incluir <strong>uma letra maiúscula</strong>,{" "}
              <strong>um dígito</strong> e <strong>um carácter especial</strong>{" "}
              (ex.: ! @ #).
            </li>
            <li>
              Não utilize palavras-passe fracas ou comuns; evite reutilizar
              palavras-passe antigas desta conta.
            </li>
            <li>
              É da sua responsabilidade manter as credenciais confidenciais e
              terminar sessão em equipamentos partilhados.
            </li>
            <li>
              A autenticação em dois fatores (2FA) é recomendada para reforçar a
              proteção da conta, quando disponível.
            </li>
            <li>
              O incumprimento pode implicar restrições de acesso ou bloqueio da
              conta, em linha com as políticas da instituição.
            </li>
          </ul>
          <p className="text-xs text-gray-500">
            {isMandatory
              ? "Ao aceitar, declara que tomou conhecimento destas condições e que utilizará o sistema de forma adequada."
              : "Estas políticas aplicam-se a todos os utilizadores da plataforma."}
          </p>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-col gap-2">
          {isMandatory ? (
            <button
              type="button"
              onClick={onAccept}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Li e aceito as políticas de segurança
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
