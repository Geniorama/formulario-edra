"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Field,
  Textarea,
  SelectField,
  MoneyField,
  FileField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import { Stepper } from "@/components/forms/onboarding/stepper";
import { OrderItemFields } from "@/components/forms/order/order-fields";
import {
  advisorFieldsForProduct,
  ADVISOR_FIELD_META,
  fieldsForProduct,
  ORDER_FIELD_META,
  type AdvisorFieldKey,
  type OrderFieldKey,
} from "@/lib/product-fields";
import {
  emptyOrderItem,
  orderFieldDisplay,
  type OrderItemState,
} from "@/lib/order-utils";
import { PRODUCTS, labelOf } from "@/lib/form-options";
import { MAX_ORDER_ITEMS } from "@/lib/validations";
import {
  ORDER_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  computeBalanceWithShipping,
} from "@/lib/order-display";
import type { OrderStatus } from "@/generated/prisma/enums";

const STEPS = ["Orden de trabajo", "Datos finales"];

// Orden solicitado: venta → entrega del joyero → entrega y envío (desde/hasta).
const DATE_FIELDS = [
  { key: "saleDate", label: "Fecha de venta" },
  { key: "jewelerDeliveryDate", label: "Fecha de entrega del joyero" },
  { key: "deliveryFrom", label: "Fecha de entrega y envío (desde)" },
  { key: "deliveryTo", label: "Fecha de entrega y envío (hasta)" },
] as const;

const MONEY_FIELDS = [
  { key: "purchaseValue", label: "Valor compra" },
  { key: "depositValue", label: "Valor abono" },
  { key: "shippingValue", label: "Valor envío" },
] as const;

const RECEIPT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*";

export type AdvisorOption = { id: string; name: string };
export type ReceiptInfo = { name: string; size: number | null } | null;

/** Un producto de la compra tal como lo edita el asesor/admin. */
export type AdvisorItemState = {
  /** Vacío para los productos que el admin agrega en esta pantalla. */
  id: string;
  client: OrderItemState;
  fields: Record<string, string>;
};

