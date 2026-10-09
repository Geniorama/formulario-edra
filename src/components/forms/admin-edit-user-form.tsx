"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  PhoneField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";

type FieldErrors = Record<string, string[] | undefined>;

export type AdminEditUserData = {
  firstName: string;
  lastName: string;
  phone: string;
};

/**
 * Datos básicos de la cuenta de un cliente o asesor, editables por el ADMIN
 * (`PATCH /api/admin/users/[id]`). El correo solo se muestra: no se edita.
 */
export function AdminEditUserForm({
  userId,
  email,
  initial,
}: {
  userId: string;
  email: string;
  initial: AdminEditUserData;
}) {
  const router = useRouter();
  const [data, setData] = useState<AdminEditUserData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function set<K extends keyof AdminEditUserData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.issues) setFieldErrors(body.issues);
        setError(body.error ?? "No pudimos guardar los datos del usuario.");
        return;
      }

      setMessage("Datos del usuario actualizados.");
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {message ? <FormAlert type="success">{message}</FormAlert> : null}
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Nombres"
          type="text"
          value={data.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          error={fieldErrors.firstName?.[0]}
          required
        />
        <Field
          label="Apellidos"
          type="text"
          value={data.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          error={fieldErrors.lastName?.[0]}
          required
        />
        <Field
          label="Correo Electrónico"
          type="email"
          value={email}
          className="opacity-60"
          readOnly
          disabled
        />
        <PhoneField
          label="Número de Teléfono"
          value={data.phone || undefined}
          onChange={(v) => set("phone", v ?? "")}
          error={fieldErrors.phone?.[0]}
          optional
        />
      </div>
      <p className="text-xs text-edra-grey">
        El correo es el que el usuario usa para iniciar sesión y no se puede
        modificar.
      </p>

      <div className="flex justify-end">
        <div className="w-48">
          <SubmitButton loading={loading}>Guardar cambios</SubmitButton>
        </div>
      </div>
    </form>
  );
}
