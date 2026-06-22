import type { NextAuthConfig } from "next-auth";

// Configuración base "edge-safe": NO importa Prisma, bcrypt ni nada de Node.
// La usa el middleware para proteger rutas verificando solo el JWT.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isPrivate =
        path.startsWith("/dashboard") || path.startsWith("/admin");

      if (isPrivate) {
        // Rutas privadas: requieren sesión. El rol (p. ej. ADMIN) se valida
        // dentro de la página y de las APIs correspondientes.
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
