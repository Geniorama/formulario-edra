"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

export function OrdersSearch({
  initial,
  placeholder = "Buscar por cliente, correo, N.º o código...",
}: {
  initial: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (v.trim()) params.set("q", v.trim());
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
  }

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-edra-grey" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-edra-grey/30 bg-white py-2.5 pl-11 pr-4 text-sm text-edra-ink placeholder:text-edra-grey/60 focus:border-edra focus:outline-none"
      />
    </div>
  );
}
