"use client";

import { signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { NotificationsBell } from "./notifications-bell";
import type { Role } from "@/generated/prisma/enums";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "E";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Topbar({
  user,
  onMenu,
}: {
  user: { name: string; email: string; role?: Role };
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/5 bg-white/85 px-5 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-lg p-1.5 text-edra-ink hover:bg-edra-soft lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <NotificationsBell />
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-edra-ink">{user.name}</p>
          <p className="text-xs text-edra-grey">
            {user.role ? ROLE_LABELS[user.role] : ""}
          </p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-edra text-sm font-semibold text-white">
          {initials(user.name)}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-full border border-edra-grey/30 px-3 py-1.5 text-xs font-medium text-edra-grey transition-colors hover:border-edra hover:text-edra"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
