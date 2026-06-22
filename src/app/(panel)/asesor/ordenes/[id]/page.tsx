import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  PRODUCTS,
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  labelOf,
} from "@/lib/form-options";
import {
  fieldsForProduct,
  ORDER_FIELD_META,
  advisorFieldsForProduct,
} from "@/lib/product-fields";
import { orderFieldDisplay } from "@/lib/order-utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatOrderNumber,
  toDateInput,
} from "@/lib/order-display";
import { AdvisorOrderForm } from "@/components/forms/order/advisor-order-form";

export default async function AsesorOrdenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ASESOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: { include: { clientProfile: true } } },
  });
  if (!order) notFound();

  const { user } = order;
  const profile = user.clientProfile;
  const productValue = order.product ?? "";

  const view = {
    product: productValue,
    size: order.size ?? "",
    sizeLady: order.sizeLady ?? "",
    sizeGentleman: order.sizeGentleman ?? "",
    material: order.material ?? "",
    gemType: order.gemType ?? "",
    engraving: order.engraving ?? "",
    engravingLady: order.engravingLady ?? "",
    engravingGentleman: order.engravingGentleman ?? "",
    fontType: order.fontType ?? "",
  };

  const advisorFieldValues: Record<string, string> = {};
  for (const k of advisorFieldsForProduct(productValue)) {
    advisorFieldValues[k] = (order[k as keyof typeof order] as string) ?? "";
  }

  const finalValues: Record<string, string> = {
    saleDate: toDateInput(order.saleDate),
    deliveryFrom: toDateInput(order.deliveryFrom),
    deliveryTo: toDateInput(order.deliveryTo),
    jewelerDeliveryDate: toDateInput(order.jewelerDeliveryDate),
    estimatedDeliveryDate: toDateInput(order.estimatedDeliveryDate),
    purchaseValue: order.purchaseValue?.toString() ?? "",
    depositValue: order.depositValue?.toString() ?? "",
    shippingValue: order.shippingValue?.toString() ?? "",
    balanceWithShipping: order.balanceWithShipping?.toString() ?? "",
    depositReceiptUrl: order.depositReceiptUrl ?? "",
    deliveryType: order.deliveryType ?? "",
    paymentMethod: order.paymentMethod ?? "",
    jeweler: order.jeweler ?? "",
    finalDescription: order.finalDescription ?? "",
    internalNotes: order.internalNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/asesor/ordenes"
          className="inline-flex items-center gap-1 text-sm font-medium text-edra-grey hover:text-edra"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a órdenes
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-sm font-semibold text-edra">
              {formatOrderNumber(order.number)}
            </span>
            <h1 className="text-2xl font-semibold text-edra-ink">
              {labelOf(PRODUCTS, order.product)}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_STYLES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Cliente
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Row label="Nombre" value={`${user.firstName} ${user.lastName}`} />
          <Row label="Correo" value={user.email} />
          {profile ? (
            <>
              <Row
                label="Documento"
                value={`${labelOf(DOCUMENT_TYPES, profile.documentType)} ${profile.documentNumber ?? ""}`}
              />
              <Row label="WhatsApp" value={profile.whatsapp ?? "—"} />
              <Row
                label="Medio de contacto"
                value={labelOf(CONTACT_MEDIUMS, profile.contactMedium)}
              />
              {profile.contactMedium === "RED_SOCIAL" ? (
                <Row
                  label={labelOf(SOCIAL_NETWORKS, profile.socialNetwork)}
                  value={profile.socialLink ?? "—"}
                />
              ) : null}
              <Row label="País de envío" value={profile.shippingCountry ?? "—"} />
              <Row label="Ciudad o estado" value={profile.cityState ?? "—"} />
              <Row label="Código postal" value={profile.postalCode ?? "—"} />
              <Row label="Dirección" value={profile.address ?? "—"} />
            </>
          ) : null}
        </dl>
      </div>

      {/* Solicitud del cliente */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Solicitud del cliente
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Row label="Producto" value={labelOf(PRODUCTS, order.product)} />
          {fieldsForProduct(productValue).map((key) => (
            <Row
              key={key}
              label={ORDER_FIELD_META[key].label}
              value={orderFieldDisplay(view, key)}
            />
          ))}
        </dl>
      </div>

      {/* Formulario del asesor */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Gestión del asesor
        </h2>
        <AdvisorOrderForm
          orderId={order.id}
          product={productValue}
          initial={{
            workOrderCode: order.workOrderCode ?? "",
            status: order.status,
            fields: advisorFieldValues,
            final: finalValues,
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 text-sm last:border-0">
      <dt className="text-edra-grey">{label}</dt>
      <dd className="text-right font-medium text-edra-ink">{value}</dd>
    </div>
  );
}
