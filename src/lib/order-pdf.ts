import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Generación del PDF de una orden (pdf-lib, fuentes estándar: sin archivos).
// La orden siempre sale en UNA sola hoja: el texto se reduce lo necesario y,
// si quedaría muy pequeño, las filas se reparten en dos columnas.

export type PdfSection = { title: string; rows: [label: string, value: string][] };

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

const TEAL = rgb(0.078, 0.588, 0.651); // #1496a6
const INK = rgb(0.235, 0.224, 0.212); // #3c3936
const GREY = rgb(0.431, 0.435, 0.443); // #6e6f71
const RULE = rgb(0.9, 0.92, 0.92);

type Fonts = { regular: PDFFont; bold: PDFFont };
type Content = { orderNumber: string; subtitle: string; sections: PdfSection[] };
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
  const columnWidth =
    columns === 1 ? CONTENT_WIDTH : (CONTENT_WIDTH - GUTTER) / 2;

  // La etiqueta mide lo mismo en todas las filas para que los valores alineen.
  const labelWidth = columnWidth * LABEL_RATIO;
  const cell = (row: [string, string], x: number, width: number): Cell => {
    return {
      x,
      valueX: x + labelWidth + labelGap,
      labelLines: wrap(regular, row[0], labelWidth, size),
      valueLines: wrap(bold, row[1], width - labelWidth - labelGap, size),
    };
  };

  let y = PAGE.height - MARGIN;

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
    if (section.rows.length === 0) continue;

    y -= 16 * scale;
    page?.drawText(section.title, {
      x: MARGIN,
      y,
      size: 9 * scale,
      font: bold,
      color: TEAL,
    });
    y -= 5 * scale;

    // Cada franja lleva una fila (ancho completo) o dos filas lado a lado.
    const bands: Cell[][] = [];
    if (columns === 1) {
      for (const row of section.rows) bands.push([cell(row, MARGIN, columnWidth)]);
    } else {
      let left: Cell | null = null;
      for (const row of section.rows) {
        const half = cell(row, MARGIN, columnWidth);
        // Los textos largos (notas, descripciones) ocupan todo el ancho.
        if (half.valueLines.length > 2) {
          if (left) bands.push([left]);
          left = null;
          bands.push([cell(row, MARGIN, CONTENT_WIDTH)]);
        } else if (left) {
          bands.push([left, cell(row, MARGIN + columnWidth + GUTTER, columnWidth)]);
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
        for (const c of band) {
          if (c.labelLines[i]) {
            page?.drawText(c.labelLines[i], { x: c.x, y, size, font: regular, color: GREY });
          }
          if (c.valueLines[i]) {
            page?.drawText(c.valueLines[i], { x: c.valueX, y, size, font: bold, color: INK });
          }
        }
      }
      y -= 4 * scale;
      page?.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH, height: 0.5, color: RULE });
    }
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
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Orden ${input.orderNumber} · Joyería Edra`);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const content: Content = {
    orderNumber: encodable(fonts.bold, input.orderNumber),
    subtitle: encodable(fonts.regular, input.subtitle),
    sections: input.sections.map((section) => ({
      title: encodable(fonts.bold, section.title.toUpperCase()),
      rows: section.rows.map(([label, value]): [string, string] => [
        encodable(fonts.regular, label),
        encodable(fonts.bold, value || "—"),
      ]),
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
