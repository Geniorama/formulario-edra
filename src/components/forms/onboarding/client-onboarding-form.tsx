"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";
import {
  Field,
  SelectField,
  PhoneField,
  Checkbox,
  SubmitButton,
  FormAlert,
} from "@/components/ui/form-fields";
import { Stepper } from "./stepper";
import {
  DOCUMENT_TYPES,
  CONTACT_MEDIUMS,
  SOCIAL_NETWORKS,
  SHIPPING_COUNTRIES,
  PRODUCTS,
  SIZES,
  MATERIALS,
  GEM_TYPES,
  FONT_TYPES,
  FONT_GUIDE_URL,
  labelOf,
} from "@/lib/form-options";
import {
  fieldsForProduct,
  ORDER_FIELD_META,
  type OrderFieldKey,
} from "@/lib/product-fields";

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
  privacyAccepted: boolean;
};

type Order = {
  product: string;
  size: string;
  sizeLady: string;
  sizeGentleman: string;
  material: string;
  gemType: string;
  engraving: string;
  engravingLady: string;
  engravingGentleman: string;
  fontType: string;
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
  privacyAccepted: false,
};

const emptyOrder: Order = {
  product: "",
  size: "",
  sizeLady: "",
  sizeGentleman: "",
  material: "",
  gemType: "",
  engraving: "",
  engravingLady: "",
  engravingGentleman: "",
  fontType: "",
};

type Errors = Record<string, string>;

