// Migración de datos para los nuevos medios de pago.
// Ejecuta:  npm run db:migrate-medios-pago   (antes de `npm run db:push`).
//
// Es idempotente: puedes correrlo varias veces sin romper nada.
//   1. Agrega los nuevos valores al enum PaymentMethod (Con FE / Sin FE).
//   2. Agrega la columna "paymentMethodOther" (texto libre de la opción Otro).
//
// TARJETA_CREDITO, TARJETA_DEBITO y TRANSFERENCIA ya no se ofrecen en el
// formulario, pero se conservan en el enum para no romper órdenes antiguas.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL en .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Nuevos valores, en el mismo orden que en schema.prisma.
const NEW_PAYMENT_METHODS = [
  "BANCOLOMBIA_EDUARDO",
  "DAVIVIENDA_EDUARDO",
  "DATAFONO_EDUARDO",
  "WESTERN_WEENDY",
  "BANCOLOMBIA_WEENDY",
  "DATAFONO_ROJO",
  "NEQUI_SANTIAGO",
  "NEQUI_DON_MAURO",
  "ESTABAN_CLAUDIA_JM",
  "HECTOR_NARANJO",
  "DAVIVIENDA_ERIKA",
  "SUSA",
  "LUZ",
  "JIMMY",
  "FREDDY",
  "DON_FREDDY",
  "OTRO",
];

async function main() {
  // 1. Valores nuevos del enum (ADD VALUE IF NOT EXISTS ya es idempotente).
  console.log("→ Agregando los nuevos medios de pago al enum PaymentMethod");
  for (const value of NEW_PAYMENT_METHODS) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS '${value}'`
    );
  }

  // 2. Texto libre para la opción "Otro".
  console.log("→ Agregando la columna paymentMethodOther a orders");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethodOther" TEXT`
  );

  console.log("✔ Migración completada. Ahora corre: npm run db:push");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en la migración:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
