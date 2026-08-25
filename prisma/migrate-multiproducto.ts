// Migración de datos: varios productos por compra + ajustes de agosto 2026.
// Ejecuta:  npm run db:migrate-multiproducto   (ANTES de `npm run db:push`).
//
// Es idempotente: puedes correrlo varias veces sin romper nada.
//   1. Agrega "neighborhood" y "addressDetails" a client_profiles (barrio y
//      especificaciones de la dirección).
//   2. Crea la tabla "order_items" (los productos de cada compra).
//   3. Copia los datos por producto de "orders" a "order_items" (una fila por
//      orden existente), incluyendo los campos técnicos del asesor.
//   4. Materiales: agrega "Oro 18k + plata" y "Platino 950", y elimina
//      "Oro 22k"/"Oro 24k" reasignando esas órdenes a "Oro 18k".
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL en .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<{ ok: number }[]>(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2`,
    table,
    column
  );
  return rows.length > 0;
}

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

// Campos que pasan de "orders" a "order_items" (mismo nombre en ambas tablas).
const ITEM_COLUMNS = [
  "product",
  "size",
  "sizeLady",
  "sizeGentleman",
  "material",
  "gemType",
  "engraving",
  "engravingLady",
  "engravingGentleman",
  "fontType",
  "weightApprox",
  "weightLady",
  "weightGentleman",
  "widthLady",
  "widthGentleman",
  "model",
  "weaveType",
  "length",
  "productName",
  "productDescription",
  "gemNotes",
  "finalDescription",
] as const;

async function main() {
  // 1. Datos personales: barrio y especificaciones de la dirección.
  await run("Agregando barrio y especificaciones de la dirección", [
    `ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT`,
    `ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "addressDetails" TEXT`,
  ]);

  // 2. Tabla de productos de la compra.
  await run("Creando la tabla order_items", [
    `CREATE TABLE IF NOT EXISTS "order_items" (
       "id"                 TEXT NOT NULL,
       "orderId"            TEXT NOT NULL,
       "position"           INTEGER NOT NULL DEFAULT 0,
       "product"            "Product",
       "size"               TEXT,
       "sizeLady"           TEXT,
       "sizeGentleman"      TEXT,
       "material"           "Material",
       "gemType"            "GemType",
       "gemOther"           TEXT,
       "engraving"          TEXT,
       "engravingLady"      TEXT,
       "engravingGentleman" TEXT,
       "fontType"           TEXT,
       "weightApprox"       TEXT,
       "weightLady"         TEXT,
       "weightGentleman"    TEXT,
       "widthLady"          TEXT,
       "widthGentleman"     TEXT,
       "model"              TEXT,
       "weaveType"          TEXT,
       "length"             TEXT,
       "productName"        TEXT,
       "productDescription" TEXT,
       "gemNotes"           TEXT,
       "finalDescription"   TEXT,
       "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
     )`,
    `CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId")`,
    `DO $$ BEGIN
       ALTER TABLE "order_items"
         ADD CONSTRAINT "order_items_orderId_fkey"
         FOREIGN KEY ("orderId") REFERENCES "orders"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ]);

  // 3. Copia de los datos por producto: una fila por orden existente.
  if (await columnExists("orders", "product")) {
    const cols = ITEM_COLUMNS.map((c) => `"${c}"`).join(", ");
    const src = ITEM_COLUMNS.map((c) => `o."${c}"`).join(", ");
    const copied = await prisma.$executeRawUnsafe(
      `INSERT INTO "order_items" ("id", "orderId", "position", ${cols})
       SELECT gen_random_uuid()::text, o."id", 0, ${src}
         FROM "orders" o
        WHERE NOT EXISTS (
          SELECT 1 FROM "order_items" i WHERE i."orderId" = o."id"
        )`
    );
    console.log(`→ ${copied} orden(es) convertidas al formato multiproducto.`);
  } else {
    console.log("• Las órdenes ya estaban en formato multiproducto.");
  }

  // 4. Materiales: nuevas opciones y baja de Oro 22k / Oro 24k.
  if (await enumHasValue("Material", "ORO_22K")) {
    const affected = await prisma.$queryRawUnsafe<{ number: number }[]>(
      `SELECT DISTINCT o."number"
         FROM "orders" o
         JOIN "order_items" i ON i."orderId" = o."id"
        WHERE i."material"::text IN ('ORO_22K', 'ORO_24K')
        ORDER BY o."number"`
    );
    if (affected.length > 0) {
      console.warn(
        `⚠ ${affected.length} orden(es) usaban Oro 22k/24k y pasan a Oro 18k: ` +
          affected.map((a) => a.number).join(", ")
      );
    }

    // Se recrea el tipo con la lista definitiva de materiales.
    const alterOrders = (await columnExists("orders", "material"))
      ? [
          `ALTER TABLE "orders" ALTER COLUMN "material" TYPE "Material_new"
             USING (CASE "material"::text
                      WHEN 'ORO_22K' THEN 'ORO_18K'
                      WHEN 'ORO_24K' THEN 'ORO_18K'
                      ELSE "material"::text
                    END)::"Material_new"`,
        ]
      : [];

    await run("Actualizando la lista de materiales", [
      `CREATE TYPE "Material_new" AS ENUM (
         'ORO_10K','ORO_14K','ORO_18K','ORO_18K_PLATA',
         'PLATA_925','PLATA_950','PLATINO_950')`,
      `ALTER TABLE "order_items" ALTER COLUMN "material" TYPE "Material_new"
         USING (CASE "material"::text
                  WHEN 'ORO_22K' THEN 'ORO_18K'
                  WHEN 'ORO_24K' THEN 'ORO_18K'
                  ELSE "material"::text
                END)::"Material_new"`,
      ...alterOrders,
      `DROP TYPE "Material"`,
      `ALTER TYPE "Material_new" RENAME TO "Material"`,
    ]);
  } else {
    console.log("• La lista de materiales ya estaba actualizada.");
  }

  console.log("✔ Migración completada. Ahora corre: npm run db:push");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en la migración:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
