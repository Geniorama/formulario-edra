// Prueba el envío de correos (ZeptoMail) y el flujo de restablecimiento
// de contraseña.
//
//   npm run test:correo -- tucorreo@dominio.com
//     → envía las 4 plantillas (verificación, invitación, recuperación, estado)
//       con tokens de ejemplo. Solo comprueba que ZeptoMail funcione.
//
//   npm run test:correo -- tucorreo@dominio.com --real
//     → además, si el correo pertenece a un usuario registrado, crea un token
//       real de restablecimiento en la BD y envía el enlace verdadero, para
//       completar el cambio de contraseña desde el navegador.
import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  sendVerificationEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendOrderStatusEmail,
} from "../src/lib/mailer";

const to = process.argv[2];
const real = process.argv.includes("--real");

if (!to || !to.includes("@")) {
  console.error(
    "Uso: npm run test:correo -- tucorreo@dominio.com [--real]"
  );
  process.exit(1);
}

function checkEnv() {
  const required = ["ZEPTOMAIL_TOKEN"];
  const optional = [
    "ZEPTOMAIL_URL",
    "ZEPTOMAIL_FROM",
    "ZEPTOMAIL_FROM_NAME",
    "NEXT_PUBLIC_APP_URL",
  ];

  let ok = true;
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`✖ Falta la variable obligatoria ${key} en .env`);
      ok = false;
    } else {
      console.log(`✓ ${key} configurado`);
    }
  }
  for (const key of optional) {
    console.log(
      `• ${key} = ${process.env[key] ?? "(valor por defecto)"}`
    );
  }
  return ok;
}

async function send(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${label}`);
    return true;
  } catch (e) {
    console.error(`✖ ${label}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  console.log("── Variables de entorno ──");
  if (!checkEnv()) process.exit(1);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const demoToken = randomBytes(16).toString("hex");

  console.log(`\n── Enviando plantillas a ${to} ──`);
  const results = [
    await send("Confirmación de correo", () =>
      sendVerificationEmail(to, demoToken)
    ),
    await send("Invitación de cuenta", () =>
      sendInviteEmail(to, demoToken, "Asesor")
    ),
    await send("Restablecer contraseña", () =>
      sendPasswordResetEmail(to, demoToken)
    ),
    await send("Cambio de estado de una orden", () =>
      sendOrderStatusEmail(to, "EDRA-00001", "En fabricación", "demo")
    ),
  ];

  if (results.some((r) => !r)) {
    console.error(
      "\n✖ Algún envío falló. Revisa el token de ZeptoMail, el remitente " +
        "verificado y el endpoint regional (ZEPTOMAIL_URL)."
    );
  } else {
    console.log("\n✔ Todas las plantillas se enviaron correctamente.");
    console.log(
      "  (Los enlaces de estas plantillas son de ejemplo: mostrarán " +
        "\"enlace no válido\". Usa --real para probar el flujo completo.)"
    );
  }

  if (!real) return;

  // ── Flujo real de restablecimiento de contraseña ──────────────────────
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("✖ Falta DATABASE_URL / DIRECT_URL para la prueba --real.");
    process.exit(1);
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    console.log(`\n── Restablecimiento real para ${to} ──`);
    const user = await prisma.user.findUnique({
      where: { email: to.trim().toLowerCase() },
    });

    if (!user) {
      console.error("✖ No hay ningún usuario registrado con ese correo.");
      return;
    }
    console.log(`✓ Usuario: ${user.firstName} ${user.lastName} (${user.role})`);
    if (!user.active) {
      console.error(
        "✖ La cuenta está desactivada: no podrá iniciar sesión aunque cambie la contraseña."
      );
    }
    if (!user.emailVerified) {
      console.error(
        "✖ El correo no está confirmado. /api/forgot-password NO envía el " +
          "enlace en ese caso; el usuario primero debe confirmar su correo."
      );
      return;
    }

    // Mismo comportamiento que createToken(): un solo token vigente por tipo.
    await prisma.token.deleteMany({
      where: { userId: user.id, type: "PASSWORD_RESET" },
    });
    const token = randomBytes(32).toString("hex");
    await prisma.token.create({
      data: {
        token,
        type: "PASSWORD_RESET",
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    });
    await sendPasswordResetEmail(user.email, token);

    console.log("✓ Correo de recuperación enviado con un token real.");
    console.log(`  Enlace: ${appUrl}/reset-password?token=${token}`);
    console.log("  Caduca en 1 hora y solo se puede usar una vez.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
