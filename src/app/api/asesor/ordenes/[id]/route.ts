import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  orderStatusEnum,
  deliveryTypeEnum,
  paymentMethodEnum,
  invoiceTypeEnum,
  MAX_ORDER_ITEMS,
} from "@/lib/validations";
import { ADVISOR_ITEM_KEYS } from "@/lib/product-fields";
import { sanitizeOrderItem } from "@/lib/client-registration";
import { notifyAdvisorStatusChange } from "@/lib/notifications";
// (creación de órdenes por el asesor vive en ../route.ts)
import { sendOrderStatusEmail } from "@/lib/mailer";
import {
  ORDER_STATUS_LABELS,
  formatOrderNumber,
  computeBalanceWithShipping,
} from "@/lib/order-display";
import type { OrderStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

const FINAL_DATE_KEYS = [
  "saleDate",
  "jewelerDeliveryDate",
  "deliveryFrom",
  "deliveryTo",
] as const;

// El saldo con envío no se recibe: se calcula (compra - abono + envío).
const FINAL_MONEY_KEYS = [
  "purchaseValue",
  "depositValue",
  "shippingValue",
] as const;

const FINAL_TEXT_KEYS = ["jeweler", "internalNotes"] as const;

type ItemPayload = {
  id?: unknown;
  fields?: Record<string, unknown>;
  client?: Record<string, unknown>;
};

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function parseMoney(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim()) {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function trimOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Campos técnicos de un producto: solo se aceptan los conocidos. */
function advisorItemFields(raw: Record<string, unknown> = {}) {
  const data: Record<string, string | null> = {};
  for (const key of ADVISOR_ITEM_KEYS) {
    const value = raw[key];
    if (typeof value === "string") data[key] = value.trim() || null;
  }
  return data;
}

// El asesor (o admin) actualiza código, estado y campos técnicos de una orden.
// El ADMIN, además, puede editar la solicitud del cliente, agregar o quitar
// productos de la compra y reasignar el asesor.
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const isAdmin = session.user.role === "ADMIN";

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      advisorId: true,
      status: true,
      number: true,
      userId: true,
      items: { select: { id: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  let body: {
    status?: unknown;
    workOrderCode?: unknown;
    manufacturingNotes?: unknown;
    items?: unknown;
    final?: Record<string, unknown>;
    advisorId?: unknown;
    takeOrder?: boolean;
    assign?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const parsed = orderStatusEnum.safeParse(body.status);
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 422 });
    }
    data.status = parsed.data;
  }

  if (typeof body.workOrderCode === "string") {
    data.workOrderCode = body.workOrderCode.trim() || null;
  }

  // Observaciones de fabricación: iguales para toda la compra.
  if (typeof body.manufacturingNotes === "string") {
    data.manufacturingNotes = body.manufacturingNotes.trim() || null;
  }

  // Paso 4 — Datos finales.
  const final = body.final;
  if (final && typeof final === "object") {
    for (const key of FINAL_DATE_KEYS) data[key] = parseDate(final[key]);
    for (const key of FINAL_MONEY_KEYS) data[key] = parseMoney(final[key]);
    for (const key of FINAL_TEXT_KEYS) data[key] = trimOrNull(final[key]);

    const dt = deliveryTypeEnum.safeParse(final.deliveryType);
    data.deliveryType = dt.success ? dt.data : null;
    const pm = paymentMethodEnum.safeParse(final.paymentMethod);
    data.paymentMethod = pm.success ? pm.data : null;
    const fe = invoiceTypeEnum.safeParse(final.invoiceType);
    data.invoiceType = fe.success ? fe.data : null;

    // Saldo con envío: siempre calculado en el servidor (no editable).
    data.balanceWithShipping = computeBalanceWithShipping({
      purchaseValue: data.purchaseValue as number | null,
      depositValue: data.depositValue as number | null,
      shippingValue: data.shippingValue as number | null,
    });
  }

  // Reasignación del asesor (solo ADMIN). "" o null → sin asignar.
  let advisorReassigned = false;
  if (isAdmin && body.advisorId !== undefined) {
    const advisorId = trimOrNull(body.advisorId);
    if (advisorId) {
      const advisor = await prisma.user.findFirst({
        where: { id: advisorId, role: { in: ["ASESOR", "ADMIN"] } },
        select: { id: true },
      });
      if (!advisor) {
        return NextResponse.json(
          { error: "El asesor seleccionado no es válido." },
          { status: 422 }
        );
      }
    }
    data.advisorId = advisorId;
    advisorReassigned = true;
  }

  // Gestor de venta: si la orden no tiene asesor (o pide tomarla), se asigna a
  // quien diligencia. Con assign:false (cambio rápido de estado) no se reasigna.
  if (
    !advisorReassigned &&
    body.assign !== false &&
    (!order.advisorId || body.takeOrder)
  ) {
    data.advisorId = session.user.id;
  }

  // ── Productos de la compra ──────────────────────────────────────────────
  const payloadItems: ItemPayload[] = Array.isArray(body.items)
    ? (body.items as ItemPayload[]).slice(0, MAX_ORDER_ITEMS)
    : [];
  const existingIds = new Set(order.items.map((i) => i.id));
  const keptIds = new Set<string>();
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  payloadItems.forEach((item, position) => {
    const itemId = typeof item.id === "string" ? item.id : "";
    const fields = advisorItemFields(
      (item.fields ?? {}) as Record<string, unknown>
    );
    // Solo el ADMIN edita la solicitud del cliente.
    const client =
      isAdmin && item.client && typeof item.client === "object"
        ? sanitizeOrderItem(item.client)
        : {};

    if (itemId && existingIds.has(itemId)) {
      keptIds.add(itemId);
      operations.push(
        prisma.orderItem.update({
          where: { id: itemId },
          data: { ...fields, ...client, position },
        })
      );
    } else if (isAdmin) {
      // Producto nuevo agregado por el administrador.
      operations.push(
        prisma.orderItem.create({
          data: { ...fields, ...client, orderId: order.id, position },
        })
      );
    }
  });

  // El ADMIN también puede quitar productos de la compra.
  if (isAdmin && payloadItems.length > 0) {
    const removed = [...existingIds].filter((itemId) => !keptIds.has(itemId));
    if (removed.length > 0) {
      operations.push(
        prisma.orderItem.deleteMany({ where: { id: { in: removed } } })
      );
    }
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id }, data }),
    ...operations,
  ]);

  // Si cambió el estado, notificar al asesor de la orden (dashboard + correo).
  const newStatus = data.status as OrderStatus | undefined;
  if (newStatus && newStatus !== order.status) {
    const statusLabel = ORDER_STATUS_LABELS[newStatus];
    const advisorId =
      "advisorId" in data
        ? (data.advisorId as string | null)
        : order.advisorId;
    try {
      const targets = await notifyAdvisorStatusChange({
        orderId: order.id,
        number: order.number,
        advisorId,
        actorId: session.user.id,
        statusLabel,
      });
      for (const target of targets) {
        try {
          await sendOrderStatusEmail(
            target.email,
            formatOrderNumber(order.number),
            statusLabel,
            order.id
          );
        } catch (e) {
          console.error("Error enviando correo de estado:", e);
        }
      }
    } catch (e) {
      console.error("Error notificando cambio de estado:", e);
    }
  }

  return NextResponse.json({ ok: true, message: "Orden actualizada." });
}
