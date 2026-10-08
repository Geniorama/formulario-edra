import { CheckCircle2, Download } from "lucide-react";

/** Enlace para descargar la orden en PDF (`GET /api/ordenes/[id]/pdf`). */
export function OrderPdfLink({
  orderId,
  variant = "solid",
}: {
  orderId: string;
  variant?: "solid" | "outline";
}) {
  const styles =
    variant === "solid"
      ? "bg-edra text-white hover:bg-edra-dark"
      : "border border-edra text-edra hover:bg-edra hover:text-white";
  return (
    <a
      href={`/api/ordenes/${orderId}/pdf`}
      download
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${styles}`}
    >
      <Download className="h-4 w-4" />
      Descargar orden en PDF
    </a>
  );
}

/** Pantalla de finalización del proceso, con la descarga de la orden en PDF. */
export function OrderDone({
  title,
  description,
  orderId,
  orderNumber,
  children,
}: {
  title: string;
  description: string;
  orderId?: string;
  /** Número visible de la orden, p. ej. "EDRA-00042". */
  orderNumber?: string;
  /** Acciones secundarias (enlaces o botones). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
      <CheckCircle2 className="h-14 w-14 text-edra" />
      <div>
        <h2 className="text-xl font-semibold text-edra-ink">{title}</h2>
        {orderNumber ? (
          <p className="mt-1 font-mono text-sm font-semibold text-edra">
            {orderNumber}
          </p>
        ) : null}
        <p className="mx-auto mt-2 max-w-md text-sm text-edra-grey">
          {description}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {orderId ? <OrderPdfLink orderId={orderId} /> : null}
        {children}
      </div>
    </div>
  );
}
