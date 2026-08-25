import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];

function isStaff(role?: string) {
  return role === "ASESOR" || role === "ADMIN";
}

/** Descarga el comprobante de abono (asesor/admin o el cliente dueño). */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      userId: true,
      depositReceiptName: true,
      depositReceiptType: true,
      depositReceiptData: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (!isStaff(session.user.role) && order.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!order.depositReceiptData) {
    return NextResponse.json(
      { error: "Esta orden no tiene comprobante." },
      { status: 404 }
    );
  }

  const name = order.depositReceiptName ?? "comprobante";
  return new NextResponse(new Uint8Array(order.depositReceiptData), {
    headers: {
      "Content-Type": order.depositReceiptType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Sube (o reemplaza) el comprobante de abono. */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isStaff(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 422 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 5 MB." },
      { status: 422 }
    );
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa PDF o imagen (PNG, JPG, WEBP)." },
      { status: 422 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.order.update({
    where: { id },
    data: {
      depositReceiptName: file.name,
      depositReceiptType: file.type || "application/octet-stream",
      depositReceiptSize: file.size,
      depositReceiptData: bytes,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Comprobante cargado.",
    name: file.name,
    size: file.size,
  });
}

/** Elimina el comprobante de abono. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isStaff(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.order.update({
    where: { id },
    data: {
      depositReceiptName: null,
      depositReceiptType: null,
      depositReceiptSize: null,
      depositReceiptData: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Comprobante eliminado." });
}
