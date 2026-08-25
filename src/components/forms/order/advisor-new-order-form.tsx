"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrderItemsEditor } from "./order-fields";
import { useOrderItems } from "./use-order-items";
import { SelectField, SubmitButton, FormAlert } from "@/components/ui/form-fields";

export type ClientOption = { id: string; name: string; email: string };

export function AdvisorNewOrderForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientTouched, setClientTouched] = useState(false);
  const { items, errors, valid, handlers, revealErrors } = useOrderItems();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientError =
    clientTouched && !clientId ? "Selecciona un cliente" : undefined;

  async function submit() {
    setClientTouched(true);
    if (!valid) revealErrors();
    if (!clientId || !valid) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/asesor/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, order: { items } }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "No pudimos crear la orden.");
        return;
      }
      router.push(`/asesor/ordenes/${body.id}`);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
      {error ? (
        <div className="mb-5">
          <FormAlert type="error">{error}</FormAlert>
        </div>
      ) : null}

      <div className="mb-5">
        <SelectField
          label="Cliente"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setClientTouched(true);
          }}
          error={clientError}
        >
          <option value="">Selecciona un cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.email}
            </option>
          ))}
        </SelectField>
      </div>

      <OrderItemsEditor items={items} errors={errors} {...handlers} />

      <div className="mt-8 flex items-center justify-between gap-3">
        <Link
          href="/asesor/ordenes"
          className="rounded-full border border-edra-grey/30 px-6 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra"
        >
          Cancelar
        </Link>
        <div className="w-44">
          <SubmitButton loading={loading} onClick={submit} type="button">
            Crear orden
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
