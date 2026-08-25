import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS } from "@/lib/form-options";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatOrderNumber,
  orderProductsLabel,
} from "@/lib/order-display";
import { OrdersSearch } from "@/components/admin/orders-search";
import { Pagination } from "@/components/admin/pagination";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 8;

export default async function MisOrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENTE") redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const digits = q.replace(/\D/g, "");
  const matchedProducts = q
    ? PRODUCTS.filter((p) =>
        p.label.toLowerCase().includes(q.toLowerCase())
      ).map((p) => p.value)
    : [];

  const where: Prisma.OrderWhereInput = {
    userId: session.user.id,
    ...(q
      ? {
          OR: [
            { workOrderCode: { contains: q, mode: "insensitive" } },
            ...(digits ? [{ number: parseInt(digits, 10) }] : []),
            ...(matchedProducts.length
              ? [{ items: { some: { product: { in: matchedProducts } } } }]
              : []),
          ],
        }
      : {}),
  };

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
        status: true,
        workOrderCode: true,
        createdAt: true,
        items: { select: { product: true }, orderBy: { position: "asc" } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-edra-ink">Mis órdenes</h1>
          <p className="mt-1 text-sm text-edra-grey">
            Consulta el estado de tus solicitudes y crea nuevas.
          </p>
        </div>
        <Link
          href="/mis-ordenes/nueva"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-edra px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-edra-dark"
        >
          <Plus className="h-4 w-4" />
          Nueva orden
        </Link>
      </div>

      <OrdersSearch initial={q} placeholder="Buscar por N.º, producto o código..." />

      {total === 0 ? (
        <div className="rounded-3xl border border-dashed border-edra-grey/30 bg-white p-10 text-center text-sm text-edra-grey">
          {q
            ? "No se encontraron órdenes para tu búsqueda."
            : "Aún no tienes órdenes. Crea tu primera solicitud."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/mis-ordenes/${o.id}`}
                className="group flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-edra">
                    {formatOrderNumber(o.number)}
                  </p>
                  <p className="font-semibold text-edra-ink">
                    {orderProductsLabel(o.items)}
                  </p>
                  <p className="mt-1 text-xs text-edra-grey">
                    {o.workOrderCode ? `Código: ${o.workOrderCode} · ` : ""}
                    Creada el {o.createdAt.toLocaleDateString("es-CO")}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[o.status]}`}
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-edra-grey/40 transition-colors group-hover:text-edra" />
              </Link>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            basePath="/mis-ordenes"
            params={{ q }}
          />
        </>
      )}
    </div>
  );
}