export function AdvisorOrderForm({
  orderId,
  canEditClient = false,
  advisors = [],
  initial,
}: {
  orderId: string;
  /** El ADMIN puede editar también la solicitud del cliente y el asesor. */
  canEditClient?: boolean;
  advisors?: AdvisorOption[];
  initial: {
    workOrderCode: string;
    status: OrderStatus;
    advisorId: string;
    items: AdvisorItemState[];
    manufacturingNotes: string;
    final: Record<string, string>;
    receipt: ReceiptInfo;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workOrderCode, setWorkOrderCode] = useState(initial.workOrderCode);
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [advisorId, setAdvisorId] = useState(initial.advisorId);
  const [items, setItems] = useState<AdvisorItemState[]>(initial.items);
  const [manufacturingNotes, setManufacturingNotes] = useState(
    initial.manufacturingNotes
  );
  const [final, setFinal] = useState<Record<string, string>>(initial.final);
  const [receipt, setReceipt] = useState<ReceiptInfo>(initial.receipt);
  const [uploading, setUploading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Saldo con envío: calculado, no editable.
  const balance = computeBalanceWithShipping({
    purchaseValue: final.purchaseValue,
    depositValue: final.depositValue,
    shippingValue: final.shippingValue,
  });

  function setItemField(index: number, key: AdvisorFieldKey, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, fields: { ...item.fields, [key]: value } } : item
      )
    );
  }
  function setClientField(index: number, key: OrderFieldKey, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, client: { ...item.client, [key]: value } } : item
      )
    );
  }
  function setClientGemOther(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, client: { ...item.client, gemOther: value } } : item
      )
    );
  }
  // Al cambiar de producto se limpian los campos que dependen de él.
  function setClientProduct(index: number, product: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, client: { ...emptyOrderItem, product }, fields: {} }
          : item
      )
    );
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: "", client: { ...emptyOrderItem }, fields: {} },
    ]);
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function setFin(key: string, value: string) {
    setFinal((prev) => ({ ...prev, [key]: value }));
  }

  // Persiste todo el estado en la BD. Devuelve true si guardó bien.
  async function persist(): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/asesor/ordenes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderCode,
          status,
          manufacturingNotes,
          final,
          items: items.map((item) => ({
            id: item.id || undefined,
            fields: item.fields,
            ...(canEditClient ? { client: item.client } : {}),
          })),
          ...(canEditClient ? { advisorId } : {}),
        }),
      });
      const body = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(body.error ?? "No se pudo guardar la orden.");
        return false;
      }
      return true;
    } catch {
      setBusy(false);
      setError("Ocurrió un error de conexión. Intenta nuevamente.");
      return false;
    }
  }

  async function uploadReceipt(file: File) {
    setUploading(true);
    setReceiptError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(`/api/asesor/ordenes/${orderId}/comprobante`, {
        method: "POST",
        body: data,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptError(body.error ?? "No se pudo subir el comprobante.");
        return;
      }
      setReceipt({ name: body.name, size: body.size ?? null });
      router.refresh();
    } catch {
      setReceiptError("Error de conexión al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function removeReceipt() {
    setUploading(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/asesor/ordenes/${orderId}/comprobante`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setReceiptError(body.error ?? "No se pudo eliminar el comprobante.");
        return;
      }
      setReceipt(null);
      router.refresh();
    } catch {
      setReceiptError("Error de conexión al eliminar el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProgress() {
    if (await persist()) {
      setMessage("Progreso guardado.");
      router.refresh();
    }
  }

  async function next() {
    const ok = await persist(); // autoguardado al avanzar
    if (ok) {
      setMessage("Progreso guardado.");
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    }
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    if (await persist()) {
      setMessage("La orden se guardó con éxito.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Stepper steps={STEPS} current={step} />

      {message ? <FormAlert type="success">{message}</FormAlert> : null}
      {error ? <FormAlert type="error">{error}</FormAlert> : null}

      {/* Paso 1: Orden de trabajo */}
      {step === 0 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Código de orden de trabajo"
              value={workOrderCode}
              onChange={(e) => setWorkOrderCode(e.target.value)}
              placeholder="N.º de orden de trabajo"
              optional
            />
            <SelectField
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Asesor asignado (solo ADMIN) */}
          {canEditClient ? (
            <SelectField
              label="Asesor asignado"
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              optional
            >
              <option value="">Sin asignar</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectField>
          ) : null}

          {/* Un bloque por producto de la compra */}
          {items.map((item, index) => (
            <ItemCard
              key={item.id || `nuevo-${index}`}
              item={item}
              index={index}
              total={items.length}
              canEditClient={canEditClient}
              onClientField={setClientField}
              onClientProduct={setClientProduct}
              onClientGemOther={setClientGemOther}
              onField={setItemField}
              onRemove={removeItem}
            />
          ))}

          {canEditClient && items.length < MAX_ORDER_ITEMS ? (
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-edra/50 px-5 py-2.5 text-sm font-semibold text-edra transition-colors hover:border-edra hover:bg-edra-soft"
            >
              <Plus className="h-4 w-4" />
              Agregar producto a la compra
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Paso 2: Datos finales */}
      {step === 1 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {DATE_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                type="date"
                value={final[f.key] ?? ""}
                onChange={(e) => setFin(f.key, e.target.value)}
                optional
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {MONEY_FIELDS.map((f) => (
              <MoneyField
                key={f.key}
                label={f.label}
                value={final[f.key] ?? ""}
                onChange={(v) => setFin(f.key, v)}
                optional
              />
            ))}
            <MoneyField
              label="Saldo con envío"
              value={balance === null ? "" : String(balance)}
              readOnly
              optional
              hint="Calculado: valor compra − valor abono + valor envío."
            />
          </div>

          <FileField
            label="Comprobante de abono"
            optional
            accept={RECEIPT_ACCEPT}
            fileName={receipt?.name ?? null}
            fileHref={
              receipt ? `/api/asesor/ordenes/${orderId}/comprobante` : undefined
            }
            busy={uploading}
            error={receiptError ?? undefined}
            hint="PDF o imagen (PNG, JPG, WEBP). Máximo 5 MB."
            onSelect={uploadReceipt}
            onRemove={receipt ? removeReceipt : undefined}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              label="Tipo de entrega"
              value={final.deliveryType ?? ""}
              onChange={(e) => setFin("deliveryType", e.target.value)}
              optional
            >
              <option value="">Selecciona...</option>
              {DELIVERY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Método de pago"
              value={final.paymentMethod ?? ""}
              onChange={(e) => setFin("paymentMethod", e.target.value)}
              optional
            >
              <option value="">Selecciona...</option>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Facturación electrónica"
              value={final.invoiceType ?? ""}
              onChange={(e) => setFin("invoiceType", e.target.value)}
              optional
            >
              <option value="">Selecciona...</option>
              {INVOICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <Field
              label="Joyero fabricante"
              value={final.jeweler ?? ""}
              onChange={(e) => setFin("jeweler", e.target.value)}
              optional
            />
          </div>

          <Textarea
            label="Notas adicionales (uso interno)"
            value={final.internalNotes ?? ""}
            onChange={(e) => setFin("internalNotes", e.target.value)}
            optional
          />
          <Textarea
            label={ADVISOR_FIELD_META.manufacturingNotes.label}
            value={manufacturingNotes}
            onChange={(e) => setManufacturingNotes(e.target.value)}
            optional
          />
        </div>
      ) : null}

      {/* Navegación */}
      <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-5">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || busy}
          className="rounded-full border border-edra-grey/30 px-6 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra disabled:invisible"
        >
          Atrás
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveProgress}
            disabled={busy}
            className="rounded-full border border-edra-grey/30 px-5 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar progreso"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className="rounded-full bg-edra px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-edra-dark disabled:opacity-60"
            >
              Siguiente
            </button>
          ) : (
            <div className="w-40">
              <SubmitButton loading={busy} onClick={finish} type="button">
                Completar
              </SubmitButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Bloque de un producto: solicitud del cliente + datos técnicos del asesor. */
function ItemCard({
  item,
  index,
  total,
  canEditClient,
  onClientField,
  onClientProduct,
  onClientGemOther,
  onField,
  onRemove,
}: {
  item: AdvisorItemState;
  index: number;
  total: number;
  canEditClient: boolean;
  onClientField: (index: number, key: OrderFieldKey, value: string) => void;
  onClientProduct: (index: number, value: string) => void;
  onClientGemOther: (index: number, value: string) => void;
  onField: (index: number, key: AdvisorFieldKey, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const product = item.client.product;
  const keys = advisorFieldsForProduct(product);

  return (
    <div className="space-y-5 rounded-2xl border border-black/5 bg-edra-bg/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-edra-grey">
          Producto {index + 1}
          {product ? ` · ${labelOf(PRODUCTS, product)}` : ""}
        </p>
        {canEditClient && total > 1 ? (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Quitar
          </button>
        ) : null}
      </div>

      {canEditClient ? (
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-wide text-edra-grey/80">
            Solicitud del cliente (edición de administrador)
          </p>
          <OrderItemFields
            item={item.client}
            errors={{}}
            onField={(key, value) => onClientField(index, key, value)}
            onProduct={(value) => onClientProduct(index, value)}
            onGemOther={(value) => onClientGemOther(index, value)}
          />
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {fieldsForProduct(product).map((key) => (
            <div
              key={key}
              className="flex justify-between gap-4 border-b border-black/5 py-1 text-sm last:border-0"
            >
              <dt className="text-edra-grey">{ORDER_FIELD_META[key].label}</dt>
              <dd className="text-right font-medium text-edra-ink">
                {orderFieldDisplay(item.client, key)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {keys.length > 0 ? (
        <div className="space-y-5 border-t border-black/5 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-edra-grey/80">
            Detalles técnicos
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {keys
              .filter((k) => !ADVISOR_FIELD_META[k].multiline)
              .map((k) => (
                <Field
                  key={k}
                  label={ADVISOR_FIELD_META[k].label}
                  value={item.fields[k] ?? ""}
                  onChange={(e) => onField(index, k, e.target.value)}
                  optional
                />
              ))}
          </div>
          {keys
            .filter((k) => ADVISOR_FIELD_META[k].multiline)
            .map((k) => (
              <Textarea
                key={k}
                label={ADVISOR_FIELD_META[k].label}
                value={item.fields[k] ?? ""}
                onChange={(e) => onField(index, k, e.target.value)}
                optional
              />
            ))}
        </div>
      ) : null}

      {/* Descripción del producto: se pide para cada producto de la compra. */}
      <Textarea
        label={ADVISOR_FIELD_META.finalDescription.label}
        value={item.fields.finalDescription ?? ""}
        onChange={(e) => onField(index, "finalDescription", e.target.value)}
        optional
      />
    </div>
  );
}
