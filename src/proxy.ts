import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// El middleware usa la config edge-safe (sin Prisma) para proteger rutas.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // La lógica de autorización vive en authConfig.callbacks.authorized.
  void req;
});

export const config = {
  // Excluye assets estáticos y archivos internos de Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
