import { prisma } from "@/lib/prisma";
import { formatOrderNumber, orderProductsLabel } from "@/lib/order-display";

type OrderProducts = { product: string | null }[];

/** Notifica a todos los admins y asesores activos que se creó una orden. */
export async function notifyStaffNewOrder(params: {
  orderId: string;
  number: number;
  items: OrderProducts;
  clientName: string;
}) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ASESOR"] }, active: true },
    select: { id: true },
  });
  if (staff.length === 0) return;

  const productLabel = orderProductsLabel(params.items, true);
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
  items: OrderProducts;
}) {
  const productLabel = orderProductsLabel(params.items, true);
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

/**
 * Notifica el cambio de estado al asesor de la orden (nunca al cliente).
 * Si la orden aún no tiene asesor, avisa a todos los asesores/admins activos.
 * Devuelve los destinatarios (para el envío de correo).
 */
export async function notifyAdvisorStatusChange(params: {
  orderId: string;
  number: number;
  advisorId: string | null;
  actorId: string;
  statusLabel: string;
}) {
  const recipients = params.advisorId
    ? await prisma.user.findMany({
        where: { id: params.advisorId, active: true },
        select: { id: true, email: true },
      })
    : await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "ASESOR"] }, active: true },
        select: { id: true, email: true },
      });

  // Quien realiza el cambio no necesita que le avisen de su propia acción.
  const targets = recipients.filter((r) => r.id !== params.actorId);
  if (targets.length === 0) return [];

  await prisma.notification.createMany({
    data: targets.map((t) => ({
      userId: t.id,
      type: "ORDER_STATUS_CHANGED" as const,
      title: `La orden ${formatOrderNumber(params.number)} cambió de estado`,
      body: `Nuevo estado: ${params.statusLabel}.`,
      link: `/asesor/ordenes/${params.orderId}`,
    })),
  });

  return targets;
}
