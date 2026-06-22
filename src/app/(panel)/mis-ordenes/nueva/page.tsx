import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { NewOrderForm } from "@/components/forms/order/new-order-form";

export default async function NuevaOrdenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENTE") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/mis-ordenes"
          className="inline-flex items-center gap-1 text-sm font-medium text-edra-grey hover:text-edra"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis órdenes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-edra-ink">
          Nueva orden de trabajo
        </h1>
        <p className="mt-1 text-sm text-edra-grey">
          Elige el producto y completa los detalles de tu joya.
        </p>
      </div>
      <NewOrderForm />
    </div>
  );
}
