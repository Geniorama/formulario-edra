// Campos de la "Orden de trabajo" que diligencia el CLIENTE, según el producto.
// (Los campos del Asesor se manejan en el módulo de asesores.)

export type OrderFieldKey =
  | "size"
  | "sizeLady"
  | "sizeGentleman"
  | "material"
  | "gemType"
  | "engraving"
  | "engravingLady"
  | "engravingGentleman"
  | "fontType";

export type OrderFieldKind = "size" | "material" | "gem" | "font" | "engraving";

export const ORDER_FIELD_META: Record<
  OrderFieldKey,
  { label: string; kind: OrderFieldKind; required: boolean }
> = {
  size: { label: "Talla", kind: "size", required: true },
  sizeLady: { label: "Talla dama", kind: "size", required: true },
  sizeGentleman: { label: "Talla caballero", kind: "size", required: true },
  material: { label: "Material", kind: "material", required: true },
  gemType: { label: "Tipo de gemas", kind: "gem", required: true },
  engraving: { label: "Grabado", kind: "engraving", required: false },
  engravingLady: {
    label: "Grabado argolla dama",
    kind: "engraving",
    required: false,
  },
  engravingGentleman: {
    label: "Grabado argolla caballero",
    kind: "engraving",
    required: false,
  },
  fontType: { label: "Tipo de fuente (grabado)", kind: "font", required: false },
};

// Campos del cliente por producto.
export const PRODUCT_FIELDS: Record<string, OrderFieldKey[]> = {
  ARGOLLAS: [
    "sizeLady",
    "sizeGentleman",
    "material",
    "gemType",
    "engravingLady",
    "engravingGentleman",
    "fontType",
  ],
  ANILLOS: ["size", "material", "gemType"],
  SET_MATRIMONIAL: [
    "sizeLady",
    "sizeGentleman",
    "material",
    "gemType",
    "engravingLady",
    "engravingGentleman",
    "fontType",
  ],
  CINTILLO: ["sizeLady", "material", "gemType", "engraving", "fontType"],
  CADENA: ["material"],
  PULSERA: ["material"],
  TOPOS: ["material", "gemType"],
  CANDONGAS: ["material", "gemType"],
  DIJE: ["material", "gemType"],
  PERSONALIZADO: ["material", "gemType"],
};

export function fieldsForProduct(product?: string): OrderFieldKey[] {
  if (!product) return [];
  return PRODUCT_FIELDS[product] ?? [];
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
  gemNotes: { label: "Observación sobre las gemas", multiline: true },
};

export const ADVISOR_PRODUCT_FIELDS: Record<string, AdvisorFieldKey[]> = {
  ARGOLLAS: [
    "weightLady",
    "weightGentleman",
    "widthLady",
    "widthGentleman",
    "model",
    "manufacturingNotes",
    "gemNotes",
  ],
  ANILLOS: ["model", "manufacturingNotes", "gemNotes"],
  SET_MATRIMONIAL: [
    "widthLady",
    "widthGentleman",
    "model",
    "manufacturingNotes",
    "gemNotes",
  ],
  CINTILLO: ["model", "manufacturingNotes", "gemNotes"],
  CADENA: ["weightApprox", "weaveType", "length", "manufacturingNotes"],
  PULSERA: ["length", "model", "manufacturingNotes", "gemNotes"],
  TOPOS: ["model", "manufacturingNotes", "gemNotes"],
  CANDONGAS: ["model", "manufacturingNotes", "gemNotes"],
  DIJE: ["model", "manufacturingNotes", "gemNotes"],
  PERSONALIZADO: [
    "productName",
    "productDescription",
    "manufacturingNotes",
    "gemNotes",
  ],
};

export function advisorFieldsForProduct(product?: string): AdvisorFieldKey[] {
  if (!product) return [];
  return ADVISOR_PRODUCT_FIELDS[product] ?? [];
}
