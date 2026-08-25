import { z } from "zod";
import { postalCodeRequired } from "@/lib/form-options";

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

export const adminUpdateUserSchema = z
  .object({
    role: roleEnum.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.active !== undefined, {
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

// Medios de pago. Los tres primeros son heredados (ya no se ofrecen en la UI,
// pero siguen siendo válidos para las órdenes antiguas).
export const paymentMethodEnum = z.enum([
  "TARJETA_CREDITO",
  "TARJETA_DEBITO",
  "TRANSFERENCIA",
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
  "FREDDY",
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

const engravingField = z
  .string()
  .trim()
  .max(25, "Máximo 25 caracteres")
  .optional()
  .or(z.literal(""));

// Un producto dentro de la compra.
export const orderItemSchema = z
  .object({
    product: productEnum,
    size: z.string().optional().or(z.literal("")),
    sizeLady: z.string().optional().or(z.literal("")),
    sizeGentleman: z.string().optional().or(z.literal("")),
    material: materialEnum,
    gemType: gemEnum.optional().or(z.literal("")),
    gemOther: z.string().trim().max(80).optional().or(z.literal("")),
    engraving: engravingField,
    engravingLady: engravingField,
    engravingGentleman: engravingField,
    fontType: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
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

export type PersonalDataInput = z.infer<typeof personalBase>;
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
