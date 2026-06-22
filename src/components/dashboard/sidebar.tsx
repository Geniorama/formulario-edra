"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/logo";
import { navForRole } from "@/lib/navigation";
import type { Role } from "@/generated/prisma/enums";

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role?: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <>
      {/* Overlay en móvil */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-black/5 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-24 items-center justify-between border-b border-black/5 px-5">
            <Link href="/dashboard" onClick={onClose} aria-label="Inicio">
              <Logo className="h-16" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-edra-grey lg:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-edra text-white shadow-sm"
                      : "text-edra-ink hover:bg-edra-soft"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-black/5 p-4 text-[11px] text-edra-grey">
            © {new Date().getFullYear()} EDRA Jewelry
          </div>
        </div>
      </aside>
    </>
  );
}
