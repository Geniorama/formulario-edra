// Migración de datos: el medio de pago "Freddy" se unifica en "Don Freddy".
// Ejecuta:  npm run db:migrate-don-freddy   (antes o después de `npm run db:push`).
//
// Es idempotente: puedes correrlo varias veces sin romper nada.
// "Freddy" ya no se ofrece en el formulario; las órdenes que lo tenían pasan a
// "Don Freddy" para que no pierdan el medio de pago al volver a guardarlas.
// (El valor FREDDY se conserva en el enum: quitarlo no aporta nada.)
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL en .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('→ Pasando las órdenes con medio de pago "Freddy" a "Don Freddy"');
  const { count } = await prisma.order.updateMany({
    where: { paymentMethod: "FREDDY" },
    data: { paymentMethod: "DON_FREDDY" },
  });
  console.log(`✔ Migración completada. Órdenes actualizadas: ${count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en la migración:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
