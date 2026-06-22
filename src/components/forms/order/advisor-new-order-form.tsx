"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrderFields } from "./order-fields";
import { SelectField, SubmitButton, FormAlert } from "@/components/ui/form-fields";
import {
  emptyOrder,
  validateOrderState,
  type OrderState,
} from "@/lib/order-utils";
import type { OrderFieldKey } from "@/lib/product-fields";

export type ClientOption = { id: string; name: string; email: string };

export function AdvisorNewOrderForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [order, setOrder] = useState<OrderState>(emptyOrder);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onField(key: OrderFieldKey, value: string) {
    setOrder((p) => ({ ...p, [key]: value }));
    setTouched((p) => ({ ...p, [key]: true }));
  }
  function onProduct(value: string) {
    setOrder({ ...emptyOrder, product: value });
    setTouched((p) => ({ ...p, product: true }));
  }

  const allErrors = validateOrderState(order);
  const errors: Record<string, string> = {};
  for (const k in allErrors) if (touched[k]) errors[k] = allErrors[k];
  const clientError = touched.clientId && !clientId ? "Selecciona un cliente" : undefined;

  async function submit() {
    const e = validateOrderState(order);
    setTouched((prev) => {
      const t: Record<string, boolean> = { ...prev, clientId: true };
      for (const k in e) t[k] = true;
      return t;
    });
    if (!clientId || Object.keys(e).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/asesor/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, order }),
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
            setTouched((p) => ({ ...p, clientId: true }));
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

      <OrderFields
        order={order}
        onField={onField}
        onProduct={onProduct}
        errors={errors}
      />

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
