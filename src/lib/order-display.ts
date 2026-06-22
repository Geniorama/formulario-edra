import type {
  OrderStatus,
  DeliveryType,
  PaymentMethod,
} from "@/generated/prisma/enums";

/** Número de orden visible para el cliente, p. ej. EDRA-00042. */
export function formatOrderNumber(n: number): string {
  return `EDRA-${String(n).padStart(5, "0")}`;
}

export const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "ENVIO_INTERNACIONAL", label: "Envío internacional" },
  { value: "ENVIO_NACIONAL", label: "Envío nacional" },
  { value: "ENVIO_BOGOTA", label: "Envío Bogotá" },
  { value: "RECOGER_EN_TIENDA", label: "Recoger en tienda" },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] =
  [
    { value: "TARJETA_CREDITO", label: "Tarjeta crédito" },
    { value: "TARJETA_DEBITO", label: "Tarjeta débito" },
    { value: "ADDI", label: "Addi" },
    { value: "SISTECREDITO", label: "Sistecredito" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "EFECTIVO", label: "Efectivo" },
  ];

export function deliveryTypeLabel(v?: DeliveryType | null): string {
  return DELIVERY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? "—";
}

export function paymentMethodLabel(v?: PaymentMethod | null): string {
  return PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? "—";
}

/** Formatea pesos colombianos: 1500000 -> "$ 1.500.000". */
export function formatMoney(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Formatea una fecha (o "—" si no existe). */
export function formatDate(d?: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-CO");
}

/** Convierte una fecha a "YYYY-MM-DD" para inputs date (o ""). */
export function toDateInput(d?: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  FINALIZADO: "Finalizado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  EN_PROCESO: "bg-edra-soft text-edra-dark",
  FINALIZADO: "bg-emerald-50 text-emerald-700",
  ENTREGADO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-red-50 text-red-600",
};

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
];
