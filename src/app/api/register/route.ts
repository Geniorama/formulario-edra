import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta registrada con este correo." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone ? phone : null,
      passwordHash,
    },
  });

  try {
    const token = await createToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, token);
  } catch (error) {
    console.error("Error enviando correo de verificación:", error);
    // El usuario ya existe; puede reenviar el correo más tarde.
    return NextResponse.json(
      {
        ok: true,
        warning:
          "Tu cuenta fue creada, pero no pudimos enviar el correo de confirmación. Intenta reenviarlo más tarde.",
      },
      { status: 201 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Cuenta creada. Te enviamos un correo para confirmar tu dirección.",
    },
    { status: 201 }
  );
}
