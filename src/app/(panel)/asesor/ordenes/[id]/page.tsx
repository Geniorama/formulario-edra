import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  labelOf,
} from "@/lib/form-options";
import { ADVISOR_ITEM_KEYS } from "@/lib/product-fields";
import type { OrderItemState } from "@/lib/order-utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatOrderNumber,
  orderProductsLabel,
  toDateInput,
} from "@/lib/order-display";
import {
  AdvisorOrderForm,
  type AdvisorItemState,
} from "@/components/forms/order/advisor-order-form";

const s = (v?: string | null) => v ?? "";

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
    // El archivo del comprobante se descarga aparte (no se trae en la página).
    omit: { depositReceiptData: true },
    include: {
      items: { orderBy: { position: "asc" } },
      user: { include: { clientProfile: true } },
    },
  });
  if (!order) notFound();

  const { user } = order;
  const profile = user.clientProfile;
  const isAdmin = session.user.role === "ADMIN";

  const items: AdvisorItemState[] = order.items.map((item) => {
    const fields: Record<string, string> = {};
    for (const key of ADVISOR_ITEM_KEYS) {
      fields[key] = s(item[key as keyof typeof item] as string | null);
    }
    return {
      id: item.id,
      client: {
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
      fields,
    };
  });

  const finalValues: Record<string, string> = {
    saleDate: toDateInput(order.saleDate),
    jewelerDeliveryDate: toDateInput(order.jewelerDeliveryDate),
    deliveryFrom: toDateInput(order.deliveryFrom),
    deliveryTo: toDateInput(order.deliveryTo),
    purchaseValue: order.purchaseValue?.toString() ?? "",
    depositValue: order.depositValue?.toString() ?? "",
    shippingValue: order.shippingValue?.toString() ?? "",
    deliveryType: order.deliveryType ?? "",
    paymentMethod: order.paymentMethod ?? "",
    invoiceType: order.invoiceType ?? "",
    jeweler: order.jeweler ?? "",
    internalNotes: order.internalNotes ?? "",
  };

  // Solo el admin puede reasignar el asesor: cargamos las opciones.
  const advisors = isAdmin
    ? (
        await prisma.user.findMany({
          where: { role: { in: ["ASESOR", "ADMIN"] }, active: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      ).map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))
    : [];

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
              {orderProductsLabel(order.items, true)}
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
              <Row label="Barrio" value={profile.neighborhood ?? "—"} />
              <Row
                label="Especificaciones de la dirección"
                value={profile.addressDetails ?? "—"}
              />
            </>
          ) : null}
        </dl>
      </div>

      {/* Formulario del asesor (la solicitud del cliente va dentro, por producto) */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-edra-grey">
          {isAdmin ? "Gestión de la orden" : "Gestión del asesor"}
        </h2>
        <AdvisorOrderForm
          orderId={order.id}
          canEditClient={isAdmin}
          advisors={advisors}
          initial={{
            workOrderCode: order.workOrderCode ?? "",
            status: order.status,
            advisorId: order.advisorId ?? "",
            items,
            manufacturingNotes: order.manufacturingNotes ?? "",
            final: finalValues,
            receipt: order.depositReceiptName
              ? {
                  name: order.depositReceiptName,
                  size: order.depositReceiptSize,
                }
              : null,
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
