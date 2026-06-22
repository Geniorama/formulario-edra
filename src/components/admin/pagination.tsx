import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  q,
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  q: string;
}) {
  function href(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const muted =
    "inline-flex items-center gap-1 rounded-full border border-edra-grey/20 px-4 py-2 font-medium text-edra-grey/40";
  const active =
    "inline-flex items-center gap-1 rounded-full border border-edra-grey/30 px-4 py-2 font-medium text-edra-ink hover:border-edra hover:text-edra";

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-edra-grey">
      <span>
        {total} {total === 1 ? "orden" : "órdenes"} · Página {page} de{" "}
        {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={active}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        ) : (
          <span className={muted}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={active}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={muted}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
