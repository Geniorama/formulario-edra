import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { TokenType } from "@/generated/prisma/client";

// Minutos de validez para cada tipo de token.
const EXPIRY_MINUTES: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 60 * 24, // 24 horas
  PASSWORD_RESET: 60, // 1 hora
  ACCOUNT_INVITE: 60 * 24 * 3, // 3 días
};

function generateTokenValue(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Crea un token de un solo uso para un usuario, eliminando cualquier token
 * previo del mismo tipo.
 */
export async function createToken(userId: string, type: TokenType) {
  await prisma.token.deleteMany({ where: { userId, type } });

  const token = generateTokenValue();
  const expires = new Date(Date.now() + EXPIRY_MINUTES[type] * 60 * 1000);

  await prisma.token.create({
    data: { token, type, userId, expires },
  });

  return token;
}

/**
 * Valida un token. Si es válido y no ha expirado, lo consume (lo elimina) y
 * devuelve el userId asociado. Si no, devuelve null.
 */
export async function consumeToken(
  token: string,
  type: TokenType
): Promise<string | null> {
  const record = await prisma.token.findUnique({ where: { token } });

  if (!record || record.type !== type) {
    return null;
  }

  // Token expirado: lo limpiamos.
  if (record.expires < new Date()) {
    await prisma.token.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  await prisma.token.delete({ where: { id: record.id } });
  return record.userId;
}
