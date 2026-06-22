import {
  fieldsForProduct,
  ORDER_FIELD_META,
  type OrderFieldKey,
} from "@/lib/product-fields";
import { MATERIALS, GEM_TYPES, labelOf } from "@/lib/form-options";

// Estado (string) de los campos de la orden que diligencia el cliente.
export type OrderState = {
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

export const emptyOrder: OrderState = {
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

export type Errors = Record<string, string>;

/** Valida los campos del cliente según el producto seleccionado. */
export function validateOrderState(order: OrderState): Errors {
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

/** Texto a mostrar para un campo de la orden (resuelve etiquetas de enums). */
export function orderFieldDisplay(
  order: Pick<OrderState, OrderFieldKey>,
  key: OrderFieldKey
): string {
  const meta = ORDER_FIELD_META[key];
  const value = order[key];
  if (!value) return "—";
  if (meta.kind === "material") return labelOf(MATERIALS, value);
  if (meta.kind === "gem") return labelOf(GEM_TYPES, value);
  return value;
}
