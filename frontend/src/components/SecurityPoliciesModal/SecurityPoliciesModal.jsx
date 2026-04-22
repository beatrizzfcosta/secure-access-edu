/**
 * Modal obrigatório na primeira alteração de palavra-passe (conta com password_change_required).
 */
export default function SecurityPoliciesModal({ open, onAccept }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      aria-hidden={!open}
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 max-h-[min(90vh,32rem)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-policies-title"
      >
        <div className="p-6 overflow-y-auto flex-1">
          <h2
            id="security-policies-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            Políticas de segurança
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Antes de definir a sua nova palavra-passe, confirme que leu e aceita
            as regras de utilização segura desta plataforma.
          </p>
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
            Ao aceitar, declara que tomou conhecimento destas condições e que
            utilizará o sistema de forma adequada.
          </p>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onAccept}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Li e aceito as políticas de segurança
          </button>
        </div>
      </div>
    </div>
  );
}
