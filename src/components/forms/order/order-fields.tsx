"use client";

import { FileText, Lightbulb, Plus, Trash2 } from "lucide-react";
import { Field, SelectField } from "@/components/ui/form-fields";
import { SymbolPicker } from "@/components/forms/order/symbol-picker";
import {
  PRODUCTS,
  SIZES,
  MATERIALS,
  GEM_TYPES,
  materialColorOptionsFor,
} from "@/lib/form-options";
import {
  fieldsForItem,
  engravingGuidesFor,
  engravingHint,
  ORDER_FIELD_META,
  type OrderFieldGroup,
  type OrderFieldKey,
} from "@/lib/product-fields";
import { MAX_ORDER_ITEMS } from "@/lib/validations";
import {
  engravingOptionsFor,
  type OrderItemState,
  type Errors,
} from "@/lib/order-utils";

const ENGRAVING_GROUPS: { group: OrderFieldGroup; title: string }[] = [
  { group: "engraving", title: "Grabado de las argollas" },
  { group: "engravingRing", title: "Grabado del anillo de compromiso" },
];

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

    // Grabado: sin límite de caracteres, solo una sugerencia de legibilidad.
    if (meta.kind === "engraving") {
      return (
        <div key={key}>
          <Field
            label={meta.label}
            value={value}
            onChange={(e) => onField(key, e.target.value)}
            placeholder="Texto a grabar"
            error={err}
            optional={!meta.required}
          />
          <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-edra-dark">
              <Lightbulb className="h-3.5 w-3.5" />
              {engravingHint(item.product, key)}
            </span>
            <span className="text-edra-grey">{value.length} caracteres</span>
          </p>
        </div>
      );
    }

    if (meta.kind === "symbol") {
      return (
        <SymbolPicker
          key={key}
          label={meta.label}
          value={value}
          options={engravingOptionsFor(item, key)}
          onChange={(v) => onField(key, v)}
          error={err}
          optional={!meta.required}
        />
      );
    }

    const opts: readonly { value: string; label: string }[] =
      meta.kind === "size"
        ? SIZES
        : meta.kind === "material"
          ? MATERIALS
          : meta.kind === "color"
            ? materialColorOptionsFor(item.material)
            : meta.kind === "gem"
              ? GEM_TYPES
              : engravingOptionsFor(item, key).map((f) => ({
                  value: f,
                  label: f,
                }));

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

    return <div key={key}>{select}</div>;
  }

  // El color solo aparece cuando el material lo lleva (la plata no).
  const keys = fieldsForItem(item);
  const engravingGroups = ENGRAVING_GROUPS.map((g) => ({
    ...g,
    keys: keys.filter((k) => ORDER_FIELD_META[k].group === g.group),
  })).filter((g) => g.keys.length > 0);

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
              .filter((k) => ORDER_FIELD_META[k].group === "general")
              .map(renderField)}
          </div>

          {engravingGroups.map(({ group, title, keys: groupKeys }) => (
            <div key={group} className="space-y-5">
              {engravingGroups.length > 1 ? (
                <p className="border-t border-black/5 pt-5 text-xs font-semibold uppercase tracking-wide text-edra-grey/80">
                  {title}
                </p>
              ) : null}
              {groupKeys
                .filter((k) => ORDER_FIELD_META[k].kind === "engraving")
                .map(renderField)}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {groupKeys
                  .filter((k) => ORDER_FIELD_META[k].kind !== "engraving")
                  .map(renderField)}
              </div>
              {/* Guías visuales de fuentes y símbolos que aplican al grabado. */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {engravingGuidesFor(item.product, groupKeys[0]).map((guide) => (
                  <a
                    key={guide.href}
                    href={guide.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-edra hover:text-edra-dark"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver guía: {guide.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
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
