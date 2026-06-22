import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/order-display";
import { PRODUCTS, labelOf } from "@/lib/form-options";

/** Notifica a todos los admins y asesores activos que se creó una orden. */
export async function notifyStaffNewOrder(params: {
  orderId: string;
  number: number;
  product: string | null;
  clientName: string;
}) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ASESOR"] }, active: true },
    select: { id: true },
  });
  if (staff.length === 0) return;

  const productLabel = labelOf(PRODUCTS, params.product);
  await prisma.notification.createMany({
    data: staff.map((s) => ({
      userId: s.id,
      type: "ORDER_CREATED" as const,
      title: `Nueva orden ${formatOrderNumber(params.number)}`,
      body: `${params.clientName} creó una solicitud de ${productLabel}.`,
      link: `/asesor/ordenes/${params.orderId}`,
    })),
  });
}

/** Notifica al cliente que su asesor le creó una orden. */
export async function notifyClientNewOrder(params: {
  orderId: string;
  number: number;
  clientId: string;
  product: string | null;
}) {
  const productLabel = labelOf(PRODUCTS, params.product);
  await prisma.notification.create({
    data: {
      userId: params.clientId,
      type: "ORDER_CREATED",
      title: `Se creó tu orden ${formatOrderNumber(params.number)}`,
      body: `Tu asesor registró una solicitud de ${productLabel}.`,
      link: `/mis-ordenes/${params.orderId}`,
    },
  });
}

/** Notifica al cliente que su orden cambió de estado. */
export async function notifyClientStatusChange(params: {
  orderId: string;
  number: number;
  clientId: string;
  statusLabel: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.clientId,
      type: "ORDER_STATUS_CHANGED",
      title: `Tu orden ${formatOrderNumber(params.number)} cambió de estado`,
      body: `Nuevo estado: ${params.statusLabel}.`,
      link: `/mis-ordenes/${params.orderId}`,
    },
  });
}
