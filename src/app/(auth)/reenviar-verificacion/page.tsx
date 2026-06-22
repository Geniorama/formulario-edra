import { AuthCard } from "@/components/auth-card";
import { ResendForm } from "@/components/forms/resend-form";

export default function ResendVerificationPage() {
  return (
    <AuthCard
      title="Reenviar confirmación"
      subtitle="Te enviaremos un nuevo enlace para confirmar tu correo."
    >
      <ResendForm />
    </AuthCard>
  );
}
