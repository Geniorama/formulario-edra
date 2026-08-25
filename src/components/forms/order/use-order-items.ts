"use client";

import { useState } from "react";
import {
  emptyOrderItem,
  validateOrderItems,
  hasErrors,
  type OrderItemState,
  type Errors,
} from "@/lib/order-utils";
import type { OrderFieldKey } from "@/lib/product-fields";

/**
 * Estado compartido de la lista de productos de una compra: altas, bajas,
 * edición y validación por producto (los errores solo se muestran cuando el
 * usuario ya tocó el campo o intenta continuar).
 */
export function useOrderItems(initial?: OrderItemState[]) {
  const [items, setItems] = useState<OrderItemState[]>(
    initial && initial.length > 0 ? initial : [{ ...emptyOrderItem }]
  );
  // Claves con formato `${índice}.${campo}`.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function markTouched(index: number, key: string) {
    setTouched((prev) => ({ ...prev, [`${index}.${key}`]: true }));
  }

  function setField(index: number, key: OrderFieldKey, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
    markTouched(index, key);
  }

  function setGemOther(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, gemOther: value } : item))
    );
    markTouched(index, "gemOther");
  }

  // Al cambiar de producto se limpian los campos dependientes.
  function setProduct(index: number, product: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...emptyOrderItem, product } : item))
    );
    markTouched(index, "product");
  }

  function add() {
    setItems((prev) => [...prev, { ...emptyOrderItem }]);
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    // Reindexa los campos ya tocados para que sigan apuntando a su producto.
    setTouched((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        const dot = key.indexOf(".");
        const i = Number(key.slice(0, dot));
        if (i === index) continue;
        next[`${i > index ? i - 1 : i}.${key.slice(dot + 1)}`] = prev[key];
      }
      return next;
    });
  }

  const allErrors = validateOrderItems(items);

  /** Marca todo como tocado para resaltar lo que falta. */
  function revealErrors() {
    setTouched((prev) => {
      const next = { ...prev };
      allErrors.forEach((e, i) => {
        for (const key in e) next[`${i}.${key}`] = true;
      });
      return next;
    });
  }

  const errors: Errors[] = allErrors.map((e, i) => {
    const visible: Errors = {};
    for (const key in e) if (touched[`${i}.${key}`]) visible[key] = e[key];
    return visible;
  });

  return {
    items,
    setItems,
    errors,
    valid: !hasErrors(allErrors),
    handlers: {
      onItemField: setField,
      onItemProduct: setProduct,
      onItemGemOther: setGemOther,
      onAdd: add,
      onRemove: remove,
    },
    revealErrors,
  };
}
