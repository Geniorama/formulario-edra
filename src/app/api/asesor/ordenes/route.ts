import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { workOrderSchema } from "@/lib/validations";
import { sanitizeOrderItems } from "@/lib/client-registration";
import { notifyClientNewOrder } from "@/lib/notifications";

// El asesor (o admin) crea una orden a nombre de un cliente registrado.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { clientId?: unknown; order?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (typeof body.clientId !== "string" || !body.clientId) {
    return NextResponse.json({ error: "Selecciona un cliente" }, { status: 422 });
  }

  const client = await prisma.user.findFirst({
    where: { id: body.clientId, role: "CLIENTE" },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json(
      { error: "El cliente seleccionado no es válido." },
      { status: 422 }
    );
  }

  const parsed = workOrderSchema.safeParse(body.order);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de la orden inválidos", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: client.id,
      advisorId: session.user.id, // el asesor que la crea queda como gestor
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
    await notifyClientNewOrder({
      orderId: order.id,
      number: order.number,
      clientId: client.id,
      items: order.items,
    });
  } catch (e) {
    console.error("Error notificando nueva orden al cliente:", e);
  }

  return NextResponse.json(
    { ok: true, id: order.id, message: "Orden creada." },
    { status: 201 }
  );
}
