"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, SubmitButton, FormAlert } from "@/components/ui/form-fields";

export function ResendForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(data.get("email") ?? "") }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "No pudimos procesar tu solicitud.");
        return;
      }
      setMessage(body.message);
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {message ? <FormAlert type="success">{message}</FormAlert> : null}
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <Field
        label="Correo Electrónico"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@gmail.com"
        required
      />

      <SubmitButton loading={loading}>Reenviar confirmación</SubmitButton>

      <p className="text-center text-sm text-edra-grey">
        <Link href="/login" className="font-semibold text-edra hover:text-edra-dark">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
