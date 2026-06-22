import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Layout público: header y footer de marca para login, registro, etc.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
