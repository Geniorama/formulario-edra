import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";

type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/** Garantiza que quien llama es un administrador autenticado. */
export async function requireAdmin(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
