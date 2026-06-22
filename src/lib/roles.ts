import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  ASESOR: "Asesor",
  CLIENTE: "Cliente",
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CLIENTE", label: ROLE_LABELS.CLIENTE },
  { value: "ASESOR", label: ROLE_LABELS.ASESOR },
  { value: "ADMIN", label: ROLE_LABELS.ADMIN },
];
