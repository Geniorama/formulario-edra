import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-edra-grey sm:flex-row sm:px-6">
        <p>© {year} EDRA Jewelry. Todos los derechos reservados.</p>
        <Link
          href="/politicas-de-privacidad"
          className="font-medium text-edra transition-colors hover:text-edra-dark"
        >
          Políticas de privacidad
        </Link>
      </div>
    </footer>
  );
}
