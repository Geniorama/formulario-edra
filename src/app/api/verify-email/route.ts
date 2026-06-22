import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl()}/login?verify=invalid`);
  }

  const userId = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!userId) {
    return NextResponse.redirect(`${appUrl()}/login?verify=invalid`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(`${appUrl()}/login?verify=success`);
}
