import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClientOnboardingForm } from "@/components/forms/onboarding/client-onboarding-form";

// Convierte null/undefined en "" para precargar el formulario.
const s = (v?: string | null) => v ?? "";

export default async function CompletarRegistroPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENTE") redirect("/dashboard");

  const profile = await prisma.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (profile?.completed) redirect("/dashboard");

  const order = await prisma.order.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { position: "asc" } } },
  });

  const initialPersonal = {
    documentType: s(profile?.documentType),
    documentNumber: s(profile?.documentNumber),
    whatsapp: s(profile?.whatsapp),
    contactMedium: s(profile?.contactMedium),
    socialNetwork: s(profile?.socialNetwork),
    socialLink: s(profile?.socialLink),
    shippingCountry: s(profile?.shippingCountry),
    cityState: s(profile?.cityState),
    postalCode: s(profile?.postalCode),
    address: s(profile?.address),
    neighborhood: s(profile?.neighborhood),
    addressDetails: s(profile?.addressDetails),
    privacyAccepted: profile?.privacyAccepted ?? false,
  };

  const initialItems = (order?.items ?? []).map((item) => ({
    product: s(item.product),
    size: s(item.size),
    sizeLady: s(item.sizeLady),
    sizeGentleman: s(item.sizeGentleman),
    material: s(item.material),
    gemType: s(item.gemType),
    gemOther: s(item.gemOther),
    engraving: s(item.engraving),
    engravingLady: s(item.engravingLady),
    engravingGentleman: s(item.engravingGentleman),
    fontType: s(item.fontType),
  }));

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-edra-ink">
          Completa tu registro
        </h1>
        <p className="mt-2 text-sm text-edra-grey">
          Cuéntanos tus datos y los detalles de tu joya. Puedes guardar tu
          progreso y continuar más tarde.
        </p>
      </div>
      <ClientOnboardingForm
        initialPersonal={initialPersonal}
        initialItems={initialItems}
        initialStep={profile?.lastStep ?? 0}
      />
    </section>
  );
}
