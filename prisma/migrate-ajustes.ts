// Migración de datos para los ajustes de agosto 2026.
// Ejecuta:  npm run db:migrate-ajustes   (antes de `npm run db:push`).
//
// Es idempotente: puedes correrlo varias veces sin romper nada.
//   1. Renombra/añade los estados de OrderStatus conservando las órdenes.
//   2. Crea el enum InvoiceType y la columna "invoiceType" (Con FE / Sin FE).
//   3. Añade las columnas del comprobante de abono (archivo adjunto).
//   4. Elimina "estimatedDeliveryDate" y el antiguo "depositReceiptUrl".
//   5. Recalcula "balanceWithShipping" = compra - abono + envío.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL en .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function enumHasValue(typeName: string, value: string) {
  const rows = await prisma.$queryRawUnsafe<{ ok: number }[]>(
    `SELECT 1 AS ok FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1 AND e.enumlabel = $2`,
    typeName,
    value
  );
  return rows.length > 0;
}

async function run(label: string, statements: string[]) {
  console.log(`→ ${label}`);
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
}

async function main() {
  // 1. Estados: PENDIENTE→EN_TRAMITE, EN_PROCESO→EN_FABRICACION, CANCELADO→DESISTIDO
  if (await enumHasValue("OrderStatus", "PENDIENTE")) {
    await run("Actualizando los estados de las órdenes", [
      `CREATE TYPE "OrderStatus_new" AS ENUM (
         'EN_TRAMITE','EN_FABRICACION','ENGASTE','NOVEDAD_FABRICACION',
         'FINALIZADO','ENTREGADO','DESISTIDO')`,
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new"
         USING (CASE "status"::text
                  WHEN 'PENDIENTE'  THEN 'EN_TRAMITE'
                  WHEN 'EN_PROCESO' THEN 'EN_FABRICACION'
                  WHEN 'CANCELADO'  THEN 'DESISTIDO'
                  ELSE "status"::text
                END)::"OrderStatus_new"`,
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'EN_TRAMITE'`,
      `DROP TYPE "OrderStatus"`,
      `ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus"`,
    ]);
  } else {
    console.log("• Los estados ya estaban actualizados.");
  }

  // 2. Facturación electrónica (Con FE / Sin FE)
  const invoiceTypeExists = await prisma.$queryRawUnsafe<{ ok: number }[]>(
    `SELECT 1 AS ok FROM pg_type WHERE typname = 'InvoiceType'`
  );
  if (invoiceTypeExists.length === 0) {
    await run("Creando el enum InvoiceType", [
      `CREATE TYPE "InvoiceType" AS ENUM ('CON_FE','SIN_FE')`,
    ]);
  }

  // 3 y 4. Columnas nuevas / obsoletas
  await run("Ajustando las columnas de la tabla orders", [
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceType" "InvoiceType"`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositReceiptName" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositReceiptType" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositReceiptSize" INTEGER`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositReceiptData" BYTEA`,
    `ALTER TABLE "orders" DROP COLUMN IF EXISTS "estimatedDeliveryDate"`,
    `ALTER TABLE "orders" DROP COLUMN IF EXISTS "depositReceiptUrl"`,
  ]);

  // 5. Saldo con envío = valor compra - valor abono + valor envío
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "orders"
        SET "balanceWithShipping" =
              COALESCE("purchaseValue", 0)
            - COALESCE("depositValue", 0)
            + COALESCE("shippingValue", 0)
      WHERE "purchaseValue" IS NOT NULL
         OR "depositValue" IS NOT NULL
         OR "shippingValue" IS NOT NULL`
  );
  console.log(`→ Saldo con envío recalculado en ${updated} orden(es).`);

  console.log("✔ Migración completada. Ahora corre: npm run db:push");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en la migración:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
