import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPES, PRODUCTS, labelOf } from "@/lib/form-options";
import {
  ORDER_STATUS_LABELS,
  formatOrderNumber,
  formatMoney,
  formatDate,
  formatBirthDate,
  deliveryTypeLabel,
  invoiceTypeLabel,
  paymentMethodLabel,
} from "@/lib/order-display";
import { buildOrderPdf, type PdfSection } from "@/lib/order-pdf";
import { orderItemPdfSection } from "@/lib/order-pdf-item";

type Params = { params: Promise<{ id: string }> };

// Descarga la orden en PDF. La ve el staff (ASESOR/ADMIN) y el cliente dueño;
// los datos internos (pago, joyero, notas) solo se incluyen para el staff.
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const isStaff =
    session.user.role === "ASESOR" || session.user.role === "ADMIN";

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    omit: { depositReceiptData: true },
    include: {
      items: { orderBy: { position: "asc" } },
      user: { include: { clientProfile: true } },
      advisor: { select: { firstName: true, lastName: true } },
    },
  });
  if (!order || (!isStaff && order.userId !== session.user.id)) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const { user } = order;
  const profile = user.clientProfile;
  const text = (v?: string | null) => v?.trim() || "—";

  const sections: PdfSection[] = [
    {
      title: "Datos de la orden",
      rows: [
        ["N.º de orden", formatOrderNumber(order.number)],
        ["Código de orden de trabajo", order.workOrderCode ?? "Pendiente"],
        ["Estado", ORDER_STATUS_LABELS[order.status]],
        ["Fecha de creación", formatDate(order.createdAt)],
        [
          "Asesor",
          order.advisor
            ? `${order.advisor.firstName} ${order.advisor.lastName}`
            : "Sin asignar",
        ],
      ],
    },
    {
      title: "Cliente",
      rows: [
        ["Nombre", `${user.firstName} ${user.lastName}`],
        ["Correo", user.email],
        ...(profile
          ? ([
              [
                "Documento",
                `${labelOf(DOCUMENT_TYPES, profile.documentType)} ${profile.documentNumber ?? ""}`.trim(),
              ],
              ["WhatsApp", text(profile.whatsapp)],
              ["Fecha de cumpleaños", formatBirthDate(profile.birthDate)],
              ["País de envío", text(profile.shippingCountry)],
              ["Ciudad o estado", text(profile.cityState)],
              ["Código postal", text(profile.postalCode)],
              ["Dirección", text(profile.address)],
              ["Barrio", text(profile.neighborhood)],
              ["Especificaciones de la dirección", text(profile.addressDetails)],
            ] as [string, string][])
          : []),
      ],
    },
  ];

  order.items.forEach((item, index) => {
    sections.push(
      orderItemPdfSection(
        item,
        order.items.length > 1
          ? `Producto ${index + 1}: ${labelOf(PRODUCTS, item.product)}`
          : "Producto"
      )
    );
  });

  const pending = (v: string) => (v === "—" ? "Pendiente" : v);
  sections.push({
    title: "Resumen de compra",
    withImage: true,
    rows: [
      ...(isStaff
        ? ([
            ["Fecha de venta", pending(formatDate(order.saleDate))],
            [
              "Fecha de entrega del joyero",
              pending(formatDate(order.jewelerDeliveryDate)),
            ],
          ] as [string, string][])
        : []),
      ["Lugar de entrega", pending(deliveryTypeLabel(order.deliveryType))],
      [
        "Fecha de entrega o envío",
        order.deliveryFrom || order.deliveryTo
          ? `${formatDate(order.deliveryFrom)} - ${formatDate(order.deliveryTo)}`
          : "Pendiente",
      ],
      ["Valor compra", pending(formatMoney(order.purchaseValue))],
      ["Valor envío", pending(formatMoney(order.shippingValue))],
      ["Valor abono", pending(formatMoney(order.depositValue))],
      ["Saldo con envío", pending(formatMoney(order.balanceWithShipping))],
      ["Facturación", pending(invoiceTypeLabel(order.invoiceType))],
      ...(isStaff
        ? ([
            [
              "Medio de pago",
              pending(
                paymentMethodLabel(order.paymentMethod, order.paymentMethodOther)
              ),
            ],
            ["Joyero fabricante", text(order.jeweler)],
          ] as [string, string][])
        : []),
    ],
  });

  if (isStaff) {
    const notes: [string, string][] = [];
    if (order.manufacturingNotes) {
      notes.push(["Observaciones de fabricación", order.manufacturingNotes]);
    }
    if (order.internalNotes) {
      notes.push(["Notas adicionales (uso interno)", order.internalNotes]);
    }
    sections.push({ title: "Observaciones", rows: notes });
  }

  const number = formatOrderNumber(order.number);
  const pdf = await buildOrderPdf({
    orderNumber: number,
    subtitle: `Generada el ${formatDate(new Date())}`,
    sections,
    image: order.projectImageData
      ? { data: order.projectImageData, type: order.projectImageType }
      : null,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
