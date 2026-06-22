"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  PhoneField,
  SelectField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import { ROLE_OPTIONS } from "@/lib/roles";

type FieldErrors = Record<string, string[] | undefined>;

export function AdminCreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phone, setPhone] = useState<string | undefined>(undefined);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: phone ?? "",
      role: String(data.get("role") ?? ""),
    };

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      setLoading(false);

      if (!res.ok) {
        if (body.issues) setFieldErrors(body.issues);
        setError(body.error ?? "No pudimos crear el usuario.");
        return;
      }

      setMessage(body.warning ?? body.message);
      form.reset();
      setPhone(undefined);
      router.refresh(); // actualiza el listado de usuarios
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {message ? <FormAlert type="success">{message}</FormAlert> : null}
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Nombres"
          name="firstName"
          type="text"
          placeholder="Nombres"
          error={fieldErrors.firstName?.[0]}
          required
        />
        <Field
          label="Apellidos"
          name="lastName"
          type="text"
          placeholder="Apellidos"
          error={fieldErrors.lastName?.[0]}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Correo Electrónico"
          name="email"
          type="email"
          placeholder="correo@ejemplo.com"
          error={fieldErrors.email?.[0]}
          required
        />
        <SelectField label="Rol" name="role" defaultValue="CLIENTE" required>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>
      <PhoneField
        label="Número de Teléfono"
        value={phone}
        onChange={setPhone}
        error={fieldErrors.phone?.[0]}
        optional
      />

      <SubmitButton loading={loading}>
        Crear usuario y enviar invitación
      </SubmitButton>
    </form>
  );
}
