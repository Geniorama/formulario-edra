"use client";

import { FileText } from "lucide-react";
import { Field, SelectField } from "@/components/ui/form-fields";
import {
  PRODUCTS,
  SIZES,
  MATERIALS,
  GEM_TYPES,
  FONT_TYPES,
  FONT_GUIDE_URL,
} from "@/lib/form-options";
import {
  fieldsForProduct,
  ORDER_FIELD_META,
  type OrderFieldKey,
} from "@/lib/product-fields";
import type { OrderState, Errors } from "@/lib/order-utils";

export function OrderFields({
  order,
  onField,
  onProduct,
  errors,
}: {
  order: OrderState;
  onField: (key: OrderFieldKey, value: string) => void;
  onProduct: (value: string) => void;
  errors: Errors;
}) {
  function renderField(key: OrderFieldKey) {
    const meta = ORDER_FIELD_META[key];
    const value = order[key];
    const err = errors[key];

    if (meta.kind === "engraving") {
      return (
        <div key={key}>
          <Field
            label={meta.label}
            value={value}
            onChange={(e) => onField(key, e.target.value)}
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
        onChange={(e) => onField(key, e.target.value)}
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

  const keys = fieldsForProduct(order.product);

  return (
    <div className="space-y-5">
      <SelectField
        label="Selecciona el producto"
        value={order.product}
        onChange={(e) => onProduct(e.target.value)}
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
            {keys
              .filter((k) => ORDER_FIELD_META[k].kind !== "engraving")
              .map(renderField)}
          </div>
          <div className="space-y-5">
            {keys
              .filter((k) => ORDER_FIELD_META[k].kind === "engraving")
              .map(renderField)}
          </div>
        </>
      ) : (
        <p className="text-sm text-edra-grey">
          Selecciona un producto para ver los campos correspondientes.
        </p>
      )}
    </div>
  );
}
