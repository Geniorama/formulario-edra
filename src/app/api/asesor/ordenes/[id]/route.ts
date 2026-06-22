import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  orderStatusEnum,
  deliveryTypeEnum,
  paymentMethodEnum,
} from "@/lib/validations";
import { ADVISOR_FIELD_META } from "@/lib/product-fields";
import { notifyClientStatusChange } from "@/lib/notifications";
import { sendOrderStatusEmail } from "@/lib/mailer";
import { ORDER_STATUS_LABELS, formatOrderNumber } from "@/lib/order-display";
import type { OrderStatus } from "@/generated/prisma/enums";

type Params = { params: Promise<{ id: string }> };

const FINAL_DATE_KEYS = [
  "saleDate",
  "deliveryFrom",
  "deliveryTo",
  "jewelerDeliveryDate",
  "estimatedDeliveryDate",
] as const;

const FINAL_MONEY_KEYS = [
  "purchaseValue",
  "depositValue",
  "shippingValue",
  "balanceWithShipping",
] as const;

const FINAL_TEXT_KEYS = [
  "depositReceiptUrl",
  "finalDescription",
  "jeweler",
  "internalNotes",
] as const;

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

// El asesor (o admin) actualiza código, estado y campos técnicos de una orden.
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      advisorId: true,
      status: true,
      number: true,
      userId: true,
      user: { select: { email: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  let body: {
    status?: unknown;
    workOrderCode?: unknown;
    fields?: Record<string, unknown>;
    final?: Record<string, unknown>;
    takeOrder?: boolean;
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

  // Campos técnicos: solo se aceptan los conocidos.
  if (body.fields && typeof body.fields === "object") {
    for (const key of Object.keys(ADVISOR_FIELD_META)) {
      const value = body.fields[key];
      if (typeof value === "string") {
        data[key] = value.trim() || null;
      }
    }
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
  }

  // Gestor de venta: si la orden no tiene asesor (o pide tomarla), se asigna a quien diligencia.
  if (!order.advisorId || body.takeOrder) {
    data.advisorId = session.user.id;
  }

  await prisma.order.update({ where: { id }, data });

  // Si cambió el estado, notificar al cliente (dashboard + correo).
  const newStatus = data.status as OrderStatus | undefined;
  if (newStatus && newStatus !== order.status) {
    const statusLabel = ORDER_STATUS_LABELS[newStatus];
    try {
      await notifyClientStatusChange({
        orderId: order.id,
        number: order.number,
        clientId: order.userId,
        statusLabel,
      });
    } catch (e) {
      console.error("Error notificando cambio de estado:", e);
    }
    try {
      await sendOrderStatusEmail(
        order.user.email,
        formatOrderNumber(order.number),
        statusLabel,
        order.id
      );
    } catch (e) {
      console.error("Error enviando correo de estado:", e);
    }
  }

  return NextResponse.json({ ok: true, message: "Orden actualizada." });
}
