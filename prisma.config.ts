// Carga las variables de entorno para el CLI de Prisma.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // El CLI (migrate / db push) usa la conexión DIRECTA de Supabase (puerto 5432).
    // La app, en cambio, se conecta vía driver adapter con DATABASE_URL (pooled).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
