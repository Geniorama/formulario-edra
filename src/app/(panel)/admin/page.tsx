import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminCreateUserForm } from "@/components/forms/admin-create-user-form";
import {
  AdminUsersTable,
  type AdminUser,
} from "@/components/admin/admin-users-table";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const rows = await prisma.user.findMany({
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
        <AdminUsersTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
