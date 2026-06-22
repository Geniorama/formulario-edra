"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrderFields } from "./order-fields";
import {
  emptyOrder,
  validateOrderState,
  type OrderState,
} from "@/lib/order-utils";
import type { OrderFieldKey } from "@/lib/product-fields";
import { SubmitButton, FormAlert } from "@/components/ui/form-fields";

export function NewOrderForm() {
  const router = useRouter();
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

  async function submit() {
    const e = validateOrderState(order);
    if (Object.keys(e).length > 0) {
      setTouched((prev) => {
        const t = { ...prev };
        for (const k in e) t[k] = true;
        return t;
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cliente/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "No pudimos crear la orden.");
        return;
      }
      router.push(`/mis-ordenes/${body.id}`);
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

      <OrderFields
        order={order}
        onField={onField}
        onProduct={onProduct}
        errors={errors}
      />

      <div className="mt-8 flex items-center justify-between gap-3">
        <Link
          href="/mis-ordenes"
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
