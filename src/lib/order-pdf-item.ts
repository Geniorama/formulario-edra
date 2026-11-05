import { PRODUCTS, labelOf } from "@/lib/form-options";
import {
  fieldsForItem,
  ORDER_FIELD_META,
  advisorFieldsForProduct,
  ADVISOR_FIELD_META,
  type AdvisorFieldKey,
  type OrderFieldKey,
  type OrderFieldKind,
} from "@/lib/product-fields";
import { orderFieldDisplay, toOrderItemState } from "@/lib/order-utils";
import type { PdfBlock, PdfRow, PdfSection } from "@/lib/order-pdf";

// Qué va en la columna de cada pieza de un juego (argollas o set matrimonial).
type Piece = {
  title: string;
  material: OrderFieldKey[]; // el primero que aplique al producto
  color: OrderFieldKey;
  size?: OrderFieldKey;
  width?: AdvisorFieldKey;
  weight?: AdvisorFieldKey;
  engraving: OrderFieldKey;
  font: OrderFieldKey;
  symbol: OrderFieldKey;
};

const PIECES: Piece[] = [
  {
    title: "Dama",
    material: ["materialLady", "material"],
    color: "materialColorLady",
    size: "sizeLady",
    width: "widthLady",
    weight: "weightLady",
    engraving: "engravingLady",
    font: "fontType",
    symbol: "symbol",
  },
  {
    title: "Caballero",
    material: ["materialGentleman", "material"],
    color: "materialColorGentleman",
    size: "sizeGentleman",
    width: "widthGentleman",
    weight: "weightGentleman",
    engraving: "engravingGentleman",
    font: "fontType",
    symbol: "symbol",
  },
  {
    title: "Anillo de compromiso",
    material: ["materialRing"],
    color: "materialColorRing",
    engraving: "engravingRing",
    font: "fontTypeRing",
    symbol: "symbolRing",
  },
];

/** Orden de lectura del joyero: material, tallas y luego lo demás. */
const KIND_ORDER: OrderFieldKind[] = ["material", "color", "size", "gem"];

/**
 * Sección del PDF de un producto. Lo primero es qué es y su descripción (lo
 * que lee el joyero); luego material y tallas y, de últimos, los grabados. Los
 * juegos llevan un cuadro por pieza, con la información hacia abajo.
 */
export function orderItemPdfSection(
  item: Parameters<typeof toOrderItemState>[0] &
    Partial<Record<AdvisorFieldKey, string | null>>,
  title: string
): PdfSection {
  const view = toOrderItemState(item);
  const clientKeys = fieldsForItem(view);
  const advisorKeys = advisorFieldsForProduct(view.product);

  const client = (key: OrderFieldKey | undefined, label?: string): PdfRow[] =>
    key && clientKeys.includes(key)
      ? [[label ?? ORDER_FIELD_META[key].label, orderFieldDisplay(view, key)]]
      : [];
  // Datos técnicos del asesor: solo los que ya están diligenciados.
  const advisor = (key: AdvisorFieldKey | undefined, label?: string): PdfRow[] => {
    const value = key ? item[key]?.trim() : "";
    return key && value && advisorKeys.includes(key)
      ? [[label ?? ADVISOR_FIELD_META[key].label, value]]
      : [];
  };

  const description = item.finalDescription?.trim();
  const blocks: PdfBlock[] = description
    ? [
        {
          kind: "box",
          label: ADVISOR_FIELD_META.finalDescription.label,
          value: description,
        },
      ]
    : [];

  // Lo que no va en la columna de una pieza ni en los grabados.
  const generalKeys = clientKeys
    .filter((key) => ORDER_FIELD_META[key].group === "general")
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(ORDER_FIELD_META[a].kind) -
        KIND_ORDER.indexOf(ORDER_FIELD_META[b].kind)
    );
  const engravingKeys = clientKeys.filter(
    (key) => ORDER_FIELD_META[key].group !== "general"
  );

  if (clientKeys.includes("sizeGentleman")) {
    const pieces = PIECES.filter((piece) =>
      piece.material.some((key) => clientKeys.includes(key))
    );
    const pieceKeys = new Set<string>(
      pieces.flatMap((piece) => [
        ...piece.material,
        piece.color,
        piece.size ?? "",
        piece.width ?? "",
        piece.weight ?? "",
      ])
    );
    blocks.push({
      kind: "columns",
      columns: pieces.map((piece) => ({
        title: piece.title,
        rows: [
          ...client(
            piece.material.find((key) => clientKeys.includes(key)),
            "Material"
          ),
          ...client(piece.color, "Color"),
          ...client(piece.size, "Talla"),
          ...advisor(piece.width, "Ancho aprox."),
          ...advisor(piece.weight, "Peso aprox."),
        ],
      })),
    });
    blocks.push({
      kind: "rows",
      rows: [
        ...generalKeys
          .filter((key) => !pieceKeys.has(key))
          .flatMap((key) => client(key)),
        ...advisorKeys
          .filter((key) => key !== "productName" && !pieceKeys.has(key))
          .flatMap((key) => advisor(key)),
      ],
    });
    blocks.push({
      kind: "columns",
      title: "Grabados",
      columns: pieces.map((piece) => ({
        title: piece.title,
        rows: [
          ...client(piece.engraving, "Grabado"),
          ...client(piece.font, "Fuente"),
          ...client(piece.symbol, "Símbolo"),
        ],
      })),
    });
  } else {
    blocks.push({
      kind: "rows",
      rows: [
        ...generalKeys.flatMap((key) => client(key)),
        ...advisorKeys
          .filter((key) => key !== "productName")
          .flatMap((key) => advisor(key)),
        ...engravingKeys.flatMap((key) => client(key)),
      ],
    });
  }

  return {
    title,
    rows: [
      ["Producto", labelOf(PRODUCTS, view.product)],
      ...advisor("productName"),
    ],
    blocks,
  };
}
