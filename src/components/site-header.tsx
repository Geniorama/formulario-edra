import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "./logo";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="w-full border-b border-black/5 bg-edra-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Inicio · Joyería Edra">
          <Logo className="h-16 sm:h-20" priority />
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              {session.user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="font-medium text-edra hover:text-edra-dark"
                >
                  Panel
                </Link>
              ) : null}
              <span className="hidden text-edra-grey sm:inline">
                Hola, {session.user.name?.split(" ")[0]}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-edra px-4 py-1.5 font-medium text-edra transition-colors hover:bg-edra hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-edra px-4 py-1.5 font-medium text-edra transition-colors hover:bg-edra hover:text-white"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
