// Campos de la "Orden de trabajo" que diligencia el CLIENTE, según el producto.
// (Los campos del Asesor se manejan en el módulo de asesores.)

import {
  FONT_TYPES,
  THIN_RING_FONTS,
  ENGAGEMENT_RING_FONTS,
  SYMBOLS,
  THIN_RING_SYMBOLS,
  ENGRAVING_GUIDES,
  THIN_RING_GUIDES,
  materialColorOptionsFor,
  type EngravingGuide,
} from "@/lib/form-options";

export type OrderFieldKey =
  | "size"
  | "sizeLady"
  | "sizeGentleman"
  | "material"
  | "materialColor"
  | "materialColorLady"
  | "materialColorGentleman"
  | "materialColorRing"
  | "gemType"
  | "engraving"
  | "engravingLady"
  | "engravingGentleman"
  | "engravingRing"
  | "fontType"
  | "fontTypeRing"
  | "symbol"
  | "symbolRing";

export type OrderFieldKind =
  | "size"
  | "material"
  | "color"
  | "gem"
  | "font"
  | "symbol"
  | "engraving";

/**
 * Bloque del formulario al que pertenece el campo: los datos generales, el
 * grabado principal (argollas / cintillo) o el del anillo de compromiso.
 */
export type OrderFieldGroup = "general" | "engraving" | "engravingRing";

export const ORDER_FIELD_META: Record<
  OrderFieldKey,
  {
    label: string;
    kind: OrderFieldKind;
    required: boolean;
    group: OrderFieldGroup;
  }
> = {
  size: { label: "Talla", kind: "size", required: true, group: "general" },
  sizeLady: {
    label: "Talla dama",
    kind: "size",
    required: true,
    group: "general",
  },
  sizeGentleman: {
    label: "Talla caballero",
    kind: "size",
    required: true,
    group: "general",
  },
  material: {
    label: "Material",
    kind: "material",
    required: true,
    group: "general",
  },
  materialColor: {
    label: "Color material",
    kind: "color",
    required: true,
    group: "general",
  },
  materialColorLady: {
    label: "Color material dama",
    kind: "color",
    required: true,
    group: "general",
  },
  materialColorGentleman: {
    label: "Color material hombre",
    kind: "color",
    required: true,
    group: "general",
  },
  materialColorRing: {
    label: "Color material anillo",
    kind: "color",
    required: true,
    group: "general",
  },
  gemType: {
    label: "Tipo de gemas",
    kind: "gem",
    required: true,
    group: "general",
  },
  engraving: {
    label: "Grabado",
    kind: "engraving",
    required: false,
    group: "engraving",
  },
  engravingLady: {
    label: "Grabado argolla dama",
    kind: "engraving",
    required: false,
    group: "engraving",
  },
  engravingGentleman: {
    label: "Grabado argolla caballero",
    kind: "engraving",
    required: false,
    group: "engraving",
  },
  engravingRing: {
    label: "Grabado anillo de compromiso",
    kind: "engraving",
    required: false,
    group: "engravingRing",
  },
  fontType: {
    label: "Tipo de fuente (grabado)",
    kind: "font",
    required: false,
    group: "engraving",
  },
  fontTypeRing: {
    label: "Fuente anillo de compromiso",
    kind: "font",
    required: false,
    group: "engravingRing",
  },
  symbol: {
    label: "Símbolo (grabado)",
    kind: "symbol",
    required: false,
    group: "engraving",
  },
  symbolRing: {
    label: "Símbolo anillo de compromiso",
    kind: "symbol",
    required: false,
    group: "engravingRing",
  },
};

// Campos del cliente por producto.
export const PRODUCT_FIELDS: Record<string, OrderFieldKey[]> = {
  ARGOLLAS: [
    "sizeLady",
    "sizeGentleman",
    "material",
    "materialColorLady",
    "materialColorGentleman",
    "gemType",
    "engravingLady",
    "engravingGentleman",
    "fontType",
    "symbol",
  ],
  ANILLOS: ["size", "material", "materialColor", "gemType"],
  // Argollas (dama y caballero) + anillo de compromiso.
  SET_MATRIMONIAL: [
    "sizeLady",
    "sizeGentleman",
    "material",
    "materialColorLady",
    "materialColorGentleman",
    "materialColorRing",
    "gemType",
    "engravingLady",
    "engravingGentleman",
    "fontType",
    "symbol",
    "engravingRing",
    "fontTypeRing",
    "symbolRing",
  ],
  CINTILLO: [
    "sizeLady",
    "material",
    "materialColor",
    "gemType",
    "engraving",
    "fontType",
    "symbol",
  ],
  CADENA: ["material", "materialColor"],
  PULSERA: ["material", "materialColor"],
  TOPOS: ["material", "materialColor", "gemType"],
  CANDONGAS: ["material", "materialColor", "gemType"],
  DIJE: ["material", "materialColor", "gemType"],
  PERSONALIZADO: ["material", "materialColor", "gemType"],
};

export function fieldsForProduct(product?: string): OrderFieldKey[] {
  if (!product) return [];
  return PRODUCT_FIELDS[product] ?? [];
}

