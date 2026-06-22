"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { Role } from "@/generated/prisma/enums";

export function DashboardShell({
  user,
  children,
}: {
  user: { name: string; email: string; role?: Role };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} onMenu={() => setOpen(true)} />
        <main className="flex-1 bg-edra-bg p-5 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
