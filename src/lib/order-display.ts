import { PRODUCTS, labelOf } from "@/lib/form-options";
import type {
  OrderStatus,
  DeliveryType,
  PaymentMethod,
  InvoiceType,
} from "@/generated/prisma/enums";

/** Número de orden visible para el cliente, p. ej. EDRA-00042. */
export function formatOrderNumber(n: number): string {
  return `EDRA-${String(n).padStart(5, "0")}`;
}

/**
 * Resume los productos de una compra.
 * `full` lista todos ("Argollas, Dije"); si no, abrevia ("Argollas +1 más").
 */
export function orderProductsLabel(
  items: { product: string | null }[],
  full = false
): string {
  if (items.length === 0) return "—";
  const labels = items.map((i) => labelOf(PRODUCTS, i.product));
  if (labels.length === 1) return labels[0];
  return full ? labels.join(", ") : `${labels[0]} +${labels.length - 1} más`;
}

export const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "ENVIO_INTERNACIONAL", label: "Envío internacional" },
  { value: "ENVIO_NACIONAL", label: "Envío nacional" },
  { value: "ENVIO_BOGOTA", label: "Envío Bogotá" },
  { value: "RECOGER_EN_TIENDA", label: "Recoger en tienda" },
];

type PaymentOption = { value: PaymentMethod; label: string };

/** Medios de pago cuando la compra se factura electrónicamente (Con FE). */
export const PAYMENT_METHODS_FE: PaymentOption[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "ADDI", label: "Addi" },
  { value: "BANCOLOMBIA_EDUARDO", label: "Bancolombia Eduardo" },
  { value: "DAVIVIENDA_EDUARDO", label: "Davivienda Eduardo" },
  { value: "DATAFONO_EDUARDO", label: "Datafono Eduardo" },
];

/** Medios de pago cuando la compra no se factura electrónicamente (Sin FE). */
export const PAYMENT_METHODS_SIN_FE: PaymentOption[] = [
  { value: "WESTERN_WEENDY", label: "Western Weendy" },
  { value: "BANCOLOMBIA_WEENDY", label: "Bancolombia Weendy" },
  { value: "DATAFONO_ROJO", label: "Datafono Rojo" },
  { value: "SISTECREDITO", label: "Sistecredito" },
  { value: "NEQUI_SANTIAGO", label: "Nequi Santiago" },
  { value: "NEQUI_DON_MAURO", label: "Nequi Don Mauro" },
  { value: "ESTABAN_CLAUDIA_JM", label: "Estaban/Claudia JM" },
  { value: "HECTOR_NARANJO", label: "Hector Naranjo" },
  { value: "DAVIVIENDA_ERIKA", label: "Davivienda Erika" },
  { value: "SUSA", label: "Susa" },
  { value: "LUZ", label: "Luz" },
  { value: "JIMMY", label: "Jimmy" },
  { value: "FREDDY", label: "Freddy" },
  { value: "DON_FREDDY", label: "Don Freddy" },
  { value: "OTRO", label: "Otro" },
];

/**
 * Medios de pago que ya no se ofrecen: se conservan solo para que las órdenes
 * antiguas sigan mostrando su etiqueta.
 */
const LEGACY_PAYMENT_METHODS: PaymentOption[] = [
  { value: "TARJETA_CREDITO", label: "Tarjeta crédito" },
  { value: "TARJETA_DEBITO", label: "Tarjeta débito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

/** Todas las etiquetas conocidas (para mostrar, no para los selectores). */
export const PAYMENT_METHOD_OPTIONS: PaymentOption[] = [
  ...PAYMENT_METHODS_FE,
  ...PAYMENT_METHODS_SIN_FE,
  ...LEGACY_PAYMENT_METHODS,
];

/** Valor libre que el asesor escribe cuando el medio de pago es "Otro". */
export const PAYMENT_METHOD_OTHER: PaymentMethod = "OTRO";

/**
 * Opciones del selector de medio de pago según la facturación elegida.
 * Sin facturación seleccionada no hay lista: primero se elige Con FE / Sin FE.
 */
export function paymentMethodOptionsFor(
  invoiceType?: InvoiceType | string | null
): PaymentOption[] {
  if (invoiceType === "CON_FE") return PAYMENT_METHODS_FE;
  if (invoiceType === "SIN_FE") return PAYMENT_METHODS_SIN_FE;
  return [];
}

/** ¿El medio de pago corresponde a la facturación elegida? */
export function isPaymentMethodAllowed(
  invoiceType: InvoiceType | string | null | undefined,
  method: PaymentMethod | string | null | undefined
): boolean {
  if (!method) return true;
  return paymentMethodOptionsFor(invoiceType).some((o) => o.value === method);
}

export const INVOICE_TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: "CON_FE", label: "Con FE" },
  { value: "SIN_FE", label: "Sin FE" },
];

export function invoiceTypeLabel(v?: InvoiceType | null): string {
  return INVOICE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? "—";
}

export function deliveryTypeLabel(v?: DeliveryType | null): string {
  return DELIVERY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? "—";
}

/** Etiqueta del medio de pago; "Otro" muestra lo que escribió el asesor. */
export function paymentMethodLabel(
  v?: PaymentMethod | null,
  other?: string | null
): string {
  if (v === PAYMENT_METHOD_OTHER && other?.trim()) return other.trim();
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
  EN_TRAMITE: "En trámite",
  EN_FABRICACION: "En fabricación",
  ENGASTE: "Engaste",
  NOVEDAD_FABRICACION: "Novedad de fabricación",
  FINALIZADO: "Finalizado",
  ENTREGADO: "Entregado",
  DESISTIDO: "Desistido",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  EN_TRAMITE: "bg-amber-50 text-amber-700",
  EN_FABRICACION: "bg-edra-soft text-edra-dark",
  ENGASTE: "bg-indigo-50 text-indigo-700",
  NOVEDAD_FABRICACION: "bg-orange-50 text-orange-700",
  FINALIZADO: "bg-emerald-50 text-emerald-700",
  ENTREGADO: "bg-emerald-100 text-emerald-800",
  DESISTIDO: "bg-red-50 text-red-600",
};

// Orden de aparición en los selectores (flujo de fabricación).
export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "EN_TRAMITE", label: ORDER_STATUS_LABELS.EN_TRAMITE },
  { value: "EN_FABRICACION", label: ORDER_STATUS_LABELS.EN_FABRICACION },
  { value: "ENGASTE", label: ORDER_STATUS_LABELS.ENGASTE },
  {
    value: "NOVEDAD_FABRICACION",
    label: ORDER_STATUS_LABELS.NOVEDAD_FABRICACION,
  },
  { value: "FINALIZADO", label: ORDER_STATUS_LABELS.FINALIZADO },
  { value: "ENTREGADO", label: ORDER_STATUS_LABELS.ENTREGADO },
  { value: "DESISTIDO", label: ORDER_STATUS_LABELS.DESISTIDO },
];

/** Saldo con envío = valor compra − valor abono + valor envío. */
export function computeBalanceWithShipping(values: {
  purchaseValue?: number | string | null;
  depositValue?: number | string | null;
  shippingValue?: number | string | null;
}): number | null {
  const toNumber = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  const purchase = toNumber(values.purchaseValue);
  const deposit = toNumber(values.depositValue);
  const shipping = toNumber(values.shippingValue);
  if (purchase === null && deposit === null && shipping === null) return null;
  return (purchase ?? 0) - (deposit ?? 0) + (shipping ?? 0);
}
