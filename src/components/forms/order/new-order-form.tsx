"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderItemsEditor } from "./order-fields";
import { useOrderItems } from "./use-order-items";
import { OrderDone } from "./order-done";
import { SubmitButton, FormAlert } from "@/components/ui/form-fields";

export function NewOrderForm() {
  const { items, errors, valid, handlers, revealErrors } = useOrderItems();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Orden creada: muestra la pantalla de finalización.
  const [done, setDone] = useState<{ id: string; number: string } | null>(null);

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
      setDone({ id: body.id, number: body.number });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <OrderDone
          title="¡Tu orden fue creada!"
          description="Recibimos los detalles de tu joya. Un asesor te contactará pronto. Puedes descargar tu orden en PDF."
          orderId={done.id}
          orderNumber={done.number}
        >
          <Link
            href={`/mis-ordenes/${done.id}`}
            className="rounded-full border border-edra-grey/30 px-6 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra"
          >
            Ver mi orden
          </Link>
        </OrderDone>
      </div>
    );
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
