import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS, labelOf } from "@/lib/form-options";
import { formatOrderNumber } from "@/lib/order-display";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { OrdersSearch } from "@/components/admin/orders-search";
import { Pagination } from "@/components/admin/pagination";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 10;

export default async function AsesorOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const digits = q.replace(/\D/g, "");
  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { workOrderCode: { contains: q, mode: "insensitive" } },
          { user: { firstName: { contains: q, mode: "insensitive" } } },
          { user: { lastName: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          ...(digits ? [{ number: parseInt(digits, 10) }] : []),
        ],
      }
    : {};

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        product: true,
        status: true,
        createdAt: true,
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        advisor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-edra-ink">Órdenes</h1>
          <p className="mt-1 text-sm text-edra-grey">
            Gestiona las solicitudes de los clientes y completa los datos técnicos.
          </p>
        </div>
        <Link
          href="/asesor/ordenes/nueva"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-edra px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-edra-dark"
        >
          <Plus className="h-4 w-4" />
          Nueva orden
        </Link>
      </div>

      <OrdersSearch initial={q} />

      {total === 0 ? (
        <div className="rounded-3xl border border-dashed border-edra-grey/30 bg-white p-10 text-center text-sm text-edra-grey">
          {q
            ? "No se encontraron órdenes para tu búsqueda."
            : "Aún no hay órdenes registradas."}
        </div>
      ) : (
        <>
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
                      <OrderStatusControl orderId={o.id} current={o.status} />
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

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            basePath="/asesor/ordenes"
            q={q}
          />
        </>
      )}
    </div>
  );
}
