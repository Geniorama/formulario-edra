"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  Textarea,
  SelectField,
  MoneyField,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import { Stepper } from "@/components/forms/onboarding/stepper";
import {
  advisorFieldsForProduct,
  ADVISOR_FIELD_META,
  type AdvisorFieldKey,
} from "@/lib/product-fields";
import {
  ORDER_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/order-display";
import type { OrderStatus } from "@/generated/prisma/enums";

const STEPS = ["Orden de trabajo", "Datos finales"];

const DATE_FIELDS = [
  { key: "saleDate", label: "Fecha de venta" },
  { key: "deliveryFrom", label: "Fecha de entrega/envío (desde)" },
  { key: "deliveryTo", label: "Fecha de entrega/envío (hasta)" },
  { key: "jewelerDeliveryDate", label: "Fecha de entrega del joyero" },
  { key: "estimatedDeliveryDate", label: "Fecha estimada de entrega (hasta)" },
] as const;

const MONEY_FIELDS = [
  { key: "purchaseValue", label: "Valor compra" },
  { key: "depositValue", label: "Valor abono" },
  { key: "shippingValue", label: "Valor total del envío" },
  { key: "balanceWithShipping", label: "Saldo con envío" },
] as const;

export function AdvisorOrderForm({
  orderId,
  product,
  initial,
}: {
  orderId: string;
  product: string;
  initial: {
    workOrderCode: string;
    status: OrderStatus;
    fields: Record<string, string>;
    final: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workOrderCode, setWorkOrderCode] = useState(initial.workOrderCode);
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [fields, setFields] = useState<Record<string, string>>(initial.fields);
  const [final, setFinal] = useState<Record<string, string>>(initial.final);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keys = advisorFieldsForProduct(product);

  function setField(key: AdvisorFieldKey, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
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
        body: JSON.stringify({ workOrderCode, status, fields, final }),
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

  async function saveProgress() {
    if (await persist()) setMessage("Progreso guardado.");
  }

  async function next() {
    const ok = await persist(); // autoguardado al avanzar
    if (ok) {
      setMessage("Progreso guardado.");
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
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

          {keys.length > 0 ? (
            <div className="space-y-5 border-t border-black/5 pt-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-edra-grey">
                Detalles técnicos
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {keys
                  .filter((k) => !ADVISOR_FIELD_META[k].multiline)
                  .map((k) => (
                    <Field
                      key={k}
                      label={ADVISOR_FIELD_META[k].label}
                      value={fields[k] ?? ""}
                      onChange={(e) => setField(k, e.target.value)}
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
                    value={fields[k] ?? ""}
                    onChange={(e) => setField(k, e.target.value)}
                    optional
                  />
                ))}
            </div>
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
          </div>

          <Field
            label="Comprobante de abono (enlace)"
            value={final.depositReceiptUrl ?? ""}
            onChange={(e) => setFin("depositReceiptUrl", e.target.value)}
            placeholder="https://..."
            optional
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
          </div>

          <Field
            label="Joyero fabricante"
            value={final.jeweler ?? ""}
            onChange={(e) => setFin("jeweler", e.target.value)}
            optional
          />

          <Textarea
            label="Descripción del producto (solo asesor)"
            value={final.finalDescription ?? ""}
            onChange={(e) => setFin("finalDescription", e.target.value)}
            optional
          />
          <Textarea
            label="Notas adicionales (uso interno)"
            value={final.internalNotes ?? ""}
            onChange={(e) => setFin("internalNotes", e.target.value)}
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
