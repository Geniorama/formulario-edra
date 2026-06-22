import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

const GENERIC = {
  ok: true,
  message:
    "Si el correo está registrado y sin confirmar, te enviamos un nuevo enlace de verificación.",
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

  if (user && !user.emailVerified) {
    try {
      const token = await createToken(user.id, "EMAIL_VERIFICATION");
      await sendVerificationEmail(user.email, token);
    } catch (error) {
      console.error("Error reenviando correo de verificación:", error);
    }
  }

  return NextResponse.json(GENERIC, { status: 200 });
}
