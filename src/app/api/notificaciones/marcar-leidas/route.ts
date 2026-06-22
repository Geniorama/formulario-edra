import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Marca como leídas las notificaciones indicadas (o todas si no se envían ids).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((x: unknown): x is string => typeof x === "string");
    }
  } catch {
    // sin cuerpo → marcar todas
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
