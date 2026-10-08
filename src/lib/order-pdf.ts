import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

// Generación del PDF de una orden (pdf-lib, fuentes estándar: sin archivos).

export type PdfSection = { title: string; rows: [label: string, value: string][] };

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 48;
const LABEL_WIDTH = 190;
const VALUE_X = MARGIN + LABEL_WIDTH + 12;
const VALUE_WIDTH = PAGE.width - MARGIN - VALUE_X;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

const TEAL = rgb(0.078, 0.588, 0.651); // #1496a6
const INK = rgb(0.235, 0.224, 0.212); // #3c3936
const GREY = rgb(0.431, 0.435, 0.443); // #6e6f71
const RULE = rgb(0.9, 0.92, 0.92);

/** Las fuentes estándar solo cubren WinAnsi: lo demás se reemplaza por "?". */
function encodable(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text.replace(/[\t  ]/g, " "))
    .map((ch) => (supported.has(ch.codePointAt(0) ?? 0) ? ch : "?"))
    .join("");
}

/** Parte un texto en líneas que quepan en `maxWidth`. */
function wrap(font: PDFFont, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const fits = (s: string) => font.widthOfTextAtSize(s, FONT_SIZE) <= maxWidth;

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

export async function buildOrderPdf(input: {
  orderNumber: string;
  subtitle: string;
  sections: PdfSection[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Orden ${input.orderNumber} · Joyería Edra`);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  /** Reserva espacio vertical; si no cabe, pasa a una página nueva. */
  function need(height: number) {
    if (y - height < MARGIN) {
      page = doc.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
    }
  }

  // Encabezado
  page.drawText("EDRA JEWELRY", { x: MARGIN, y: y - 18, size: 20, font: bold, color: TEAL });
  const number = encodable(bold, input.orderNumber);
  page.drawText(number, {
    x: PAGE.width - MARGIN - bold.widthOfTextAtSize(number, 14),
    y: y - 16,
    size: 14,
    font: bold,
    color: INK,
  });
  y -= 36;
  page.drawText("Orden de trabajo", { x: MARGIN, y, size: 11, font: regular, color: GREY });
  const subtitle = encodable(regular, input.subtitle);
  page.drawText(subtitle, {
    x: PAGE.width - MARGIN - regular.widthOfTextAtSize(subtitle, FONT_SIZE),
    y,
    size: FONT_SIZE,
    font: regular,
    color: GREY,
  });
  y -= 12;
  page.drawRectangle({ x: MARGIN, y, width: PAGE.width - MARGIN * 2, height: 2, color: TEAL });
  y -= 10;

  for (const section of input.sections) {
    if (section.rows.length === 0) continue;

    need(LINE_HEIGHT * 3 + 18);
    y -= 18;
    page.drawText(encodable(bold, section.title.toUpperCase()), {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: TEAL,
    });
    y -= 6;

    for (const [label, value] of section.rows) {
      const labelLines = wrap(regular, encodable(regular, label), LABEL_WIDTH);
      const valueLines = wrap(bold, encodable(bold, value || "—"), VALUE_WIDTH);
      const count = Math.max(labelLines.length, valueLines.length);

      // Un valor larguísimo puede ocupar varias páginas: se dibuja por líneas.
      for (let i = 0; i < count; i++) {
        need(LINE_HEIGHT + 6);
        y -= LINE_HEIGHT;
        if (labelLines[i]) {
          page.drawText(labelLines[i], { x: MARGIN, y, size: FONT_SIZE, font: regular, color: GREY });
        }
        if (valueLines[i]) {
          page.drawText(valueLines[i], { x: VALUE_X, y, size: FONT_SIZE, font: bold, color: INK });
        }
      }
      y -= 5;
      page.drawRectangle({ x: MARGIN, y, width: PAGE.width - MARGIN * 2, height: 0.5, color: RULE });
    }
  }

  return doc.save();
}
