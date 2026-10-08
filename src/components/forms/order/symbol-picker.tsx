"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { FieldLabel } from "@/components/ui/form-fields";
import { symbolLabel, symbolSrc } from "@/lib/form-options";

/** Desplegable de símbolos para grabado: muestra el ícono de cada opción. */
export function SymbolPicker({
  label,
  value,
  options,
  onChange,
  error,
  optional,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <FieldLabel label={label} optional={optional} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-full border bg-white px-5 py-2 text-sm transition-colors focus:border-edra focus:outline-none ${
          error ? "border-red-400" : "border-edra-grey/30"
        }`}
      >
        {value ? (
          <span className="flex items-center gap-3 text-edra-ink">
            <Image
              src={symbolSrc(value)}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            {symbolLabel(value)}
          </span>
        ) : (
          <span className="py-1 text-edra-ink">Sin símbolo</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-edra-grey" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-black/5 bg-white p-3 shadow-[0_10px_40px_rgba(20,150,166,0.18)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => pick("")}
            className={`mb-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-edra-soft ${
              value ? "text-edra-grey" : "bg-edra-soft font-semibold text-edra-dark"
            }`}
          >
            Sin símbolo
          </button>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                aria-label={symbolLabel(option)}
                onClick={() => pick(option)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-colors hover:border-edra hover:bg-edra-soft ${
                  option === value
                    ? "border-edra bg-edra-soft"
                    : "border-black/5"
                }`}
              >
                <Image
                  src={symbolSrc(option)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                />
                <span className="text-xs font-semibold text-edra">{option}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
