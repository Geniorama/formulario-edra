import { z } from "zod";
import {
  postalCodeRequired,
  materialColorOptionsFor,
} from "@/lib/form-options";
import {
  fieldsForItem,
  materialKeyForColor,
  ORDER_FIELD_META,
} from "@/lib/product-fields";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Escribe tus nombres")
      .max(60, "El nombre es demasiado largo"),
    lastName: z
      .string()
      .trim()
      .min(2, "Escribe tus apellidos")
      .max(60, "El apellido es demasiado largo"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Ingresa un correo electrónico válido"),
    phone: z
      .string()
      .trim()
      // Formato internacional E.164: +<código país><número>, p. ej. +573001234567
      .regex(/^\+[1-9]\d{6,14}$/, "Ingresa un número de teléfono válido")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña es demasiado larga"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const roleEnum = z.enum(["ADMIN", "ASESOR", "CLIENTE"]);

export const adminCreateUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Escribe los nombres")
    .max(60, "El nombre es demasiado largo"),
  lastName: z
    .string()
    .trim()
    .min(2, "Escribe los apellidos")
    .max(60, "El apellido es demasiado largo"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido"),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Ingresa un número de teléfono válido")
    .optional()
    .or(z.literal("")),
  role: roleEnum,
});

// Rol/estado (tabla de usuarios) y datos básicos de la cuenta (pantalla de
// edición, solo para clientes y asesores). Todos los campos son opcionales.
export const adminUpdateUserSchema = adminCreateUserSchema
  // El correo no se puede cambiar.
  .omit({ role: true, email: true })
  .partial()
  .extend({
    role: roleEnum.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Nada que actualizar",
  });

// ───────────── Flujo del cliente (registro por pasos) ─────────────

export const documentTypeEnum = z.enum([
  "CEDULA_CIUDADANIA",
  "CEDULA_EXTRANJERIA",
  "PASAPORTE",
]);
export const contactMediumEnum = z.enum([
  "REFERENCIA",
  "RED_SOCIAL",
  "PAGINA_WEB",
  "BUSCADOR_WEB",
]);
export const socialNetworkEnum = z.enum([
  "FACEBOOK",
  "X",
  "INSTAGRAM",
  "LINKEDIN",
]);
export const productEnum = z.enum([
  "ARGOLLAS",
  "ANILLOS",
  "SET_MATRIMONIAL",
  "CINTILLO",
  "CADENA",
  "PULSERA",
  "TOPOS",
  "CANDONGAS",
  "DIJE",
  "PERSONALIZADO",
]);
export const materialEnum = z.enum([
  "ORO_10K",
  "ORO_14K",
  "ORO_18K",
  "ORO_18K_PLATA",
  "PLATA_925",
  "PLATA_950",
  "PLATINO_950",
  "PLATINO_950_ORO_18K",
]);
export const orderStatusEnum = z.enum([
  "EN_TRAMITE",
  "EN_FABRICACION",
  "ENGASTE",
  "NOVEDAD_FABRICACION",
  "FINALIZADO",
  "ENTREGADO",
  "DESISTIDO",
]);

export const deliveryTypeEnum = z.enum([
  "ENVIO_INTERNACIONAL",
  "ENVIO_NACIONAL",
  "ENVIO_BOGOTA",
  "RECOGER_EN_TIENDA",
]);

// Medios de pago. Los cuatro primeros son heredados (ya no se ofrecen en la
// UI, pero siguen siendo válidos para las órdenes antiguas).
export const paymentMethodEnum = z.enum([
  "TARJETA_CREDITO",
  "TARJETA_DEBITO",
  "TRANSFERENCIA",
  "FREDDY",
  // Con FE
  "EFECTIVO",
  "ADDI",
  "BANCOLOMBIA_EDUARDO",
  "DAVIVIENDA_EDUARDO",
  "DATAFONO_EDUARDO",
  // Sin FE
  "WESTERN_WEENDY",
  "BANCOLOMBIA_WEENDY",
  "DATAFONO_ROJO",
  "SISTECREDITO",
  "NEQUI_SANTIAGO",
  "NEQUI_DON_MAURO",
  "ESTABAN_CLAUDIA_JM",
  "HECTOR_NARANJO",
  "DAVIVIENDA_ERIKA",
  "SUSA",
  "LUZ",
  "JIMMY",
  "DON_FREDDY",
  "OTRO",
]);

export const invoiceTypeEnum = z.enum(["CON_FE", "SIN_FE"]);

export const gemEnum = z.enum([
  "DIAMANTE_NATURAL",
  "DIAMANTE_LABORATORIO",
  "ESMERALDA",
  "ZAFIRO",
  "RUBI",
  "TANZANITA",
  "TURMALINA",
  "AGUAMARINA",
  "AMATISTA",
  "TOPACIO",
  "CITRINO",
  "PERIDOTO",
  "GRANATE",
  "MOISSANITA",
  "ZIRCON_SUIZO_SINTETICO",
  "OTRA",
  "SIN_PIEDRA",
]);

// Fecha de un input date ("YYYY-MM-DD") que no esté en el futuro.
const birthDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !isNaN(d.getTime()) && d.getTime() <= Date.now();
  }, "Ingresa una fecha válida")
  .optional()
  .or(z.literal(""));

