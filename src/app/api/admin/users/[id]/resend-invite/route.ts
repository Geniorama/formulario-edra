import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { createToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mailer";
import { ROLE_LABELS } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // La invitación solo aplica a usuarios que aún no activaron su cuenta.
  if (user.emailVerified) {
    return NextResponse.json(
      { error: "Este usuario ya activó su cuenta." },
      { status: 400 }
    );
  }

  try {
    const token = await createToken(user.id, "ACCOUNT_INVITE");
    await sendInviteEmail(user.email, token, ROLE_LABELS[user.role]);
  } catch (error) {
    console.error("Error reenviando invitación:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el correo de invitación." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Invitación reenviada a ${user.email}.`,
  });
}
