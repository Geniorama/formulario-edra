import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clientOnboardingSchema } from "@/lib/validations";
import { persistRegistration } from "@/lib/client-registration";
import { notifyStaffNewOrder } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "CLIENTE") {
    return NextResponse.json(
      { error: "Solo los clientes completan este registro." },
      { status: 403 }
    );
  }

  const userId = session.user.id;

  const existing = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { completed: true },
  });
  if (existing?.completed) {
    return NextResponse.json(
      { error: "Tu registro ya fue completado." },
      { status: 409 }
    );
  }

  let body: {
    personal?: Record<string, unknown>;
    order?: Record<string, unknown>;
    step?: number;
    finalize?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  // Envío final: validación estricta + marca como completado.
  if (body.finalize) {
    const parsed = clientOnboardingSchema.safeParse({
      personal: body.personal,
      order: body.order,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }
    await persistRegistration(userId, parsed.data.personal, parsed.data.order, {
      completed: true,
      lastStep: 2,
    });

    try {
      const order = await prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, number: true, product: true },
      });
      if (order) {
        await notifyStaffNewOrder({
          orderId: order.id,
          number: order.number,
          product: order.product,
          clientName: session.user.name ?? "Un cliente",
        });
      }
    } catch (e) {
      console.error("Error notificando nueva orden:", e);
    }

    return NextResponse.json(
      { ok: true, message: "Registro completado." },
      { status: 201 }
    );
  }

  // Guardado de progreso (borrador): acepta datos parciales.
  await persistRegistration(userId, body.personal ?? {}, body.order ?? {}, {
    lastStep: typeof body.step === "number" ? body.step : undefined,
  });
  return NextResponse.json({ ok: true, message: "Progreso guardado." });
}
