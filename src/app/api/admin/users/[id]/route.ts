import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminUpdateUserSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/admin-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  // El admin no puede cambiar su propio rol/estado desde aquí (evita bloquearse).
  if (id === guard.session.user.id) {
    return NextResponse.json(
      { error: "No puedes modificar tu propia cuenta desde el panel." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const { firstName, lastName, phone, role, active } = parsed.data;

  // Los datos básicos solo se editan en clientes y asesores, no en otros admins.
  const editsBasicData = [firstName, lastName, phone].some(
    (v) => v !== undefined
  );
  if (editsBasicData && existing.role === "ADMIN") {
    return NextResponse.json(
      { error: "No se pueden editar los datos de otro administrador." },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id },
    data: {
      firstName,
      lastName,
      phone: phone === undefined ? undefined : phone || null,
      role,
      active,
    },
  });

  return NextResponse.json({ ok: true, message: "Usuario actualizado." });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  if (id === guard.session.user.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Los tokens del usuario se eliminan en cascada (onDelete: Cascade).
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true, message: "Usuario eliminado." });
}
