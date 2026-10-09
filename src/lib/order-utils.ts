import {
  fieldsForItem,
  fieldsForProduct,
  fontOptionsFor,
  materialKeyForColor,
  symbolOptionsFor,
  ORDER_FIELD_META,
  type OrderFieldKey,
} from "@/lib/product-fields";
import {
  MATERIALS,
  GEM_TYPES,
  labelOf,
  sizeLabel,
  symbolLabel,
  materialColorLabel,
  materialColorOptionsFor,
} from "@/lib/form-options";

// Estado (string) de los campos de un producto de la compra (los del cliente).
export type OrderItemState = Record<OrderFieldKey, string> & {
  product: string;
  /** Gema escrita por el cliente cuando elige "Otra". */
  gemOther: string;
};

export const emptyOrderItem: OrderItemState = {
  product: "",
  size: "",
  sizeLady: "",
  sizeGentleman: "",
  material: "",
  materialLady: "",
  materialGentleman: "",
  materialRing: "",
  materialColor: "",
  materialColorLady: "",
  materialColorGentleman: "",
  materialColorRing: "",
  gemType: "",
  gemOther: "",
  engraving: "",
  engravingLady: "",
  engravingGentleman: "",
  engravingRing: "",
  fontType: "",
  fontTypeRing: "",
  symbol: "",
  symbolRing: "",
};

const ITEM_STATE_KEYS = Object.keys(emptyOrderItem) as (keyof OrderItemState)[];

/** Arma el estado del formulario a partir de un producto guardado en la BD. */
export function toOrderItemState(
  raw: Partial<Record<keyof OrderItemState, string | null>>
): OrderItemState {
  const state = { ...emptyOrderItem };
  for (const key of ITEM_STATE_KEYS) state[key] = raw[key] ?? "";
  // Órdenes anteriores al material por pieza: heredan el material único.
  for (const key of fieldsForProduct(state.product)) {
    if (ORDER_FIELD_META[key].kind === "material" && !state[key]) {
      state[key] = state.material;
    }
  }
  return state;
}

/**
 * Cambia un campo del producto. Al cambiar un material se descartan los
 * colores de esa pieza que ya no aplican (p. ej. al pasar a plata, que no
 * lleva color).
 */
export function withOrderField(
  item: OrderItemState,
  key: OrderFieldKey,
  value: string
): OrderItemState {
  const next = { ...item, [key]: value };
  if (ORDER_FIELD_META[key].kind === "material") {
    const allowed = materialColorOptionsFor(value).map((o) => o.value);
    for (const k of fieldsForProduct(item.product)) {
      if (
        ORDER_FIELD_META[k].kind === "color" &&
        materialKeyForColor(item.product, k) === key &&
        !allowed.includes(next[k])
      ) {
        next[k] = "";
      }
    }
  }
  return next;
}

export type Errors = Record<string, string>;

/** Valida los campos del cliente de un producto según lo que haya elegido. */
export function validateOrderItem(item: OrderItemState): Errors {
  const e: Errors = {};
  if (!item.product) {
    e.product = "Selecciona el producto";
    return e;
  }
  for (const key of fieldsForItem(item)) {
    const meta = ORDER_FIELD_META[key];
    const value = item[key];
    if (meta.required && !value) {
      e[key] = `Selecciona ${meta.label.toLowerCase()}`;
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

/**
 * Opciones de un selector de fuente o símbolo. Si la orden ya tenía guardado
 * un valor que hoy no se ofrece, se conserva para no perderlo al editar.
 */
export function engravingOptionsFor(
  item: OrderItemState,
  key: OrderFieldKey
): readonly string[] {
  const options =
    ORDER_FIELD_META[key].kind === "symbol"
      ? symbolOptionsFor(item.product, key)
      : fontOptionsFor(item.product, key);
  const current = item[key];
  return current && !options.includes(current) ? [...options, current] : options;
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
  if (meta.kind === "color") {
    return materialColorLabel(
      item[materialKeyForColor(item.product, key)],
      value
    );
  }
  if (meta.kind === "size") return sizeLabel(value);
  if (meta.kind === "symbol") return symbolLabel(value);
  if (meta.kind === "gem") {
    const label = labelOf(GEM_TYPES, value);
    return value === "OTRA" && item.gemOther
      ? `${label}: ${item.gemOther}`
      : label;
  }
  return value;
}
