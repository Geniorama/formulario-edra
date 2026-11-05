"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileField } from "@/components/ui/form-fields";

const MAX_SIDE = 1600; // px: de sobra para el cuadro del PDF

/**
 * Normaliza la imagen en el navegador: el PDF solo admite JPG/PNG e ignora la
 * orientación EXIF, así que se endereza, se reduce y se convierte a JPG.
 */
async function toJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas no disponible");
  // Fondo blanco: las imágenes PNG pueden traer transparencia.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("No se pudo convertir la imagen");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
    type: "image/jpeg",
  });
}

/** Imagen del proyecto que aparece en el PDF de la orden. */
export function ProjectImageField({
  orderId,
  initialName,
}: {
  orderId: string;
  initialName: string | null;
}) {
  const router = useRouter();
  const url = `/api/asesor/ordenes/${orderId}/imagen`;
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      let image: File;
      try {
        image = await toJpeg(file);
      } catch {
        setError("No se pudo leer la imagen. Usa un archivo JPG, PNG o WEBP.");
        return;
      }
      const data = new FormData();
      data.append("file", image);
      const res = await fetch(url, { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo subir la imagen.");
        return;
      }
      setName(body.name);
      router.refresh();
    } catch {
      setError("Error de conexión al subir la imagen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "No se pudo eliminar la imagen.");
        return;
      }
      setName(null);
      router.refresh();
    } catch {
      setError("Error de conexión al eliminar la imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FileField
      label="Imagen del proyecto"
      optional
      accept="image/*"
      fileName={name}
      fileHref={name ? url : undefined}
      busy={busy}
      error={error ?? undefined}
      hint="Aparece en el PDF de la orden. Imagen JPG, PNG o WEBP."
      onSelect={upload}
      onRemove={name ? remove : undefined}
    />
  );
}
