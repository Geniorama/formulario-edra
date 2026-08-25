// Envío de correos vía API de ZeptoMail (no SMTP).
// Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html

// Endpoint regional: api.zeptomail.com (global) o api.zeptomail.eu (Europa).
const ZEPTOMAIL_URL =
  process.env.ZEPTOMAIL_URL ?? "https://api.zeptomail.com/v1.1/email";
// Send Mail Token de ZeptoMail (con o sin el prefijo "Zoho-enczapikey ").
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN;
// Remitente: debe ser una dirección/dominio verificado en ZeptoMail.
const FROM_ADDRESS =
  process.env.ZEPTOMAIL_FROM ?? "no-responder@joyeriaedra.com";
const FROM_NAME = process.env.ZEPTOMAIL_FROM_NAME ?? "Joyería Edra";

const BRAND = {
  teal: "#1496a6",
  tealDark: "#0f7e8c",
  ink: "#3c3936",
  grey: "#6e6f71",
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Envía un correo a través de la API REST de ZeptoMail. */
async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!ZEPTOMAIL_TOKEN) {
    throw new Error("Falta la variable de entorno ZEPTOMAIL_TOKEN");
  }

  // El header Authorization debe incluir el prefijo "Zoho-enczapikey".
  const authorization = ZEPTOMAIL_TOKEN.startsWith("Zoho-enczapikey")
    ? ZEPTOMAIL_TOKEN
    : `Zoho-enczapikey ${ZEPTOMAIL_TOKEN}`;

  const res = await fetch(ZEPTOMAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      from: { address: FROM_ADDRESS, name: FROM_NAME },
      to: [{ email_address: { address: opts.to } }],
      subject: opts.subject,
      htmlbody: opts.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ZeptoMail respondió ${res.status}: ${detail}`);
  }
}

/** Plantilla base con la identidad de Joyería Edra. */
function baseTemplate(opts: {
  title: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  footerNote: string;
}) {
  const logoUrl = `${appUrl()}/logo-edra-color.png`;
  return `
  <div style="margin:0;padding:0;background:#f3f7f7;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${logoUrl}" alt="Joyería Edra" width="160" style="display:inline-block;height:auto;" />
      </div>
      <div style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 8px 24px rgba(20,150,166,0.08);">
        <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND.ink};">${opts.title}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.grey};">${opts.intro}</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${opts.buttonUrl}"
             style="display:inline-block;background:${BRAND.teal};color:#ffffff;text-decoration:none;
                    font-size:15px;font-weight:600;padding:14px 32px;border-radius:999px;">
            ${opts.buttonLabel}
          </a>
        </div>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.grey};">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin:0;font-size:12px;word-break:break-all;color:${BRAND.teal};">
          <a href="${opts.buttonUrl}" style="color:${BRAND.teal};">${opts.buttonUrl}</a>
        </p>
      </div>
      <p style="text-align:center;margin:24px 0 0;font-size:12px;color:${BRAND.grey};">
        ${opts.footerNote}
      </p>
      <p style="text-align:center;margin:8px 0 0;font-size:12px;color:${BRAND.grey};">
        © ${new Date().getFullYear()} Joyería Edra. Todos los derechos reservados.
      </p>
    </div>
  </div>`;
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${appUrl()}/api/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Confirma tu correo · Joyería Edra",
    html: baseTemplate({
      title: "¡Bienvenido a Joyería Edra!",
      intro:
        "Gracias por registrarte. Para activar tu cuenta y comenzar a descubrir tu estilo EDRA, confirma tu correo electrónico haciendo clic en el botón.",
      buttonLabel: "Confirmar mi correo",
      buttonUrl: url,
      footerNote:
        "Este enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.",
    }),
  });
}

export async function sendInviteEmail(
  to: string,
  token: string,
  roleLabel: string
) {
  const url = `${appUrl()}/establecer-contrasena?token=${token}`;
  await sendEmail({
    to,
    subject: "Tu cuenta en Joyería Edra · Establece tu contraseña",
    html: baseTemplate({
      title: "Te damos la bienvenida a Joyería Edra",
      intro: `Se creó una cuenta para ti con el rol de <strong>${roleLabel}</strong>. Para activarla, establece tu contraseña haciendo clic en el botón.`,
      buttonLabel: "Establecer mi contraseña",
      buttonUrl: url,
      footerNote:
        "Este enlace caduca en 3 días. Si no esperabas esta invitación, puedes ignorar este correo.",
    }),
  });
}

/** Aviso de cambio de estado dirigido al asesor de la orden (no al cliente). */
export async function sendOrderStatusEmail(
  to: string,
  orderNumber: string,
  statusLabel: string,
  orderId: string
) {
  const url = `${appUrl()}/asesor/ordenes/${orderId}`;
  await sendEmail({
    to,
    subject: `Orden ${orderNumber} · ${statusLabel}`,
    html: baseTemplate({
      title: "Actualización de una orden",
      intro: `El estado de la orden <strong>${orderNumber}</strong> cambió a <strong>${statusLabel}</strong>. Ingresa para ver los detalles.`,
      buttonLabel: "Ver la orden",
      buttonUrl: url,
      footerNote:
        "Recibes este correo porque gestionas órdenes en Joyería Edra.",
    }),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${appUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Restablece tu contraseña · Joyería Edra",
    html: baseTemplate({
      title: "Restablece tu contraseña",
      intro:
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva contraseña.",
      buttonLabel: "Crear nueva contraseña",
      buttonUrl: url,
      footerNote:
        "Este enlace caduca en 1 hora. Si no solicitaste el cambio, ignora este correo y tu contraseña seguirá igual.",
    }),
  });
}
