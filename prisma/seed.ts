// Seed: crea un usuario ADMIN de prueba.
// Ejecuta:  npm run db:seed   (requiere haber corrido antes `npm run db:push`).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL en .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Credenciales del admin de prueba (cámbialas en producción).
const ADMIN_EMAIL = "admin@joyeriaedra.com";
const ADMIN_PASSWORD = "Admin1234*";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN", emailVerified: new Date() },
    create: {
      firstName: "Admin",
      lastName: "Edra",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(), // ya confirmado: puede iniciar sesión enseguida
    },
  });

  console.log("✔ Admin de prueba listo:");
  console.log(`   Correo:     ${admin.email}`);
  console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
  console.log(`   Rol:        ${admin.role}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error al crear el admin:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
