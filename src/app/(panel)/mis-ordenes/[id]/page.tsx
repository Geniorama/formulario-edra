import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS, labelOf } from "@/lib/form-options";
import {
  fieldsForProduct,
  ORDER_FIELD_META,
  advisorFieldsForProduct,
  ADVISOR_FIELD_META,
} from "@/lib/product-fields";
import { orderFieldDisplay, type OrderItemState } from "@/lib/order-utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatOrderNumber,
  formatMoney,
  formatDate,
  deliveryTypeLabel,
  invoiceTypeLabel,
  orderProductsLabel,
} from "@/lib/order-display";

const s = (v?: string | null) => v ?? "";

export default async function OrdenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENTE") redirect("/dashboard");

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    // El archivo del comprobante se descarga aparte (no se trae en la página).
    omit: { depositReceiptData: true },
    include: {
      items: { orderBy: { position: "asc" } },
      advisor: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
    },
  });
  if (!order) notFound();

  const items = order.items.map((item) => ({
    id: item.id,
    view: {
      product: s(item.product),
      size: s(item.size),
      sizeLady: s(item.sizeLady),
      sizeGentleman: s(item.sizeGentleman),
      material: s(item.material),
      gemType: s(item.gemType),
      gemOther: s(item.gemOther),
      engraving: s(item.engraving),
      engravingLady: s(item.engravingLady),
      engravingGentleman: s(item.engravingGentleman),
      fontType: s(item.fontType),
    } satisfies OrderItemState,
    advisor: item,
  }));

  const multiple = items.length > 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/mis-ordenes"
          className="inline-flex items-center gap-1 text-sm font-medium text-edra-grey hover:text-edra"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis órdenes
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-sm font-semibold text-edra">
              {formatOrderNumber(order.number)}
            </span>
            <h1 className="text-2xl font-semibold text-edra-ink">
              {orderProductsLabel(order.items, true)}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-edra-grey">
          <span>
            Código de orden:{" "}
            {order.workOrderCode ? (
              <span className="font-medium text-edra-ink">
                {order.workOrderCode}
              </span>
            ) : (
              <span className="text-edra-grey/60">Pendiente</span>
            )}
          </span>
          <span>Creada el {order.createdAt.toLocaleDateString("es-CO")}</span>
        </p>
      </div>

      {/* Solicitud del cliente: un bloque por producto de la compra */}
      {items.map(({ id: itemId, view }, index) => (
        <div
          key={itemId}
          className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8"
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
            {multiple ? `Producto ${index + 1}` : "Tu solicitud"}
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <Row label="Producto" value={labelOf(PRODUCTS, view.product)} />
            {fieldsForProduct(view.product).map((key) => (
              <Row
                key={key}
                label={ORDER_FIELD_META[key].label}
                value={orderFieldDisplay(view, key)}
              />
            ))}
          </dl>
        </div>
      ))}

      {/* Datos de contacto del asesor */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Tu asesor
        </h2>
        {order.advisor ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <Row
              label="Nombre"
              value={`${order.advisor.firstName} ${order.advisor.lastName}`}
            />
            <Row label="Correo" value={order.advisor.email} />
            <Row label="Teléfono" value={order.advisor.phone ?? "—"} />
          </dl>
        ) : (
          <p className="text-sm text-edra-grey">
            Aún no se ha asignado un asesor a esta orden. Pronto te
            contactaremos.
          </p>
        )}
      </div>

      {/* Resumen de compra (datos finales que ve el cliente) */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Resumen de compra
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Row
            label="Lugar de entrega"
            value={deliveryTypeLabel(order.deliveryType)}
            muted={!order.deliveryType}
          />
          <Row
            label="Fecha de entrega o envío"
            value={
              order.deliveryFrom || order.deliveryTo
                ? `${formatDate(order.deliveryFrom)} – ${formatDate(order.deliveryTo)}`
                : "Pendiente"
            }
            muted={!order.deliveryFrom && !order.deliveryTo}
          />
          <Row
            label="Valor compra"
            value={formatMoney(order.purchaseValue)}
            muted={order.purchaseValue == null}
          />
          <Row
            label="Valor envío"
            value={formatMoney(order.shippingValue)}
            muted={order.shippingValue == null}
          />
          <Row
            label="Valor abono"
            value={formatMoney(order.depositValue)}
            muted={order.depositValue == null}
          />
          <Row
            label="Saldo con envío"
            value={formatMoney(order.balanceWithShipping)}
            muted={order.balanceWithShipping == null}
          />
          <Row
            label="Facturación"
            value={order.invoiceType ? invoiceTypeLabel(order.invoiceType) : "Pendiente"}
            muted={!order.invoiceType}
          />
        </dl>

        {order.depositReceiptName ? (
          <a
            href={`/api/asesor/ordenes/${order.id}/comprobante`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-edra hover:text-edra-dark"
          >
            Ver comprobante de abono
          </a>
        ) : null}
      </div>

      {/* Datos técnicos del asesor (solo lectura), por producto */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Información del asesor
        </h2>
        <div className="space-y-5">
          {items.map(({ id: itemId, view, advisor }, index) => {
            const advisorKeys = advisorFieldsForProduct(view.product);
            const pending = advisorKeys.every(
              (k) => !advisor[k as keyof typeof advisor]
            );
            return (
              <div key={itemId}>
                {multiple ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-edra-grey/80">
                    Producto {index + 1} · {labelOf(PRODUCTS, view.product)}
                  </p>
                ) : null}
                {pending ? (
                  <p className="mb-3 text-sm text-edra-grey">
                    Tu asesor aún no ha diligenciado estos campos. Aquí verás
                    los detalles técnicos cuando estén listos.
                  </p>
                ) : null}
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {advisorKeys.map((k) => {
                    const value = advisor[k as keyof typeof advisor];
                    return (
                      <Row
                        key={k}
                        label={ADVISOR_FIELD_META[k].label}
                        value={
                          typeof value === "string" && value ? value : "Pendiente"
                        }
                        muted={!value}
                      />
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 text-sm last:border-0">
      <dt className="text-edra-grey">{label}</dt>
      <dd
        className={`text-right font-medium ${muted ? "text-edra-grey/60" : "text-edra-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
