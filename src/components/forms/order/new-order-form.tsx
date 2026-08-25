"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrderItemsEditor } from "./order-fields";
import { useOrderItems } from "./use-order-items";
import { SubmitButton, FormAlert } from "@/components/ui/form-fields";

export function NewOrderForm() {
  const router = useRouter();
  const { items, errors, valid, handlers, revealErrors } = useOrderItems();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!valid) {
      revealErrors();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cliente/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
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

      <OrderItemsEditor items={items} errors={errors} {...handlers} />

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
