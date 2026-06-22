"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Field,
  PasswordField,
  PhoneField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";

type FieldErrors = Record<string, string[] | undefined>;

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | undefined>(undefined);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const payload = {
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: phone ?? "",
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      setLoading(false);

      if (!res.ok) {
        if (body.issues) setFieldErrors(body.issues);
        setError(body.error ?? "No pudimos crear tu cuenta. Intenta de nuevo.");
        return;
      }

      setDone(
        body.warning ??
          "¡Listo! Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada (y la carpeta de spam)."
      );
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <FormAlert type="success">{done}</FormAlert>
        <Link
          href="/login"
          className="inline-block rounded-full bg-edra px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-edra-dark"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Nombres"
          name="firstName"
          type="text"
          autoComplete="given-name"
          placeholder="Escribe tus nombres..."
          error={fieldErrors.firstName?.[0]}
          required
        />
        <Field
          label="Apellidos"
          name="lastName"
          type="text"
          autoComplete="family-name"
          placeholder="Escribe tus apellidos..."
          error={fieldErrors.lastName?.[0]}
          required
        />
      </div>
      <Field
        label="Correo Electrónico"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@gmail.com"
        error={fieldErrors.email?.[0]}
        required
      />
      <PhoneField
        label="Número de Teléfono"
        value={phone}
        onChange={setPhone}
        error={fieldErrors.phone?.[0]}
        optional
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={fieldErrors.password?.[0]}
        required
      />
      <PasswordField
        label="Confirmar contraseña"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repite tu contraseña"
        error={fieldErrors.confirmPassword?.[0]}
        required
      />

      <SubmitButton loading={loading}>Crear cuenta</SubmitButton>

      <p className="text-center text-sm text-edra-grey">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-edra hover:text-edra-dark">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