/**
 * Campos que aplican a un producto ya diligenciado: los de color solo cuando
 * el material elegido lleva color (la plata no).
 */
export function fieldsForItem(item: {
  product?: string | null;
  material?: string | null;
}): OrderFieldKey[] {
  const hasColor = materialColorOptionsFor(item.material).length > 0;
  return fieldsForProduct(item.product ?? undefined).filter(
    (key) => hasColor || ORDER_FIELD_META[key].kind !== "color"
  );
}

// ─────────── Grabados: fuentes, símbolos, guías y sugerencias ───────────

/** ¿El grabado va en una sortija delgada (cintillo o anillo de compromiso)? */
function isThinEngraving(product: string, key: OrderFieldKey): boolean {
  return (
    product === "CINTILLO" || ORDER_FIELD_META[key].group === "engravingRing"
  );
}

/** Fuentes que se ofrecen para un campo de fuente según el producto. */
export function fontOptionsFor(
  product: string,
  key: OrderFieldKey
): readonly string[] {
  if (key === "fontTypeRing") return ENGAGEMENT_RING_FONTS;
  return isThinEngraving(product, key) ? THIN_RING_FONTS : FONT_TYPES;
}

/** Símbolos que se ofrecen para un campo de símbolo según el producto. */
export function symbolOptionsFor(
  product: string,
  key: OrderFieldKey
): readonly string[] {
  return isThinEngraving(product, key) ? THIN_RING_SYMBOLS : SYMBOLS;
}

/** Guías visuales que aplican al grabado de un campo. */
export function engravingGuidesFor(
  product: string,
  key: OrderFieldKey
): readonly EngravingGuide[] {
  return isThinEngraving(product, key) ? THIN_RING_GUIDES : ENGRAVING_GUIDES;
}

/** Sugerencia de legibilidad que acompaña a cada campo de grabado. */
export function engravingHint(product: string, key: OrderFieldKey): string {
  return isThinEngraving(product, key)
    ? "Sugerencia de legibilidad de 15 a 25 caracteres"
    : "Sugerencia de legibilidad de 25 a 35 caracteres";
}

// ─────────── Campos diligenciados por el ASESOR (por producto) ───────────

export type AdvisorFieldKey =
  | "weightApprox"
  | "weightLady"
  | "weightGentleman"
  | "widthLady"
  | "widthGentleman"
  | "model"
  | "weaveType"
  | "length"
  | "productName"
  | "productDescription"
  | "manufacturingNotes"
  | "finalDescription"
  | "gemNotes";

export const ADVISOR_FIELD_META: Record<
  AdvisorFieldKey,
  { label: string; multiline: boolean }
> = {
  weightApprox: { label: "Peso aprox.", multiline: false },
  weightLady: { label: "Peso aprox. dama", multiline: false },
  weightGentleman: { label: "Peso aprox. caballero", multiline: false },
  widthLady: { label: "Ancho aprox. dama", multiline: false },
  widthGentleman: { label: "Ancho aprox. caballero", multiline: false },
  model: { label: "Modelo", multiline: false },
  weaveType: { label: "Tipo de tejido", multiline: false },
  length: { label: "Largo", multiline: false },
  productName: { label: "Nombre del producto", multiline: false },
  productDescription: {
    label: "Tipo de producto (tamaño, forma, acabado…)",
    multiline: true,
  },
  manufacturingNotes: {
    label: "Observaciones de fabricación",
    multiline: true,
  },
  finalDescription: { label: "Descripción del producto", multiline: true },
  gemNotes: { label: "Observación sobre las gemas", multiline: true },
};

/** Campos técnicos que se guardan en cada producto de la compra. */
export const ADVISOR_ITEM_KEYS = (
  Object.keys(ADVISOR_FIELD_META) as AdvisorFieldKey[]
).filter((k) => k !== "manufacturingNotes");

// Nota: `manufacturingNotes` (Observaciones de fabricación) no va aquí: se
// diligencia al final del paso "Datos finales", igual para toda la compra.
// `finalDescription` tampoco: se pide para cada producto en el paso 1.
export const ADVISOR_PRODUCT_FIELDS: Record<string, AdvisorFieldKey[]> = {
  ARGOLLAS: [
    "weightLady",
    "weightGentleman",
    "widthLady",
    "widthGentleman",
    "model",
    "gemNotes",
  ],
  ANILLOS: ["model", "gemNotes"],
  SET_MATRIMONIAL: ["widthLady", "widthGentleman", "model", "gemNotes"],
  CINTILLO: ["model", "gemNotes"],
  CADENA: ["weightApprox", "weaveType", "length"],
  PULSERA: ["length", "model", "gemNotes"],
  TOPOS: ["model", "gemNotes"],
  CANDONGAS: ["model", "gemNotes"],
  DIJE: ["model", "gemNotes"],
  PERSONALIZADO: ["productName", "productDescription", "gemNotes"],
};

export function advisorFieldsForProduct(product?: string): AdvisorFieldKey[] {
  if (!product) return [];
  return ADVISOR_PRODUCT_FIELDS[product] ?? [];
}
