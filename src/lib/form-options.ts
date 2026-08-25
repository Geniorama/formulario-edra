// Etiquetas y listas de opciones del flujo del cliente.
// (Los valores coinciden con los enums de Prisma.)

export const DOCUMENT_TYPES = [
  { value: "CEDULA_CIUDADANIA", label: "Cédula de ciudadanía" },
  { value: "CEDULA_EXTRANJERIA", label: "Cédula de extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
] as const;

export const CONTACT_MEDIUMS = [
  { value: "REFERENCIA", label: "Referencia" },
  { value: "RED_SOCIAL", label: "Red social" },
  { value: "PAGINA_WEB", label: "Página web" },
  { value: "BUSCADOR_WEB", label: "Buscador web" },
] as const;

export const SOCIAL_NETWORKS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "X", label: "X" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
] as const;

export const SHIPPING_COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
  "Estados Unidos",
] as const;

// El código postal solo es obligatorio para envíos fuera de Colombia.
export const LOCAL_COUNTRY = "Colombia";

export function postalCodeRequired(shippingCountry?: string | null): boolean {
  return Boolean(shippingCountry) && shippingCountry !== LOCAL_COUNTRY;
}

export const PRODUCTS = [
  { value: "ARGOLLAS", label: "Argollas" },
  { value: "ANILLOS", label: "Anillos" },
  { value: "SET_MATRIMONIAL", label: "Set matrimonial" },
  { value: "CINTILLO", label: "Cintillo" },
  { value: "CADENA", label: "Cadena" },
  { value: "PULSERA", label: "Pulsera" },
  { value: "TOPOS", label: "Topos" },
  { value: "CANDONGAS", label: "Candongas" },
  { value: "DIJE", label: "Dije" },
  { value: "PERSONALIZADO", label: "Producto personalizado / otro" },
] as const;

// Tallas de 3 a 13 en cuartos. El valor se guarda en decimal ("5.25") y se
// muestra en cuartos ("5 1/4"); las tallas antiguas ("3.5") siguen sirviendo.
const QUARTER_LABELS = ["", " 1/4", " 1/2", " 3/4"] as const;

export const SIZES: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let whole = 3; whole <= 13; whole++) {
    for (let q = 0; q < QUARTER_LABELS.length; q++) {
      if (whole === 13 && q > 0) break; // la lista termina en la talla 13
      out.push({
        value: String(whole + q * 0.25),
        label: `${whole}${QUARTER_LABELS[q]}`,
      });
    }
  }
  return out;
})();

/** Muestra una talla en cuartos ("5.25" → "5 1/4"). */
export function sizeLabel(value?: string | null): string {
  if (!value) return "—";
  return SIZES.find((s) => s.value === value)?.label ?? value;
}

export const MATERIALS = [
  { value: "ORO_10K", label: "Oro 10k" },
  { value: "ORO_14K", label: "Oro 14k" },
  { value: "ORO_18K", label: "Oro 18k" },
  { value: "ORO_18K_PLATA", label: "Oro 18k + plata" },
  { value: "PLATA_925", label: "Plata 925" },
  { value: "PLATA_950", label: "Plata 950" },
  { value: "PLATINO_950", label: "Platino 950" },
] as const;

export const GEM_TYPES = [
  { value: "DIAMANTE_NATURAL", label: "Diamante Natural" },
  { value: "DIAMANTE_LABORATORIO", label: "Diamante Laboratorio" },
  { value: "ESMERALDA", label: "Esmeralda" },
  { value: "ZAFIRO", label: "Zafiro" },
  { value: "RUBI", label: "Rubí" },
  { value: "TANZANITA", label: "Tanzanita" },
  { value: "TURMALINA", label: "Turmalina" },
  { value: "AGUAMARINA", label: "Aguamarina" },
  { value: "AMATISTA", label: "Amatista" },
  { value: "TOPACIO", label: "Topacio" },
  { value: "CITRINO", label: "Citrino" },
  { value: "PERIDOTO", label: "Peridoto" },
  { value: "GRANATE", label: "Granate" },
  { value: "MOISSANITA", label: "Moissanita" },
  { value: "ZIRCON_SUIZO_SINTETICO", label: "Zircón suizo sintético" },
  { value: "OTRA", label: "Otra" },
  { value: "SIN_PIEDRA", label: "Sin piedra" },
] as const;

// Fuentes para grabado según la "Guía de fuentes y símbolos Edra"
// (public/guia-fuentes-edra.pdf). Numeradas igual que la guía.
export const FONT_TYPES = [
  "01. Edwardian Script ITC",
  "02. Lucida Calligraphy",
  "03. Mathilde",
  "04. Japan",
  "05. Segoe Print",
  "06. Jokerman",
  "07. Gessele Regular",
  "08. Farmhouse",
  "09. Bradley Hand ITC",
  "10. Lucida Hand",
  "11. Alison Regular",
  "12. Pristina",
  "13. Vladimir Script",
  "14. Script MT Bold",
  "15. Brock Script",
  "16. Birdhave",
  "17. Arial",
  "18. Talking to the Moon",
  "19. Ar Decode",
  "20. Mistral",
  "21. Frenchs Script MT",
  "22. Century Gothic",
  "23. Chiller",
  "24. Scriptina",
  "25. Agenda King",
  "26. Valentine Cute",
  "27. Forte",
  "28. Harlow Solid Italic",
  "29. Harrington",
  "30. Rage Italic",
  "31. Monotype Corsiva",
] as const;

// Ruta pública de la guía visual de fuentes y símbolos.
export const FONT_GUIDE_URL = "/guia-fuentes-edra.pdf";

// Helper para mostrar la etiqueta a partir del valor de un enum.
export function labelOf(
  options: readonly { value: string; label: string }[],
  value?: string | null
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
