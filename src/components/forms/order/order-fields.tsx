"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
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
import { MAX_ORDER_ITEMS } from "@/lib/validations";
import type { OrderItemState, Errors } from "@/lib/order-utils";

/** Campos del cliente para UN producto de la compra. */
export function OrderItemFields({
  item,
  onField,
  onProduct,
  onGemOther,
  errors,
}: {
  item: OrderItemState;
  onField: (key: OrderFieldKey, value: string) => void;
  onProduct: (value: string) => void;
  onGemOther: (value: string) => void;
  errors: Errors;
}) {
  function renderField(key: OrderFieldKey) {
    const meta = ORDER_FIELD_META[key];
    const value = item[key];
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
        ? SIZES
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

    // Al elegir "Otra" gema se pide escribir de cuál se trata.
    if (meta.kind === "gem") {
      return (
        <div key={key} className="space-y-3">
          {select}
          {value === "OTRA" ? (
            <Field
              label="¿Qué tipo de gema?"
              value={item.gemOther}
              onChange={(e) => onGemOther(e.target.value)}
              placeholder="Escribe el tipo de gema"
              maxLength={80}
              error={errors.gemOther}
            />
          ) : null}
        </div>
      );
    }

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

  const keys = fieldsForProduct(item.product);

  return (
    <div className="space-y-5">
      <SelectField
        label="Selecciona el producto"
        value={item.product}
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

      {item.product ? (
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

/** Lista editable de productos: el cliente puede pedir varios en una compra. */
export function OrderItemsEditor({
  items,
  errors,
  onItemField,
  onItemProduct,
  onItemGemOther,
  onAdd,
  onRemove,
}: {
  items: OrderItemState[];
  errors: Errors[];
  onItemField: (index: number, key: OrderFieldKey, value: string) => void;
  onItemProduct: (index: number, value: string) => void;
  onItemGemOther: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-2xl border border-black/5 bg-edra-bg/30 p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-edra-grey">
              Producto {index + 1}
            </p>
            {items.length > 1 ? (
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

          <OrderItemFields
            item={item}
            errors={errors[index] ?? {}}
            onField={(key, value) => onItemField(index, key, value)}
            onProduct={(value) => onItemProduct(index, value)}
            onGemOther={(value) => onItemGemOther(index, value)}
          />
        </div>
      ))}

      {items.length < MAX_ORDER_ITEMS ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-edra/50 px-5 py-2.5 text-sm font-semibold text-edra transition-colors hover:border-edra hover:bg-edra-soft"
        >
          <Plus className="h-4 w-4" />
          Agregar otro producto
        </button>
      ) : (
        <p className="text-xs text-edra-grey">
          Alcanzaste el máximo de {MAX_ORDER_ITEMS} productos por compra.
        </p>
      )}
    </div>
  );
}
