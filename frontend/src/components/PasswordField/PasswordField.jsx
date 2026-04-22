import { useId, useState } from "react";

function IconEye({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/**
 * Campo de palavra-passe com botão para mostrar / ocultar texto.
 */
export default function PasswordField({
  id: idProp,
  inputClassName = "w-full border p-2 rounded",
  wrapperClassName = "",
  disabled,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);
  const uid = useId();
  const id = idProp ?? `password-field-${uid}`;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`${inputClassName} pr-10`}
        {...inputProps}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none"
        aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
        aria-controls={id}
        aria-pressed={visible}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
