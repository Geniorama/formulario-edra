import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

// Generación del PDF de una orden (pdf-lib, fuentes estándar: sin archivos).
// La orden siempre sale en UNA sola hoja: el texto se reduce lo necesario y,
// si quedaría muy pequeño, las filas se reparten en dos columnas.

export type PdfRow = [label: string, value: string];
export type PdfBlock =
  // Filas sueltas, como las de `PdfSection.rows`.
  | { kind: "rows"; rows: PdfRow[] }
  // Cuadro resaltado a todo el ancho (la descripción del producto).
  | { kind: "box"; label: string; value: string }
  // Cuadro con una columna por pieza y la información hacia abajo.
  | {
      kind: "columns";
      title?: string;
      columns: { title: string; rows: PdfRow[] }[];
    };
export type PdfSection = {
  title: string;
  rows?: PdfRow[];
  blocks?: PdfBlock[];
  /** Reserva a la derecha de la sección el cuadro de la imagen del proyecto. */
  withImage?: boolean;
};

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 36;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const GUTTER = 18; // separación entre columnas
const LABEL_RATIO = 0.38; // parte de la columna que ocupa la etiqueta
const FONT_SIZE = 10; // tamaños base (escala 1)
const LINE_HEIGHT = 13;
/** Por debajo de esta escala en una columna se prueba el diseño a dos columnas. */
const SINGLE_COLUMN_MIN_SCALE = 0.8;
const MIN_SCALE = 0.3;
const SCALE_STEP = 0.02;
const IMAGE_BOX = 130; // lado del cuadro de la imagen del proyecto (escala 1)
const BOX_PADDING = 6;

const TEAL = rgb(0.078, 0.588, 0.651); // #1496a6
const INK = rgb(0.235, 0.224, 0.212); // #3c3936
const GREY = rgb(0.431, 0.435, 0.443); // #6e6f71
const RULE = rgb(0.9, 0.92, 0.92);
const BOX_BORDER = rgb(0.62, 0.8, 0.83);
const BOX_FILL = rgb(0.93, 0.97, 0.98);

type Fonts = { regular: PDFFont; bold: PDFFont };
type Content = {
  orderNumber: string;
  subtitle: string;
  sections: PdfSection[];
  image: PDFImage | null;
};
type Cell = { x: number; valueX: number; labelLines: string[]; valueLines: string[] };

/** Las fuentes estándar solo cubren WinAnsi: lo demás se reemplaza por "?". */
function encodable(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text.replace(/[\t  ]/g, " "))
    .map((ch) => (supported.has(ch.codePointAt(0) ?? 0) ? ch : "?"))
    .join("");
}

