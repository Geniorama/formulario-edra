import {
  fieldsForProduct,
  ORDER_FIELD_META,
  type OrderFieldKey,
} from "@/lib/product-fields";
import {
  MATERIALS,
  GEM_TYPES,
  labelOf,
  sizeLabel,
} from "@/lib/form-options";

// Estado (string) de los campos de un producto de la compra (los del cliente).
export type OrderItemState = {
  product: string;
  size: string;
  sizeLady: string;
  sizeGentleman: string;
  material: string;
  gemType: string;
  /** Gema escrita por el cliente cuando elige "Otra". */
  gemOther: string;
  engraving: string;
  engravingLady: string;
  engravingGentleman: string;
  fontType: string;
};

export const emptyOrderItem: OrderItemState = {
  product: "",
  size: "",
  sizeLady: "",
  sizeGentleman: "",
  material: "",
  gemType: "",
  gemOther: "",
  engraving: "",
  engravingLady: "",
  engravingGentleman: "",
  fontType: "",
};

export type Errors = Record<string, string>;

/** Valida los campos del cliente de un producto según lo que haya elegido. */
export function validateOrderItem(item: OrderItemState): Errors {
  const e: Errors = {};
  if (!item.product) {
    e.product = "Selecciona el producto";
    return e;
  }
  for (const key of fieldsForProduct(item.product)) {
    const meta = ORDER_FIELD_META[key];
    const value = item[key];
    if (meta.required && !value) {
      e[key] = `Selecciona ${meta.label.toLowerCase()}`;
    }
    if (meta.kind === "engraving" && value.length > 25) {
      e[key] = "Máximo 25 caracteres";
    }
    // Si eligió "Otra" gema, debe escribir cuál.
    if (meta.kind === "gem" && value === "OTRA" && !item.gemOther.trim()) {
      e.gemOther = "Indica qué tipo de gema deseas";
    }
  }
  return e;
}

/** Valida todos los productos de la compra (un mapa de errores por producto). */
export function validateOrderItems(items: OrderItemState[]): Errors[] {
  return items.map(validateOrderItem);
}

export function hasErrors(list: Errors[]): boolean {
  return list.some((e) => Object.keys(e).length > 0);
}

/** Texto a mostrar para un campo del producto (resuelve etiquetas de enums). */
export function orderFieldDisplay(
  item: Partial<OrderItemState>,
  key: OrderFieldKey
): string {
  const meta = ORDER_FIELD_META[key];
  const value = item[key];
  if (!value) return "—";
  if (meta.kind === "material") return labelOf(MATERIALS, value);
  if (meta.kind === "size") return sizeLabel(value);
  if (meta.kind === "gem") {
    const label = labelOf(GEM_TYPES, value);
    return value === "OTRA" && item.gemOther
      ? `${label}: ${item.gemOther}`
      : label;
  }
  return value;
}