export function ClientOnboardingForm({
  initialPersonal,
  initialOrder,
  initialStep = 0,
}: {
  initialPersonal?: Personal;
  initialOrder?: Order;
  initialStep?: number;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), 2));
  const [personal, setPersonal] = useState<Personal>(
    initialPersonal ?? emptyPersonal
  );
  const [order, setOrder] = useState<Order>(initialOrder ?? emptyOrder);
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
  function setO<K extends keyof Order>(key: K, value: Order[K]) {
    setOrder((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }
  // Al cambiar de producto se limpian los campos dependientes y sus errores.
  function selectProduct(product: string) {
    setOrder({ ...emptyOrder, product });
    setTouched((prev) => ({ ...prev, product: true }));
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
    if (personal.address.trim().length < 3) e.address = "Ingresa la dirección";
    if (!personal.privacyAccepted)
      e.privacyAccepted = "Debes aceptar la política de privacidad";
    return e;
  }

  function validateOrder(): Errors {
    const e: Errors = {};
    if (!order.product) {
      e.product = "Selecciona el producto";
      return e;
    }
    for (const key of fieldsForProduct(order.product)) {
      const meta = ORDER_FIELD_META[key];
      const value = order[key];
      if (meta.required && !value) {
        e[key] = `Selecciona ${meta.label.toLowerCase()}`;
      }
      if (meta.kind === "engraving" && value.length > 25) {
        e[key] = "Máximo 25 caracteres";
      }
    }
    return e;
  }

  // Renderiza un campo de la orden según su tipo.
  function renderOrderField(key: OrderFieldKey) {
    const meta = ORDER_FIELD_META[key];
    const value = order[key];
    const err = errors[key];

    if (meta.kind === "engraving") {
      return (
        <div key={key}>
          <Field
            label={meta.label}
            value={value}
            onChange={(e) => setO(key, e.target.value)}
            placeholder="Texto a grabar"
            maxLength={25}
            error={err}
            optional={!meta.required}
          />
          <p className="mt-1 text-xs text-edra-grey">
            {value.length}/25 caracteres
          </p>
        </div>
      );
    }

    const opts: readonly { value: string; label: string }[] =
      meta.kind === "size"
        ? SIZES.map((s) => ({ value: s, label: s }))
        : meta.kind === "material"
          ? MATERIALS
          : meta.kind === "gem"
            ? GEM_TYPES
            : FONT_TYPES.map((f) => ({ value: f, label: f }));

    const select = (
      <SelectField
        label={meta.label}
        value={value}
        onChange={(e) => setO(key, e.target.value)}
        error={err}
        optional={!meta.required}
      >
        <option value="">Selecciona...</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    );

    // El selector de fuente incluye el enlace a la guía visual.
    if (meta.kind === "font") {
      return (
        <div key={key}>
          {select}
          <a
            href={FONT_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-edra hover:text-edra-dark"
          >
            <FileText className="h-3.5 w-3.5" />
            Ver guía de fuentes y símbolos
          </a>
        </div>
      );
    }

    return <div key={key}>{select}</div>;
  }

  function orderFieldDisplay(key: OrderFieldKey): string {
    const meta = ORDER_FIELD_META[key];
    const value = order[key];
    if (!value) return "—";
    if (meta.kind === "material") return labelOf(MATERIALS, value);
    if (meta.kind === "gem") return labelOf(GEM_TYPES, value);
    return value;
  }

  // Guarda el borrador en la BD (datos parciales, sin validar).
  async function saveDraft(stepToSave: number) {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/cliente/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal, order, step: stepToSave, finalize: false }),
      });
      if (res.ok) setSavedMsg("Progreso guardado");
    } catch {
      // Guardado silencioso: no interrumpe el flujo.
    } finally {
      setSaving(false);
    }
  }

  function next() {
    const e = step === 0 ? validatePersonal() : validateOrder();
    if (Object.keys(e).length === 0) {
      const newStep = Math.min(step + 1, STEPS.length - 1);
      setStep(newStep);
      void saveDraft(newStep); // autoguardado al avanzar
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Resalta automáticamente los campos faltantes/ inválidos.
      setTouched((prev) => {
        const t = { ...prev };
        for (const key in e) t[key] = true;
        return t;
      });
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
    const oe = validateOrder();
    if (Object.keys(oe).length > 0) {
      setTouched((prev) => {
        const t = { ...prev };
        for (const key in oe) t[key] = true;
        return t;
      });
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cliente/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal, order, finalize: true }),
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
  const orderErrors = validateOrder();
  const activeErrors: Errors =
    step === 0 ? personalErrors : step === 1 ? orderErrors : {};
  // Solo mostramos el error de un campo si el usuario ya lo tocó.
  const errors: Errors = {};
  for (const key in activeErrors) {
    if (touched[key]) errors[key] = activeErrors[key];
  }
  const stepValid = Object.keys(activeErrors).length === 0;

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
              optional
            />
            <Field
              label="Dirección"
              value={personal.address}
              onChange={(e) => setP("address", e.target.value)}
              placeholder="Dirección completa"
              error={errors.address}
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

      {/* Paso 2: Orden de trabajo (campos dinámicos según el producto) */}
      {step === 1 ? (
        <div className="space-y-5">
          <SelectField
            label="Selecciona el producto"
            value={order.product}
            onChange={(e) => selectProduct(e.target.value)}
            error={errors.product}
          >
            <option value="">Selecciona...</option>
            {PRODUCTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>

          {order.product ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {fieldsForProduct(order.product)
                  .filter((k) => ORDER_FIELD_META[k].kind !== "engraving")
                  .map(renderOrderField)}
              </div>
              <div className="space-y-5">
                {fieldsForProduct(order.product)
                  .filter((k) => ORDER_FIELD_META[k].kind === "engraving")
                  .map(renderOrderField)}
              </div>
            </>
          ) : (
            <p className="text-sm text-edra-grey">
              Selecciona un producto para ver los campos correspondientes.
            </p>
          )}
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
          </SummaryGroup>

          <SummaryGroup title="Orden de trabajo">
            <SummaryRow label="Producto" value={labelOf(PRODUCTS, order.product)} />
            {fieldsForProduct(order.product).map((key) => (
              <SummaryRow
                key={key}
                label={ORDER_FIELD_META[key].label}
                value={orderFieldDisplay(key)}
              />
            ))}
          </SummaryGroup>

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
