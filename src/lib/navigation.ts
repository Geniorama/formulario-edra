import {
  LayoutDashboard,
  Users,
  Gem,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles que ven el módulo. `undefined` = visible para cualquier rol autenticado. */
  roles?: Role[];
  description?: string;
};

/**
 * Módulos del panel. Para agregar uno nuevo:
 *   1. Añade una entrada aquí (con su rol si aplica).
 *   2. Crea su página en `src/app/(panel)/<ruta>/page.tsx`.
 * El sidebar y las tarjetas del dashboard se actualizan solos.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Resumen de tu cuenta",
  },
  {
    label: "Mis órdenes",
    href: "/mis-ordenes",
    icon: Gem,
    roles: ["CLIENTE"],
    description: "Consulta y crea tus solicitudes de joyas",
  },
  {
    label: "Órdenes",
    href: "/asesor/ordenes",
    icon: ClipboardList,
    roles: ["ASESOR", "ADMIN"],
    description: "Gestiona las órdenes de los clientes",
  },
  {
    label: "Usuarios",
    href: "/admin",
    icon: Users,
    roles: ["ADMIN"],
    description: "Gestiona usuarios, roles e invitaciones",
  },
];

/** Filtra los módulos visibles para un rol. */
export function navForRole(role?: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || (!!role && item.roles.includes(role))
  );
}