const personalBase = z.object({
  documentType: documentTypeEnum,
  documentNumber: z
    .string()
    .trim()
    .min(4, "Ingresa el número de documento")
    .max(30, "El número es demasiado largo"),
  whatsapp: z
    .string()
    .trim()
    // Formato internacional E.164, p. ej. +573001234567
    .regex(/^\+[1-9]\d{6,14}$/, "Ingresa un número de WhatsApp válido"),
  contactMedium: contactMediumEnum,
  socialNetwork: socialNetworkEnum.optional().or(z.literal("")),
  socialLink: z.string().trim().max(200).optional().or(z.literal("")),
  shippingCountry: z.string().trim().min(1, "Selecciona el país de envío"),
  cityState: z.string().trim().min(1, "Ingresa la ciudad o estado"),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().min(3, "Ingresa la dirección de envío"),
  neighborhood: z.string().trim().max(80).optional().or(z.literal("")),
  addressDetails: z.string().trim().max(200).optional().or(z.literal("")),
  birthDate: birthDateField,
  privacyAccepted: z.boolean(),
});

export const personalDataSchema = personalBase.superRefine((data, ctx) => {
  // El código postal solo es obligatorio para envíos fuera de Colombia.
  if (postalCodeRequired(data.shippingCountry) && !data.postalCode) {
    ctx.addIssue({
      path: ["postalCode"],
      code: "custom",
      message: "El código postal es obligatorio para envíos internacionales",
    });
  }
  if (data.contactMedium === "RED_SOCIAL") {
    if (!data.socialNetwork) {
      ctx.addIssue({
        path: ["socialNetwork"],
        code: "custom",
        message: "Selecciona la red social",
      });
    }
    if (!data.socialLink) {
      ctx.addIssue({
        path: ["socialLink"],
        code: "custom",
        message: "Ingresa el enlace de tu perfil",
      });
    }
  }
  if (!data.privacyAccepted) {
    ctx.addIssue({
      path: ["privacyAccepted"],
      code: "custom",
      message: "Debes aceptar la política de privacidad",
    });
  }
});

// Los grabados no tienen límite de caracteres para el cliente (solo una
// sugerencia de legibilidad); el tope es un resguardo contra envíos abusivos.
const engravingField = z.string().trim().max(1000).optional().or(z.literal(""));
const optionalText = z.string().trim().max(80).optional().or(z.literal(""));

const optionalMaterial = materialEnum.optional().or(z.literal(""));

// Un producto dentro de la compra.
export const orderItemSchema = z
  .object({
    product: productEnum,
    size: z.string().optional().or(z.literal("")),
    sizeLady: z.string().optional().or(z.literal("")),
    sizeGentleman: z.string().optional().or(z.literal("")),
    material: optionalMaterial,
    materialLady: optionalMaterial,
    materialGentleman: optionalMaterial,
    materialRing: optionalMaterial,
    materialColor: optionalText,
    materialColorLady: optionalText,
    materialColorGentleman: optionalText,
    materialColorRing: optionalText,
    gemType: gemEnum.optional().or(z.literal("")),
    gemOther: z.string().trim().max(80).optional().or(z.literal("")),
    engraving: engravingField,
    engravingLady: engravingField,
    engravingGentleman: engravingField,
    engravingRing: engravingField,
    fontType: optionalText,
    fontTypeRing: optionalText,
    symbol: optionalText,
    symbolRing: optionalText,
  })
  .superRefine((data, ctx) => {
    // El material es obligatorio en cada pieza que lo pide, y su color
    // cuando el material lo lleva (la plata y el platino 950 no).
    for (const key of fieldsForItem(data)) {
      const meta = ORDER_FIELD_META[key];
      const value = data[key] ?? "";
      const valid =
        meta.kind === "material"
          ? Boolean(value)
          : meta.kind === "color"
            ? materialColorOptionsFor(
                data[materialKeyForColor(data.product, key)]
              ).some((o) => o.value === value)
            : true;
      if (!valid) {
        ctx.addIssue({
          path: [key],
          code: "custom",
          message: `Selecciona ${meta.label.toLowerCase()}`,
        });
      }
    }
    // Si eligió "Otra" gema, debe escribir cuál.
    if (data.gemType === "OTRA" && !data.gemOther) {
      ctx.addIssue({
        path: ["gemOther"],
        code: "custom",
        message: "Indica qué tipo de gema deseas",
      });
    }
  });

// Máximo de productos por compra (evita envíos abusivos).
export const MAX_ORDER_ITEMS = 15;

// Una compra puede incluir varios productos.
export const workOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "Agrega al menos un producto")
    .max(MAX_ORDER_ITEMS, `Máximo ${MAX_ORDER_ITEMS} productos por compra`),
});

export const clientOnboardingSchema = z.object({
  personal: personalDataSchema,
  order: workOrderSchema,
});

// Edición de los datos del cliente desde la orden (solo ADMIN). Es permisiva:
// el perfil puede estar a medio diligenciar y el admin solo corrige datos.
const adminText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const adminClientDataSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Escribe los nombres")
    .max(60, "El nombre es demasiado largo"),
  lastName: z
    .string()
    .trim()
    .min(2, "Escribe los apellidos")
    .max(60, "El apellido es demasiado largo"),
  documentType: documentTypeEnum.optional().or(z.literal("")),
  documentNumber: adminText(30),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Ingresa un número de WhatsApp válido")
    .optional()
    .or(z.literal("")),
  birthDate: birthDateField,
  shippingCountry: adminText(60),
  cityState: adminText(120),
  postalCode: adminText(20),
  address: adminText(200),
  neighborhood: adminText(80),
  addressDetails: adminText(200),
});

export type PersonalDataInput = z.infer<typeof personalBase>;
export type AdminClientDataInput = z.infer<typeof adminClientDataSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type WorkOrderInput = z.infer<typeof workOrderSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña es demasiado larga"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
