import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { workOrderSchema } from "@/lib/validations";
import { sanitizeOrderItems } from "@/lib/client-registration";
import { notifyStaffNewOrder } from "@/lib/notifications";
import { formatOrderNumber } from "@/lib/order-display";

// Crea una nueva orden de trabajo para el cliente autenticado.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "CLIENTE") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = workOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      items: {
        create: sanitizeOrderItems(parsed.data.items).map((item, position) => ({
          ...item,
          position,
        })),
      },
    },
    select: {
      id: true,
      number: true,
      items: { select: { product: true }, orderBy: { position: "asc" } },
    },
  });

  try {
    await notifyStaffNewOrder({
      orderId: order.id,
      number: order.number,
      items: order.items,
      clientName: session.user.name ?? "Un cliente",
    });
  } catch (e) {
    console.error("Error notificando nueva orden:", e);
  }

  return NextResponse.json(
    {
      ok: true,
      id: order.id,
      number: formatOrderNumber(order.number),
      message: "Orden creada.",
    },
    { status: 201 }
  );
}
