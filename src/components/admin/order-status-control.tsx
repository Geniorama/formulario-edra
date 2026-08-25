"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from "@/lib/order-display";
import type { OrderStatus } from "@/generated/prisma/enums";

// Permite cambiar el estado de una orden desde la tabla, con confirmación.
export function OrderStatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [busy, setBusy] = useState(false);

  async function onChange(next: OrderStatus) {
    if (next === status || busy) return;

    const ok = window.confirm(
      `¿Cambiar el estado de la orden a "${ORDER_STATUS_LABELS[next]}"? Se notificará al asesor por correo.`
    );
    if (!ok) return; // el select se revierte solo (es controlado por `status`)

    setBusy(true);
    try {
      const res = await fetch(`/api/asesor/ordenes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // assign:false → un cambio rápido de estado no reasigna el gestor.
        body: JSON.stringify({ status: next, assign: false }),
      });
      if (res.ok) {
        setStatus(next);
        router.refresh();
      }
    } catch {
      // se mantiene el estado anterior
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      className={`appearance-none rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${ORDER_STATUS_STYLES[status]}`}
      aria-label="Cambiar estado de la orden"
    >
      {ORDER_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="bg-white text-edra-ink">
          {o.label}
        </option>
      ))}
    </select>
  );
}
