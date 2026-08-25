"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { ROLE_OPTIONS } from "@/lib/roles";

export type UsersFilterValues = {
  q: string;
  rol: string;
  estado: string;
};

const EMPTY: UsersFilterValues = { q: "", rol: "", estado: "" };

const inputBase =
  "w-full rounded-full border border-edra-grey/30 bg-white px-4 py-2.5 text-sm text-edra-ink placeholder:text-edra-grey/60 focus:border-edra focus:outline-none";

export const USER_STATUS_OPTIONS = [
  { value: "ACTIVO", label: "Activos" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "INACTIVO", label: "Inactivos" },
];

export function UsersFilters({ initial }: { initial: UsersFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState<UsersFilterValues>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function push(next: UsersFilterValues) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value.trim()) params.set(key, value.trim());
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function update(key: keyof UsersFilterValues, value: string, debounce = false) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => push(next), 400);
    else push(next);
  }

  const hasFilters = Object.values(values).some((v) => v.trim());

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-edra-grey" />
          <input
            type="search"
            value={values.q}
            onChange={(e) => update("q", e.target.value, true)}
            placeholder="Buscar por nombre o correo..."
            className={`${inputBase} pl-11`}
            aria-label="Buscar usuarios"
          />
        </div>

        <select
          value={values.rol}
          onChange={(e) => update("rol", e.target.value)}
          className={inputBase}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={values.estado}
          onChange={(e) => update("estado", e.target.value)}
          className={inputBase}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {USER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setValues(EMPTY);
            router.push(pathname);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-edra-grey hover:text-edra"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
