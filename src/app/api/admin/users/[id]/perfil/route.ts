import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminClientDataSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/admin-guard";
import { parseBirthDate } from "@/lib/client-registration";

type Params = { params: Promise<{ id: string }> };

// El ADMIN corrige los datos del cliente (nombre, documento, contacto, envío)
// desde la orden de compra. No cambia el estado del registro por pasos.
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = adminClientDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
        issues: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const client = await prisma.user.findFirst({
    where: { id, role: "CLIENTE" },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const { firstName, lastName, birthDate, documentType, ...rest } = parsed.data;
  const orNull = (v?: string) => v || null;
  const profile = {
    documentType: documentType || null,
    documentNumber: orNull(rest.documentNumber),
    whatsapp: orNull(rest.whatsapp),
    birthDate: parseBirthDate(birthDate),
    shippingCountry: orNull(rest.shippingCountry),
    cityState: orNull(rest.cityState),
    postalCode: orNull(rest.postalCode),
    address: orNull(rest.address),
    neighborhood: orNull(rest.neighborhood),
    addressDetails: orNull(rest.addressDetails),
  };

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { firstName, lastName } }),
    prisma.clientProfile.upsert({
      where: { userId: id },
      create: { userId: id, ...profile },
      update: profile,
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Datos del cliente actualizados." });
}
