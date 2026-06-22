import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { createToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

// Respuesta genérica: nunca revelamos si el correo existe o no.
const GENERIC = {
  ok: true,
  message:
    "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ingresa un correo válido" },
      { status: 422 }
    );
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Solo enviamos el correo si el usuario existe y ya confirmó su cuenta.
  if (user && user.emailVerified) {
    try {
      const token = await createToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      console.error("Error enviando correo de recuperación:", error);
    }
  }

  return NextResponse.json(GENERIC, { status: 200 });
}