/** Parte un texto en líneas que quepan en `maxWidth`. */
function wrap(font: PDFFont, text: string, maxWidth: number, size: number): string[] {
  const lines: string[] = [];
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;

  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (let word of paragraph.split(" ").filter(Boolean)) {
      // Palabras más anchas que la columna: se cortan por caracteres.
      while (!fits(word)) {
        let cut = word.length - 1;
        while (cut > 1 && !fits(word.slice(0, cut))) cut--;
        if (line) lines.push(line);
        lines.push(word.slice(0, cut));
        line = "";
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

/**
 * Recorre (y, si recibe `page`, dibuja) la orden con `columns` columnas y los
 * tamaños multiplicados por `scale`. Devuelve la `y` final: si queda por debajo
 * del margen inferior, el contenido no cabe en la hoja.
 */
function layout(
  content: Content,
  fonts: Fonts,
  columns: 1 | 2,
  scale: number,
  page: PDFPage | null
): number {
  const { regular, bold } = fonts;
  const size = FONT_SIZE * scale;
  const lineHeight = LINE_HEIGHT * scale;
  const labelGap = 8 * scale;

  const cell = (
    row: PdfRow,
    x: number,
    width: number,
    labelWidth: number
  ): Cell => {
    return {
      x,
      valueX: x + labelWidth + labelGap,
      labelLines: wrap(regular, row[0], labelWidth, size),
      valueLines: wrap(bold, row[1], width - labelWidth - labelGap, size),
    };
  };

  let y = PAGE.height - MARGIN;

  const drawCellLine = (c: Cell, line: number) => {
    if (c.labelLines[line]) {
      page?.drawText(c.labelLines[line], {
        x: c.x,
        y,
        size,
        font: regular,
        color: GREY,
      });
    }
    if (c.valueLines[line]) {
      page?.drawText(c.valueLines[line], {
        x: c.valueX,
        y,
        size,
        font: bold,
        color: INK,
      });
    }
  };

  const drawRows = (rows: PdfRow[], width: number) => {
    const columnWidth = columns === 1 ? width : (width - GUTTER) / 2;
    // La etiqueta mide lo mismo en todas las filas para que los valores alineen.
    const labelWidth = columnWidth * LABEL_RATIO;

    // Cada franja lleva una fila (ancho completo) o dos filas lado a lado.
    const bands: Cell[][] = [];
    if (columns === 1) {
      for (const row of rows) bands.push([cell(row, MARGIN, columnWidth, labelWidth)]);
    } else {
      let left: Cell | null = null;
      for (const row of rows) {
        const half = cell(row, MARGIN, columnWidth, labelWidth);
        // Los textos largos (notas, descripciones) ocupan todo el ancho.
        if (half.valueLines.length > 2) {
          if (left) bands.push([left]);
          left = null;
          bands.push([cell(row, MARGIN, width, labelWidth)]);
        } else if (left) {
          bands.push([
            left,
            cell(row, MARGIN + columnWidth + GUTTER, columnWidth, labelWidth),
          ]);
          left = null;
        } else {
          left = half;
        }
      }
      if (left) bands.push([left]);
    }

    for (const band of bands) {
      const count = Math.max(
        ...band.map((c) => Math.max(c.labelLines.length, c.valueLines.length))
      );
      for (let i = 0; i < count; i++) {
        y -= lineHeight;
        for (const c of band) drawCellLine(c, i);
      }
      y -= 4 * scale;
      page?.drawRectangle({ x: MARGIN, y, width, height: 0.5, color: RULE });
    }
  };

  const drawBox = (label: string, value: string, width: number) => {
    const padding = BOX_PADDING * scale;
    const valueSize = size * 1.1;
    const valueHeight = lineHeight * 1.1;
    const lines = wrap(bold, value, width - padding * 2, valueSize);

    y -= padding;
    const height = padding * 2 + lineHeight + lines.length * valueHeight;
    page?.drawRectangle({
      x: MARGIN,
      y: y - height,
      width,
      height,
      color: BOX_FILL,
      borderColor: BOX_BORDER,
      borderWidth: 0.75,
    });
    y -= padding + lineHeight * 0.8;
    page?.drawText(label, {
      x: MARGIN + padding,
      y,
      size: size * 0.9,
      font: bold,
      color: TEAL,
    });
    y -= lineHeight * 0.2;
    for (const line of lines) {
      y -= valueHeight;
      page?.drawText(line, {
        x: MARGIN + padding,
        y,
        size: valueSize,
        font: bold,
        color: INK,
      });
    }
    y -= padding;
  };

  const drawColumns = (
    block: Extract<PdfBlock, { kind: "columns" }>,
    width: number
  ) => {
    const padding = BOX_PADDING * scale;
    const columnWidth = width / block.columns.length;
    const innerWidth = columnWidth - padding * 2;
    const labelWidth = innerWidth * LABEL_RATIO;
    const cells = block.columns.map((column, c) =>
      column.rows.map((row) =>
        cell(row, MARGIN + columnWidth * c + padding, innerWidth, labelWidth)
      )
    );
    const rowCount = Math.max(...cells.map((rows) => rows.length));

    y -= padding;
    if (block.title) {
      y -= lineHeight;
      page?.drawText(block.title, {
        x: MARGIN,
        y,
        size: size * 0.9,
        font: bold,
        color: TEAL,
      });
      y -= 3 * scale;
    }

    const top = y;
    y -= lineHeight;
    block.columns.forEach((column, c) => {
      page?.drawText(column.title, {
        x: MARGIN + columnWidth * c + padding,
        y,
        size,
        font: bold,
        color: TEAL,
      });
    });
    y -= 3 * scale;
    page?.drawRectangle({ x: MARGIN, y, width, height: 0.5, color: BOX_BORDER });

    // Las filas de todas las columnas van a la misma altura.
    for (let r = 0; r < rowCount; r++) {
      const row = cells.flatMap((rows) => (rows[r] ? [rows[r]] : []));
      const count = Math.max(
        ...row.map((c) => Math.max(c.labelLines.length, c.valueLines.length))
      );
      for (let i = 0; i < count; i++) {
        y -= lineHeight;
        for (const c of row) drawCellLine(c, i);
      }
      y -= 3 * scale;
    }
    y -= padding * 0.5;

    page?.drawRectangle({
      x: MARGIN,
      y,
      width,
      height: top - y,
      borderColor: BOX_BORDER,
      borderWidth: 0.75,
    });
    for (let c = 1; c < block.columns.length; c++) {
      page?.drawRectangle({
        x: MARGIN + columnWidth * c,
        y,
        width: 0.5,
        height: top - y,
        color: BOX_BORDER,
      });
    }
  };

  // Cuadro de la imagen del proyecto: si aún no hay imagen, queda vacío.
  const drawImageBox = (top: number): number => {
    const side = IMAGE_BOX * scale;
    const x = PAGE.width - MARGIN - side;
    page?.drawText("IMAGEN DEL PROYECTO", {
      x,
      y: top,
      size: 9 * scale,
      font: bold,
      color: TEAL,
    });
    const bottom = top - 5 * scale - side;
    if (content.image) {
      const padding = 3 * scale;
      const inner = side - padding * 2;
      const ratio = Math.min(
        inner / content.image.width,
        inner / content.image.height
      );
      const width = content.image.width * ratio;
      const height = content.image.height * ratio;
      page?.drawImage(content.image, {
        x: x + (side - width) / 2,
        y: bottom + (side - height) / 2,
        width,
        height,
      });
    }
    page?.drawRectangle({
      x,
      y: bottom,
      width: side,
      height: side,
      borderColor: BOX_BORDER,
      borderWidth: 0.75,
    });
    return bottom;
  };

  // Encabezado
  const numberSize = 14 * scale;
  page?.drawText("EDRA JEWELRY", {
    x: MARGIN,
    y: y - 18 * scale,
    size: 20 * scale,
    font: bold,
    color: TEAL,
  });
  page?.drawText(content.orderNumber, {
    x: PAGE.width - MARGIN - bold.widthOfTextAtSize(content.orderNumber, numberSize),
    y: y - 16 * scale,
    size: numberSize,
    font: bold,
    color: INK,
  });
  y -= 36 * scale;
  page?.drawText("Orden de trabajo", {
    x: MARGIN,
    y,
    size: 11 * scale,
    font: regular,
    color: GREY,
  });
  page?.drawText(content.subtitle, {
    x: PAGE.width - MARGIN - regular.widthOfTextAtSize(content.subtitle, size),
    y,
    size,
    font: regular,
    color: GREY,
  });
  y -= 12 * scale;
  page?.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH, height: 2, color: TEAL });
  y -= 8 * scale;

  for (const section of content.sections) {
    const hasBlockContent = section.blocks?.some(
      (block) => block.kind !== "rows" || block.rows.length > 0
    );
    if (!section.rows?.length && !hasBlockContent) continue;

    y -= 16 * scale;
    page?.drawText(section.title, {
      x: MARGIN,
      y,
      size: 9 * scale,
      font: bold,
      color: TEAL,
    });
    const imageBottom = section.withImage ? drawImageBox(y) : null;
    y -= 5 * scale;

    const width =
      imageBottom === null
        ? CONTENT_WIDTH
        : CONTENT_WIDTH - IMAGE_BOX * scale - GUTTER;

    if (section.rows) drawRows(section.rows, width);
    for (const block of section.blocks ?? []) {
      if (block.kind === "rows") drawRows(block.rows, width);
      else if (block.kind === "box") drawBox(block.label, block.value, width);
      else drawColumns(block, width);
    }

    if (imageBottom !== null) y = Math.min(y, imageBottom);
  }

  return y;
}

/** Mayor escala (de 1 hacia abajo) con la que el contenido cabe en una hoja. */
function fitScale(content: Content, fonts: Fonts, columns: 1 | 2): number {
  let scale = 1;
  while (scale > MIN_SCALE && layout(content, fonts, columns, scale, null) < MARGIN) {
    scale -= SCALE_STEP;
  }
  return Math.max(scale, MIN_SCALE);
}

export async function buildOrderPdf(input: {
  orderNumber: string;
  subtitle: string;
  sections: PdfSection[];
  image?: { data: Uint8Array; type: string | null } | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Orden ${input.orderNumber} · Joyería Edra`);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const encodeRows = (rows: PdfRow[]) =>
    rows.map(([label, value]): PdfRow => [
      encodable(fonts.regular, label),
      encodable(fonts.bold, value || "—"),
    ]);

  // Un archivo dañado no debe impedir descargar la orden: queda el cuadro vacío.
  let image: PDFImage | null = null;
  if (input.image) {
    try {
      image =
        input.image.type === "image/png"
          ? await doc.embedPng(input.image.data)
          : await doc.embedJpg(input.image.data);
    } catch (error) {
      console.error("No se pudo incrustar la imagen del proyecto", error);
    }
  }

  const content: Content = {
    orderNumber: encodable(fonts.bold, input.orderNumber),
    subtitle: encodable(fonts.regular, input.subtitle),
    image,
    sections: input.sections.map((section) => ({
      ...section,
      title: encodable(fonts.bold, section.title.toUpperCase()),
      rows: section.rows && encodeRows(section.rows),
      blocks: section.blocks?.map((block): PdfBlock => {
        if (block.kind === "rows") {
          return { kind: "rows", rows: encodeRows(block.rows) };
        }
        if (block.kind === "box") {
          return {
            kind: "box",
            label: encodable(fonts.bold, block.label),
            value: encodable(fonts.bold, block.value),
          };
        }
        return {
          kind: "columns",
          title: block.title && encodable(fonts.bold, block.title),
          columns: block.columns.map((column) => ({
            title: encodable(fonts.bold, column.title),
            rows: encodeRows(column.rows),
          })),
        };
      }),
    })),
  };

  // Una columna mientras el texto siga siendo cómodo de leer; si no, se usa el
  // diseño (una o dos columnas) que permita la letra más grande.
  let columns: 1 | 2 = 1;
  let scale = fitScale(content, fonts, 1);
  if (scale < SINGLE_COLUMN_MIN_SCALE) {
    const twoColumnScale = fitScale(content, fonts, 2);
    if (twoColumnScale > scale) {
      columns = 2;
      scale = twoColumnScale;
    }
  }

  const page = doc.addPage([PAGE.width, PAGE.height]);
  layout(content, fonts, columns, scale, page);

  return doc.save();
}
