"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Field,
  SelectField,
  PhoneField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import {
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  SHIPPING_COUNTRIES,
  labelOf,
} from "@/lib/form-options";
import type { AdminClientDataInput } from "@/lib/validations";

type ClientData = Required<{
  [K in keyof AdminClientDataInput]: string;
}>;

/**
 * Datos del cliente dentro de la orden. El ADMIN puede editarlos
 * (`PATCH /api/admin/users/[id]/perfil`); el asesor solo los consulta.
 */
export function ClientDataCard({
  userId,
  canEdit,
  email,
  contactMedium,
  socialNetwork,
  socialLink,
  initial,
}: {
  userId: string;
  canEdit: boolean;
  email: string;
  contactMedium: string;
  socialNetwork: string;
  socialLink: string;
  initial: ClientData;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<ClientData>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Tope del selector de cumpleaños (hoy), fijado al montar.
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  function set<K extends keyof ClientData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setData(initial);
    setError(null);
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudieron guardar los datos del cliente.");
        return;
      }
      setMessage("Datos del cliente actualizados.");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  const text = (v: string) => v || "—";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Cliente
        </h2>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-edra hover:text-edra-dark"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar datos
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="mb-4">
          <FormAlert type="success">{message}</FormAlert>
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-5">
          {error ? <FormAlert type="error">{error}</FormAlert> : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Nombres"
              value={data.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
            <Field
              label="Apellidos"
              value={data.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
            <SelectField
              label="Tipo de documento"
              value={data.documentType}
              onChange={(e) => set("documentType", e.target.value)}
              optional
            >
              <option value="">Selecciona...</option>
              {DOCUMENT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <Field
              label="Número de documento"
              value={data.documentNumber}
              onChange={(e) => set("documentNumber", e.target.value)}
              optional
            />
            <PhoneField
              label="Número de WhatsApp"
              value={data.whatsapp || undefined}
              onChange={(v) => set("whatsapp", v ?? "")}
              optional
            />
            <Field
              label="Fecha de cumpleaños"
              type="date"
              max={today}
              value={data.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
              optional
            />
            <SelectField
              label="País de envío"
              value={data.shippingCountry}
              onChange={(e) => set("shippingCountry", e.target.value)}
              optional
            >
              <option value="">Selecciona...</option>
              {SHIPPING_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <Field
              label="Ciudad o estado"
              value={data.cityState}
              onChange={(e) => set("cityState", e.target.value)}
              optional
            />
            <Field
              label="Código postal"
              value={data.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              optional
            />
            <Field
              label="Dirección"
              value={data.address}
              onChange={(e) => set("address", e.target.value)}
              optional
            />
            <Field
              label="Barrio"
              value={data.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              optional
            />
            <Field
              label="Especificaciones de la dirección"
              value={data.addressDetails}
              onChange={(e) => set("addressDetails", e.target.value)}
              placeholder="Conjunto, torre, apto u otras indicaciones"
              optional
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="rounded-full border border-edra-grey/30 px-6 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra disabled:opacity-50"
            >
              Cancelar
            </button>
            <div className="w-48">
              <SubmitButton loading={busy} onClick={save} type="button">
                Guardar datos
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Row label="Nombre" value={`${data.firstName} ${data.lastName}`} />
          <Row label="Correo" value={email} />
          <Row
            label="Documento"
            value={
              data.documentType || data.documentNumber
                ? `${data.documentType ? labelOf(DOCUMENT_TYPES, data.documentType) : ""} ${data.documentNumber}`.trim()
                : "—"
            }
          />
          <Row label="WhatsApp" value={text(data.whatsapp)} />
          <Row
            label="Fecha de cumpleaños"
            value={
              data.birthDate
                ? data.birthDate.split("-").reverse().join("/")
                : "—"
            }
          />
          <Row
            label="Medio de contacto"
            value={labelOf(CONTACT_MEDIUMS, contactMedium)}
          />
          {contactMedium === "RED_SOCIAL" ? (
            <Row
              label={labelOf(SOCIAL_NETWORKS, socialNetwork)}
              value={text(socialLink)}
            />
          ) : null}
          <Row label="País de envío" value={text(data.shippingCountry)} />
          <Row label="Ciudad o estado" value={text(data.cityState)} />
          <Row label="Código postal" value={text(data.postalCode)} />
          <Row label="Dirección" value={text(data.address)} />
          <Row label="Barrio" value={text(data.neighborhood)} />
          <Row
            label="Especificaciones de la dirección"
            value={text(data.addressDetails)}
          />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 text-sm last:border-0">
      <dt className="text-edra-grey">{label}</dt>
      <dd className="text-right font-medium text-edra-ink">{value}</dd>
    </div>
  );
}
