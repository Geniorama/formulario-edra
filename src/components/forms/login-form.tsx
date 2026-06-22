"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Field,
  PasswordField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = params.get("verify");
  const reset = params.get("reset");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(e.currentTarget);

    try {
      const res = await signIn("credentials", {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        redirect: false,
      });

      setLoading(false);

      if (!res || res.error) {
        setError(
          "Correo o contraseña incorrectos, o tu correo aún no ha sido confirmado."
        );
        return;
      }

      const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {verify === "success" ? (
        <FormAlert type="success">
          ¡Tu correo fue confirmado! Ya puedes iniciar sesión.
        </FormAlert>
      ) : null}
      {verify === "invalid" ? (
        <FormAlert type="error">
          El enlace de confirmación no es válido o ya expiró.{" "}
          <Link href="/reenviar-verificacion" className="font-semibold underline">
            Reenviar correo
          </Link>
        </FormAlert>
      ) : null}
      {reset === "success" ? (
        <FormAlert type="success">
          Tu contraseña se actualizó. Inicia sesión con la nueva.
        </FormAlert>
      ) : null}
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <Field
        label="Correo Electrónico"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@gmail.com"
        required
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        required
      />

      <div className="text-right">
        <Link
          href="/recuperar-contrasena"
          className="text-xs font-medium text-edra hover:text-edra-dark"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <SubmitButton loading={loading}>Iniciar sesión</SubmitButton>

      <p className="text-center text-sm text-edra-grey">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-edra hover:text-edra-dark">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
