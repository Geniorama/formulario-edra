"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { ORDER_STATUS_OPTIONS } from "@/lib/order-display";

export type OrdersFilterValues = {
  q: string;
  numero: string;
  cliente: string;
  asesor: string;
  estado: string;
  desde: string;
  hasta: string;
};

export const EMPTY_ORDER_FILTERS: OrdersFilterValues = {
  q: "",
  numero: "",
  cliente: "",
  asesor: "",
  estado: "",
  desde: "",
  hasta: "",
};

const inputBase =
  "w-full rounded-full border border-edra-grey/30 bg-white px-4 py-2.5 text-sm text-edra-ink placeholder:text-edra-grey/60 focus:border-edra focus:outline-none";

const labelBase = "mb-1.5 block text-xs font-medium text-edra-grey";

export function OrdersFilters({
  initial,
  advisors,
}: {
  initial: OrdersFilterValues;
  advisors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState<OrdersFilterValues>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function push(next: OrdersFilterValues) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value.trim()) params.set(key, value.trim());
    }
    const qs = params.toString(); // al filtrar siempre se vuelve a la página 1
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function update(key: keyof OrdersFilterValues, value: string, debounce = false) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounce) {
      timer.current = setTimeout(() => push(next), 400);
    } else {
      push(next);
    }
  }

  const hasFilters = Object.values(values).some((v) => v.trim());

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_10px_40px_rgba(20,150,166,0.10)]">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-edra-grey" />
        <input
          type="search"
          value={values.q}
          onChange={(e) => update("q", e.target.value, true)}
          placeholder="Buscar por cliente, correo, N.º o código..."
          className={`${inputBase} pl-11`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelBase} htmlFor="filtro-numero">
            N.º de orden
          </label>
          <input
            id="filtro-numero"
            inputMode="numeric"
            value={values.numero}
            onChange={(e) =>
              update("numero", e.target.value.replace(/\D/g, ""), true)
            }
            placeholder="Ej. 42"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelBase} htmlFor="filtro-cliente">
            Cliente
          </label>
          <input
            id="filtro-cliente"
            value={values.cliente}
            onChange={(e) => update("cliente", e.target.value, true)}
            placeholder="Nombre o correo"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelBase} htmlFor="filtro-asesor">
            Asesor
          </label>
          <select
            id="filtro-asesor"
            value={values.asesor}
            onChange={(e) => update("asesor", e.target.value)}
            className={inputBase}
          >
            <option value="">Todos</option>
            <option value="SIN_ASIGNAR">Sin asignar</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="filtro-estado">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={values.estado}
            onChange={(e) => update("estado", e.target.value)}
            className={inputBase}
          >
            <option value="">Todos</option>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="filtro-desde">
            Fecha desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={values.desde}
            onChange={(e) => update("desde", e.target.value)}
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelBase} htmlFor="filtro-hasta">
            Fecha hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={values.hasta}
            onChange={(e) => update("hasta", e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setValues(EMPTY_ORDER_FILTERS);
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
