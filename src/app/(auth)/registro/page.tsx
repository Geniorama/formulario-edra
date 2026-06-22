import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/forms/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Regístrate para comenzar tu pre-registro con Joyería Edra."
      maxWidth="max-w-xl"
    >
      <RegisterForm />
    </AuthCard>
  );
}
