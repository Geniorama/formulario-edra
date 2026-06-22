import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "@/components/forms/forgot-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecerla."
    >
      <ForgotForm />
    </AuthCard>
  );
}
