const PASSWORD_POLICY_MESSAGES_PT = {
  password_required: "Indique uma palavra-passe.",
  password_too_short: "A nova palavra-passe é demasiado curta (mín. 8).",
  password_too_long: "A nova palavra-passe é demasiado longa.",
  password_requires_uppercase: "É necessária pelo menos uma letra maiúscula.",
  password_requires_number: "É necessário pelo menos um dígito.",
  password_requires_special_char:
    "É necessário pelo menos um carácter especial.",
  password_compromised: "Esta palavra-passe é demasiado fraca ou comum.",
  password_reuse_not_allowed: "Não pode reutilizar uma palavra-passe antiga.",
};

/**
 * Se `raw` for um código de política devolvido pelo backend, devolve a mensagem em PT.
 * Caso contrário devolve null (o chamador pode mostrar o texto original).
 */
export function translatePasswordPolicyCode(raw) {
  if (typeof raw !== "string") return null;
  const msg = raw.trim();
  if (!msg) return null;
  const lower = msg.toLowerCase();
  return (
    PASSWORD_POLICY_MESSAGES_PT[msg] ??
    PASSWORD_POLICY_MESSAGES_PT[lower] ??
    null
  );
}
