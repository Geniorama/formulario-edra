import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS, labelOf } from "@/lib/form-options";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatOrderNumber,
} from "@/lib/order-display";

export default async function AsesorOrdenesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      product: true,
      status: true,
      workOrderCode: true,
      createdAt: true,
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      advisor: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-edra-ink">Órdenes</h1>
        <p className="mt-1 text-sm text-edra-grey">
          Gestiona las solicitudes de los clientes y completa los datos técnicos.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-edra-grey/30 bg-white p-10 text-center text-sm text-edra-grey">
          Aún no hay órdenes registradas.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_rgba(20,150,166,0.10)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edra-grey/15 text-xs uppercase tracking-wide text-edra-grey">
                <th className="p-4 font-medium">N.º</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Producto</th>
                <th className="p-4 font-medium">Asesor</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-edra-grey/10 last:border-0 hover:bg-edra-bg/40"
                >
                  <td className="p-4 font-mono text-xs font-semibold text-edra">
                    {formatOrderNumber(o.number)}
                  </td>
                  <td className="p-4">
                    <span className="text-edra-ink">
                      {o.user.firstName} {o.user.lastName}
                    </span>
                    <span className="block text-xs text-edra-grey">
                      {o.user.email}
                    </span>
                    {o.user.phone ? (
                      <span className="block text-xs text-edra-grey">
                        {o.user.phone}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-4 text-edra-grey">
                    {labelOf(PRODUCTS, o.product)}
                  </td>
                  <td className="p-4">
                    {o.advisor ? (
                      <span className="text-edra-ink">
                        {o.advisor.firstName} {o.advisor.lastName}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600">
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[o.status]}`}
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/asesor/ordenes/${o.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-edra hover:text-edra-dark"
                    >
                      Abrir
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
