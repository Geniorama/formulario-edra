import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminCreateUserForm } from "@/components/forms/admin-create-user-form";
import {
  AdminUsersTable,
  type AdminUser,
} from "@/components/admin/admin-users-table";
import { UsersFilters } from "@/components/admin/users-filters";
import { roleEnum } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rol?: string; estado?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const rolRaw = (sp.rol ?? "").trim();
  const estado = (sp.estado ?? "").trim();

  const rol = roleEnum.safeParse(rolRaw);
  const filters: Prisma.UserWhereInput[] = [];

  if (q) {
    filters.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (rol.success) filters.push({ role: rol.data });
  if (estado === "ACTIVO") filters.push({ active: true, emailVerified: { not: null } });
  else if (estado === "PENDIENTE") filters.push({ active: true, emailVerified: null });
  else if (estado === "INACTIVO") filters.push({ active: false });

  const where: Prisma.UserWhereInput = filters.length ? { AND: filters } : {};
  const hasFilters = Boolean(q || rolRaw || estado);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      active: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  const users: AdminUser[] = rows.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    active: u.active,
    pending: !u.emailVerified,
    createdAtLabel: u.createdAt.toLocaleDateString("es-CO"),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-edra-ink">Usuarios</h1>
        <p className="mt-2 text-sm text-edra-grey">
          Crea usuarios de cualquier rol. Cada uno recibirá una invitación por
          correo para establecer su contraseña.
        </p>
      </div>

      {/* Crear usuario */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-edra-ink">
          Nuevo usuario
        </h2>
        <AdminCreateUserForm />
      </div>

      {/* Listado de usuarios */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-edra-ink">
          Usuarios ({users.length})
        </h2>
        <UsersFilters initial={{ q, rol: rolRaw, estado }} />
        {users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edra-grey/30 p-8 text-center text-sm text-edra-grey">
            {hasFilters
              ? "No se encontraron usuarios con esos filtros."
              : "Aún no hay usuarios registrados."}
          </p>
        ) : (
          <AdminUsersTable users={users} currentUserId={session.user.id} />
        )}
      </div>
    </div>
  );
}
