"use client";

import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const baseInput =
  "w-full rounded-full border border-edra-grey/30 bg-white px-5 py-3 text-sm text-edra-ink placeholder:text-edra-grey/60 transition-colors focus:border-edra focus:outline-none";

// Etiqueta con indicador: * para obligatorios, "(opcional)" para los demás.
function FieldLabel({
  htmlFor,
  label,
  optional,
}: {
  htmlFor?: string;
  label: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-edra-ink"
    >
      {label}
      {optional ? (
        <span className="font-normal text-edra-grey/70"> (opcional)</span>
      ) : (
        <span className="text-red-500"> *</span>
      )}
    </label>
  );
}

export function Field({
  label,
  error,
  optional,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={props.id ?? props.name} label={label} optional={optional} />
      <input
        id={props.id ?? props.name}
        className={`${baseInput} ${
          error ? "border-red-400 focus:border-red-400" : ""
        }`}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function MoneyField({
  label,
  error,
  optional,
  value,
  onChange,
  className = "",
}: {
  label: string;
  error?: string;
  optional?: boolean;
  value: string; // dígitos crudos, p. ej. "1500000"
  onChange: (rawDigits: string) => void;
  className?: string;
}) {
  const digits = (value ?? "").replace(/\D/g, "");
  const display = digits
    ? new Intl.NumberFormat("es-CO").format(Number(digits))
    : "";
  return (
    <div className={className}>
      <FieldLabel label={label} optional={optional} />
      <div className="relative">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm text-edra-grey">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className={`${baseInput} pl-8 ${
            error ? "border-red-400 focus:border-red-400" : ""
          }`}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  error,
  optional,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={props.id ?? props.name} label={label} optional={optional} />
      <select
        id={props.id ?? props.name}
        className={`${baseInput} appearance-none bg-[length:1rem] bg-[right_1.25rem_center] bg-no-repeat pr-10 ${
          error ? "border-red-400 focus:border-red-400" : ""
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236e6f71'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
        }}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function PasswordField({
  label,
  error,
  optional,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  optional?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <FieldLabel htmlFor={props.id ?? props.name} label={label} optional={optional} />
      <div className="relative">
        <input
          id={props.id ?? props.name}
          type={show ? "text" : "password"}
          className={`${baseInput} pr-14 ${
            error ? "border-red-400 focus:border-red-400" : ""
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-edra hover:text-edra-dark"
          tabIndex={-1}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? "Ocultar" : "Ver"}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function PhoneField({
  label,
  error,
  value,
  onChange,
  optional,
  className = "",
}: {
  label: string;
  error?: string;
  value?: string;
  onChange: (value?: string) => void;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} optional={optional} />
      <div
        className={`edra-phone flex items-center rounded-full border bg-white px-5 py-3 transition-colors focus-within:border-edra ${
          error ? "border-red-400" : "border-edra-grey/30"
        }`}
      >
        <PhoneInput
          international
          defaultCountry="CO"
          countryCallingCodeEditable={false}
          value={value}
          onChange={onChange}
          placeholder="300 123 4567"
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  optional,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={props.id ?? props.name} label={label} optional={optional} />
      <textarea
        id={props.id ?? props.name}
        rows={3}
        className={`w-full rounded-2xl border border-edra-grey/30 bg-white px-5 py-3 text-sm text-edra-ink placeholder:text-edra-grey/60 transition-colors focus:border-edra focus:outline-none ${
          error ? "border-red-400 focus:border-red-400" : ""
        }`}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function Checkbox({
  label,
  error,
  optional,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-edra-ink">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-edra-grey/40 text-edra accent-edra"
          {...props}
        />
        <span>
          {label}
          {optional ? (
            <span className="font-normal text-edra-grey/70"> (opcional)</span>
          ) : (
            <span className="text-red-500"> *</span>
          )}
        </span>
      </label>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function SubmitButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className="w-full rounded-full bg-edra px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-edra-dark disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {loading ? "Procesando…" : children}
    </button>
  );
}

export function FormAlert({
  type = "info",
  children,
}: {
  type?: "info" | "success" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-edra-soft text-edra-dark",
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-600",
  }[type];
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}
