import { AuthCard } from "@/components/auth-card";
import { SetPasswordForm } from "@/components/forms/set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthCard
      title="Activa tu cuenta"
      subtitle="Crea una contraseña para acceder a Joyería Edra."
    >
      <SetPasswordForm token={token ?? ""} />
    </AuthCard>
  );
}
