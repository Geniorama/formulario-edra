import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AdvisorNewOrderForm,
  type ClientOption,
} from "@/components/forms/order/advisor-new-order-form";

export default async function AsesorNuevaOrdenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const rows = await prisma.user.findMany({
    where: { role: "CLIENTE", active: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const clients: ClientOption[] = rows.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/asesor/ordenes"
          className="inline-flex items-center gap-1 text-sm font-medium text-edra-grey hover:text-edra"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a órdenes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-edra-ink">
          Nueva orden para un cliente
        </h1>
        <p className="mt-1 text-sm text-edra-grey">
          Selecciona el cliente y registra los detalles de la joya.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-edra-grey/30 bg-white p-10 text-center text-sm text-edra-grey">
          No hay clientes registrados todavía.
        </div>
      ) : (
        <AdvisorNewOrderForm clients={clients} />
      )}
    </div>
  );
}
