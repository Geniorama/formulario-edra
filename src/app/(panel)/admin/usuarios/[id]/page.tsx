import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { toDateInput } from "@/lib/order-display";
import { AdminEditUserForm } from "@/components/forms/admin-edit-user-form";
import { ClientDataCard } from "@/components/admin/client-data-card";

const s = (v?: string | null) => v ?? "";

// Edición de los datos básicos de un cliente o asesor (solo ADMIN).
export default async function AdminEditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { clientProfile: true },
  });
  if (!user || user.role === "ADMIN") notFound();

  const profile = user.clientProfile;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-edra-grey hover:text-edra"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a usuarios
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-edra-ink">
          Editar usuario
        </h1>
        <p className="mt-2 text-sm text-edra-grey">
          {user.firstName} {user.lastName} · {ROLE_LABELS[user.role]}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-edra-ink">
          Datos de la cuenta
        </h2>
        <AdminEditUserForm
          userId={user.id}
          email={user.email}
          initial={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: s(user.phone),
          }}
        />
      </div>

      {user.role === "CLIENTE" ? (
        <ClientDataCard
          // Se remonta al cambiar el nombre arriba (la tarjeta lo reenvía al guardar).
          key={`${user.firstName}|${user.lastName}`}
          title="Datos personales y de envío"
          hideAccountData
          userId={user.id}
          canEdit
          email={user.email}
          contactMedium={s(profile?.contactMedium)}
          socialNetwork={s(profile?.socialNetwork)}
          socialLink={s(profile?.socialLink)}
          initial={{
            firstName: user.firstName,
            lastName: user.lastName,
            documentType: s(profile?.documentType),
            documentNumber: s(profile?.documentNumber),
            whatsapp: s(profile?.whatsapp),
            birthDate: toDateInput(profile?.birthDate),
            shippingCountry: s(profile?.shippingCountry),
            cityState: s(profile?.cityState),
            postalCode: s(profile?.postalCode),
            address: s(profile?.address),
            neighborhood: s(profile?.neighborhood),
            addressDetails: s(profile?.addressDetails),
          }}
        />
      ) : null}
    </div>
  );
}
