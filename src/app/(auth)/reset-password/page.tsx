import { AuthCard } from "@/components/auth-card";
import { ResetForm } from "@/components/forms/reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthCard
      title="Nueva contraseña"
      subtitle="Crea una contraseña segura para tu cuenta."
    >
      <ResetForm token={token ?? ""} />
    </AuthCard>
  );
}
