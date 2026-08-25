"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  Field,
  SelectField,
  PhoneField,
  Checkbox,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import { Stepper } from "./stepper";
import { OrderItemsEditor } from "@/components/forms/order/order-fields";
import { useOrderItems } from "@/components/forms/order/use-order-items";
import {
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  SHIPPING_COUNTRIES,
  PRODUCTS,
  postalCodeRequired,
  labelOf,
} from "@/lib/form-options";
import { fieldsForProduct, ORDER_FIELD_META } from "@/lib/product-fields";
import { orderFieldDisplay, type OrderItemState } from "@/lib/order-utils";

const STEPS = ["Datos personales", "Orden de trabajo", "Confirmación"];

type Personal = {
  documentType: string;
  documentNumber: string;
  whatsapp: string;
  contactMedium: string;
  socialNetwork: string;
  socialLink: string;
  shippingCountry: string;
  cityState: string;
  postalCode: string;
  address: string;
  neighborhood: string;
  addressDetails: string;
  privacyAccepted: boolean;
};

const emptyPersonal: Personal = {
  documentType: "",
  documentNumber: "",
  whatsapp: "",
  contactMedium: "",
  socialNetwork: "",
  socialLink: "",
  shippingCountry: "",
  cityState: "",
  postalCode: "",
  address: "",
  neighborhood: "",
  addressDetails: "",
  privacyAccepted: false,
};

type Errors = Record<string, string>;

