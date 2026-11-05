import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
// Los únicos formatos que pdf-lib puede incrustar en el PDF de la orden.
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

function isStaff(role?: string) {
  return role === "ASESOR" || role === "ADMIN";
}

/** Muestra la imagen del proyecto (asesor/admin o el cliente dueño). */
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
      projectImageName: true,
      projectImageType: true,
      projectImageData: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (!isStaff(session.user.role) && order.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!order.projectImageData) {
    return NextResponse.json(
      { error: "Esta orden no tiene imagen del proyecto." },
      { status: 404 }
    );
  }

  const name = order.projectImageName ?? "imagen";
  return new NextResponse(new Uint8Array(order.projectImageData), {
    headers: {
      "Content-Type": order.projectImageType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Sube (o reemplaza) la imagen del proyecto. */
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
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 422 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "La imagen supera el límite de 5 MB." },
      { status: 422 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa una imagen JPG o PNG." },
      { status: 422 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.order.update({
    where: { id },
    data: {
      projectImageName: file.name,
      projectImageType: file.type,
      projectImageSize: file.size,
      projectImageData: bytes,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Imagen cargada.",
    name: file.name,
    size: file.size,
  });
}

/** Elimina la imagen del proyecto. */
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
      projectImageName: null,
      projectImageType: null,
      projectImageSize: null,
      projectImageData: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Imagen eliminada." });
}
