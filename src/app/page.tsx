import { redirect } from "next/navigation";

// La aplicación inicia directamente en el formulario de registro.
export default function RootPage() {
  redirect("/registro");
}
