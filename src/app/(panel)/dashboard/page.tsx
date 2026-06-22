import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { navForRole } from "@/lib/navigation";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  // Módulos disponibles (sin "Inicio"), derivados de la config central.
  const modules = navForRole(role).filter((m) => m.href !== "/dashboard");

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="rounded-3xl bg-gradient-to-br from-edra to-edra-dark p-8 text-white shadow-[0_10px_40px_rgba(20,150,166,0.25)]">
        <p className="text-sm font-medium uppercase tracking-wider text-white/70">
          {role ? ROLE_LABELS[role] : "Bienvenido"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          Hola, {firstName} 👋
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Este es tu panel de Joyería Edra. Desde aquí gestionarás tus módulos y
          actividades. Iremos sumando nuevas herramientas próximamente.
        </p>
      </div>

      {/* Módulos */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Tus módulos
        </h2>

        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edra-grey/30 bg-white p-8 text-center text-sm text-edra-grey">
            Aún no tienes módulos asignados. Pronto habilitaremos nuevas
            secciones para tu rol.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-edra-soft text-edra">
                      <Icon className="h-6 w-6" />
                    </span>
                    <ArrowRight className="h-5 w-5 text-edra-grey/40 transition-colors group-hover:text-edra" />
                  </div>
                  <h3 className="mt-4 font-semibold text-edra-ink">{m.label}</h3>
                  {m.description ? (
                    <p className="mt-1 text-sm text-edra-grey">
                      {m.description}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
