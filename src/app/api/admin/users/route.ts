import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adminCreateUserSchema } from "@/lib/validations";
import { createToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mailer";
import { ROLE_LABELS } from "@/lib/roles";

export async function POST(request: Request) {
  // Solo administradores pueden crear usuarios.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { firstName, lastName, email, phone, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con este correo." },
      { status: 409 }
    );
  }

  // Contraseña aleatoria inservible: el usuario define la suya por invitación.
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone ? phone : null,
      role,
      passwordHash,
      // emailVerified queda null hasta que el usuario establezca su contraseña.
    },
  });

  try {
    const token = await createToken(user.id, "ACCOUNT_INVITE");
    await sendInviteEmail(user.email, token, ROLE_LABELS[role]);
  } catch (error) {
    console.error("Error enviando invitación:", error);
    return NextResponse.json(
      {
        ok: true,
        warning:
          "El usuario fue creado, pero no se pudo enviar el correo de invitación.",
      },
      { status: 201 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: `Usuario creado. Se envió una invitación a ${user.email}.`,
    },
    { status: 201 }
  );
}
