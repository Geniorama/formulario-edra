import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Layout del panel: shell con sidebar + topbar. Exige sesión para todo /dashboard y /admin.
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // El cliente debe completar su registro por pasos antes de usar el panel.
  if (session.user.role === "CLIENTE") {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: session.user.id },
      select: { completed: true },
    });
    if (!profile?.completed) redirect("/completar-registro");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