export function ClientOnboardingForm({
  initialPersonal,
  initialItems,
  initialStep = 0,
}: {
  initialPersonal?: Personal;
  initialItems?: OrderItemState[];
  initialStep?: number;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), 2));
  const [personal, setPersonal] = useState<Personal>(
    initialPersonal ?? emptyPersonal
  );
  const {
    items,
    errors: itemErrors,
    valid: itemsValid,
    handlers,
    revealErrors,
  } = useOrderItems(initialItems);
  // Campos que el usuario ya tocó (para no mostrar errores en pristinos).
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function setP<K extends keyof Personal>(key: K, value: Personal[K]) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function validatePersonal(): Errors {
    const e: Errors = {};
    if (!personal.documentType) e.documentType = "Selecciona el tipo de documento";
    if (personal.documentNumber.trim().length < 4)
      e.documentNumber = "Ingresa el número de documento";
    if (!/^\+[1-9]\d{6,14}$/.test(personal.whatsapp))
      e.whatsapp = "Ingresa un número de WhatsApp válido";
    if (!personal.contactMedium) e.contactMedium = "Selecciona el medio de contacto";
    if (personal.contactMedium === "RED_SOCIAL") {
      if (!personal.socialNetwork) e.socialNetwork = "Selecciona la red social";
      if (!personal.socialLink.trim())
        e.socialLink = "Ingresa el enlace de tu perfil";
    }
    if (!personal.shippingCountry) e.shippingCountry = "Selecciona el país de envío";
    if (!personal.cityState.trim()) e.cityState = "Ingresa la ciudad o estado";
    // El código postal solo es obligatorio para envíos fuera de Colombia.
    if (postalCodeRequired(personal.shippingCountry) && !personal.postalCode.trim())
      e.postalCode = "Obligatorio para envíos fuera de Colombia";
    if (personal.address.trim().length < 3) e.address = "Ingresa la dirección";
    if (!personal.privacyAccepted)
      e.privacyAccepted = "Debes aceptar la política de privacidad";
    return e;
  }

  // Guarda el borrador en la BD (datos parciales, sin validar).
  async function saveDraft(stepToSave: number) {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/cliente/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personal,
          order: { items },
          step: stepToSave,
          finalize: false,
        }),
      });
      if (res.ok) setSavedMsg("Progreso guardado");
    } catch {
      // Guardado silencioso: no interrumpe el flujo.
    } finally {
      setSaving(false);
    }
  }

  function next() {
    const e = step === 0 ? validatePersonal() : {};
    const stepOk = step === 0 ? Object.keys(e).length === 0 : itemsValid;

    if (stepOk) {
      const newStep = Math.min(step + 1, STEPS.length - 1);
      setStep(newStep);
      void saveDraft(newStep); // autoguardado al avanzar
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Resalta automáticamente los campos faltantes/inválidos.
    if (step === 0) {
      setTouched((prev) => {
        const t = { ...prev };
        for (const key in e) t[key] = true;
        return t;
      });
    } else {
      revealErrors();
    }
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setSubmitError(null);

    // Si algo quedó inválido, lleva al paso correspondiente y lo resalta.
    const pe = validatePersonal();
    if (Object.keys(pe).length > 0) {
      setTouched((prev) => {
        const t = { ...prev };
        for (const key in pe) t[key] = true;
        return t;
      });
      setStep(0);
      return;
    }
    if (!itemsValid) {
      revealErrors();
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cliente/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal, order: { items }, finalize: true }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setSubmitError(body.error ?? "No pudimos guardar tu registro.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setSubmitError("Ocurrió un error de conexión. Intenta nuevamente.");
    }
  }

  // Validación en vivo del paso actual.
  const personalErrors = validatePersonal();
  // Solo mostramos el error de un campo si el usuario ya lo tocó.
  const errors: Errors = {};
  if (step === 0) {
    for (const key in personalErrors) {
      if (touched[key]) errors[key] = personalErrors[key];
    }
  }
  const stepValid =
    step === 0
      ? Object.keys(personalErrors).length === 0
      : step === 1
        ? itemsValid
        : true;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-10">
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} />
      </div>

      {/* Paso 1: Datos personales */}
      {step === 0 ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Verifica bien tus datos: en los pasos posteriores no podrás
              modificar esta información.
            </span>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-edra-grey">
            Datos de facturación / contacto
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              label="Tipo de documento"
              value={personal.documentType}
              onChange={(e) => setP("documentType", e.target.value)}
              error={errors.documentType}
            >
              <option value="">Selecciona...</option>
              {DOCUMENT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <Field
              label="Número de documento"
              inputMode="numeric"
              value={personal.documentNumber}
              onChange={(e) => setP("documentNumber", e.target.value)}
              placeholder="Número de documento"
              error={errors.documentNumber}
            />
            <PhoneField
              label="Número de WhatsApp"
              value={personal.whatsapp || undefined}
              onChange={(v) => setP("whatsapp", v ?? "")}
              error={errors.whatsapp}
            />
            <SelectField
              label="Medio de contacto"
              value={personal.contactMedium}
              onChange={(e) => setP("contactMedium", e.target.value)}
              error={errors.contactMedium}
            >
              <option value="">Selecciona...</option>
              {CONTACT_MEDIUMS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>

            {personal.contactMedium === "RED_SOCIAL" ? (
              <>
                <SelectField
                  label="Red social"
                  value={personal.socialNetwork}
                  onChange={(e) => setP("socialNetwork", e.target.value)}
                  error={errors.socialNetwork}
                >
                  <option value="">Selecciona...</option>
                  {SOCIAL_NETWORKS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="Link de red social"
                  value={personal.socialLink}
                  onChange={(e) => setP("socialLink", e.target.value)}
                  placeholder="https://..."
                  error={errors.socialLink}
                />
              </>
            ) : null}
          </div>

          <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-edra-grey">
            Datos de envío
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              label="País de envío"
              value={personal.shippingCountry}
              onChange={(e) => setP("shippingCountry", e.target.value)}
              error={errors.shippingCountry}
            >
              <option value="">Selecciona...</option>
              {SHIPPING_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <Field
              label="Ciudad o estado"
              value={personal.cityState}
              onChange={(e) => setP("cityState", e.target.value)}
              placeholder="Ciudad o estado"
              error={errors.cityState}
            />
            <Field
              label="Código postal"
              inputMode="numeric"
              value={personal.postalCode}
              onChange={(e) => setP("postalCode", e.target.value)}
              placeholder="Código postal"
              error={errors.postalCode}
              optional={!postalCodeRequired(personal.shippingCountry)}
            />
            <Field
              label="Dirección"
              value={personal.address}
              onChange={(e) => setP("address", e.target.value)}
              placeholder="Dirección completa"
              error={errors.address}
            />
            <Field
              label="Barrio"
              value={personal.neighborhood}
              onChange={(e) => setP("neighborhood", e.target.value)}
              placeholder="Barrio"
              error={errors.neighborhood}
              optional
            />
            <Field
              label="Especificaciones de la dirección"
              value={personal.addressDetails}
              onChange={(e) => setP("addressDetails", e.target.value)}
              placeholder="Conjunto, torre, apto u otras indicaciones"
              error={errors.addressDetails}
              optional
            />
          </div>

          <Checkbox
            checked={personal.privacyAccepted}
            onChange={(e) => setP("privacyAccepted", e.target.checked)}
            error={errors.privacyAccepted}
            label={
              <>
                He leído y acepto la{" "}
                <Link
                  href="/politicas-de-privacidad"
                  target="_blank"
                  className="font-semibold text-edra hover:text-edra-dark"
                >
                  política de privacidad
                </Link>
                .
              </>
            }
          />
        </div>
      ) : null}

      {/* Paso 2: Orden de trabajo (uno o varios productos) */}
      {step === 1 ? (
        <div className="space-y-5">
          <p className="text-sm text-edra-grey">
            Puedes pedir varios productos en una sola compra.
          </p>
          <OrderItemsEditor items={items} errors={itemErrors} {...handlers} />
        </div>
      ) : null}

      {/* Paso 3: Confirmación */}
      {step === 2 ? (
        <div className="space-y-6">
          <p className="text-sm text-edra-grey">
            Revisa la información antes de enviar tu solicitud.
          </p>

          <SummaryGroup title="Datos personales">
            <SummaryRow label="Tipo de documento" value={labelOf(DOCUMENT_TYPES, personal.documentType)} />
            <SummaryRow label="Número de documento" value={personal.documentNumber} />
            <SummaryRow label="WhatsApp" value={personal.whatsapp} />
            <SummaryRow label="Medio de contacto" value={labelOf(CONTACT_MEDIUMS, personal.contactMedium)} />
            {personal.contactMedium === "RED_SOCIAL" ? (
              <>
                <SummaryRow label="Red social" value={labelOf(SOCIAL_NETWORKS, personal.socialNetwork)} />
                <SummaryRow label="Link" value={personal.socialLink} />
              </>
            ) : null}
            <SummaryRow label="País de envío" value={personal.shippingCountry} />
            <SummaryRow label="Ciudad o estado" value={personal.cityState} />
            <SummaryRow label="Código postal" value={personal.postalCode || "—"} />
            <SummaryRow label="Dirección" value={personal.address} />
            <SummaryRow label="Barrio" value={personal.neighborhood || "—"} />
            <SummaryRow
              label="Especificaciones de la dirección"
              value={personal.addressDetails || "—"}
            />
          </SummaryGroup>

          {items.map((item, index) => (
            <SummaryGroup
              key={index}
              title={
                items.length > 1
                  ? `Producto ${index + 1}: ${labelOf(PRODUCTS, item.product)}`
                  : "Orden de trabajo"
              }
            >
              <SummaryRow label="Producto" value={labelOf(PRODUCTS, item.product)} />
              {fieldsForProduct(item.product).map((key) => (
                <SummaryRow
                  key={key}
                  label={ORDER_FIELD_META[key].label}
                  value={orderFieldDisplay(item, key)}
                />
              ))}
            </SummaryGroup>
          ))}

          {submitError ? <FormAlert type="error">{submitError}</FormAlert> : null}
        </div>
      ) : null}

      {/* Navegación */}
      <div className="mt-8 space-y-3">
        {savedMsg ? (
          <p className="text-right text-xs font-medium text-emerald-600">
            ✓ {savedMsg}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || loading || saving}
            className="rounded-full border border-edra-grey/30 px-6 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra disabled:invisible"
          >
            Atrás
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => saveDraft(step)}
              disabled={saving || loading}
              className="rounded-full border border-edra-grey/30 px-5 py-3 text-sm font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar progreso"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={saving}
                aria-disabled={!stepValid}
                className={`rounded-full px-8 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  stepValid
                    ? "bg-edra hover:bg-edra-dark"
                    : "bg-edra/50 hover:bg-edra/60"
                }`}
              >
                Siguiente
              </button>
            ) : (
              <div className="w-44">
                <SubmitButton loading={loading} onClick={submit} type="button">
                  Enviar solicitud
                </SubmitButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-edra-bg/50 p-5">
      <h4 className="mb-3 text-sm font-semibold text-edra-ink">{title}</h4>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {children}
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1 text-sm last:border-0">
      <dt className="text-edra-grey">{label}</dt>
      <dd className="text-right font-medium text-edra-ink">{value}</dd>
    </div>
  );
}
