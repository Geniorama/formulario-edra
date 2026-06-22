"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PasswordField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";

type FieldErrors = Record<string, string[] | undefined>;

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <FormAlert type="error">
          El enlace no es válido. Solicita uno nuevo desde &quot;¿Olvidaste tu
          contraseña?&quot;.
        </FormAlert>
        <Link
          href="/recuperar-contrasena"
          className="inline-block rounded-full bg-edra px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-edra-dark"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: String(data.get("password") ?? ""),
          confirmPassword: String(data.get("confirmPassword") ?? ""),
        }),
      });
      const body = await res.json();
      setLoading(false);

      if (!res.ok) {
        if (body.issues) setFieldErrors(body.issues);
        setError(body.error ?? "No pudimos actualizar tu contraseña.");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <PasswordField
        label="Nueva contraseña"
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

      <SubmitButton loading={loading}>Guardar contraseña</SubmitButton>
    </form>
  );
}
