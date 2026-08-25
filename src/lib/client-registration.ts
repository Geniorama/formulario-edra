import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  PRODUCTS,
  MATERIALS,
  GEM_TYPES,
} from "@/lib/form-options";
import { MAX_ORDER_ITEMS } from "@/lib/validations";
import type {
  DocumentType,
  ContactMedium,
  SocialNetwork,
  Product,
  Material,
  GemType,
} from "@/generated/prisma/enums";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function inSet(options: readonly { value: string }[], v: unknown): string | null {
  return typeof v === "string" && options.some((o) => o.value === v) ? v : null;
}

/** Limpia los datos personales para guardarlos (acepta parciales). */
export function sanitizePersonal(raw: Record<string, unknown> = {}) {
  return {
    documentType: inSet(DOCUMENT_TYPES, raw.documentType) as DocumentType | null,
    documentNumber: str(raw.documentNumber),
    whatsapp: str(raw.whatsapp),
    contactMedium: inSet(CONTACT_MEDIUMS, raw.contactMedium) as
      | ContactMedium
      | null,
    socialNetwork: inSet(SOCIAL_NETWORKS, raw.socialNetwork) as
      | SocialNetwork
      | null,
    socialLink: str(raw.socialLink),
    shippingCountry: str(raw.shippingCountry),
    cityState: str(raw.cityState),
    postalCode: str(raw.postalCode),
    address: str(raw.address),
    neighborhood: str(raw.neighborhood),
    addressDetails: str(raw.addressDetails),
    privacyAccepted: Boolean(raw.privacyAccepted),
  };
}

/** Limpia un producto de la compra para guardarlo (acepta parciales). */
export function sanitizeOrderItem(raw: Record<string, unknown> = {}) {
  const gemType = inSet(GEM_TYPES, raw.gemType) as GemType | null;
  return {
    product: inSet(PRODUCTS, raw.product) as Product | null,
    size: str(raw.size),
    sizeLady: str(raw.sizeLady),
    sizeGentleman: str(raw.sizeGentleman),
    material: inSet(MATERIALS, raw.material) as Material | null,
    gemType,
    // Solo tiene sentido guardar la gema escrita si eligió "Otra".
    gemOther: gemType === "OTRA" ? str(raw.gemOther) : null,
    engraving: str(raw.engraving),
    engravingLady: str(raw.engravingLady),
    engravingGentleman: str(raw.engravingGentleman),
    fontType: str(raw.fontType),
  };
}

/** Limpia la lista de productos de una compra (máximo `MAX_ORDER_ITEMS`). */
export function sanitizeOrderItems(raw: unknown): ReturnType<
  typeof sanitizeOrderItem
>[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .slice(0, MAX_ORDER_ITEMS)
    .map((item) => sanitizeOrderItem((item ?? {}) as Record<string, unknown>));
}

/**
 * Guarda (upsert) el perfil del cliente y su orden de registro.
 * Sirve tanto para borradores como para el envío final.
 */
export async function persistRegistration(
  userId: string,
  personalRaw: Record<string, unknown>,
  orderRaw: Record<string, unknown>,
  opts: { lastStep?: number; completed?: boolean } = {}
) {
  const personal = sanitizePersonal(personalRaw);
  const items = sanitizeOrderItems(orderRaw.items);

  await prisma.clientProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...personal,
      lastStep: opts.lastStep ?? 0,
      completed: opts.completed ?? false,
    },
    update: {
      ...personal,
      ...(opts.lastStep !== undefined ? { lastStep: opts.lastStep } : {}),
      ...(opts.completed !== undefined ? { completed: opts.completed } : {}),
    },
  });

  // Una sola orden durante el registro: se reescriben sus productos.
  const existingOrder = await prisma.order.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const orderId =
    existingOrder?.id ??
    (await prisma.order.create({ data: { userId }, select: { id: true } })).id;

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.orderItem.createMany({
      data: items.map((item, position) => ({ ...item, orderId, position })),
    }),
  ]);

  return orderId;
}
