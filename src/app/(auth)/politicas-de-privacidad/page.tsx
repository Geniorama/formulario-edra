export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-edra-ink">
        Políticas de privacidad
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-edra-grey">
        <p>
          En Joyería Edra valoramos y protegemos tus datos personales. Esta
          política describe cómo recopilamos, usamos y resguardamos la
          información que nos proporcionas al crear una cuenta o utilizar
          nuestros servicios.
        </p>
        <p>
          <strong className="text-edra-ink">Datos que recopilamos.</strong>{" "}
          Recopilamos tu nombre, correo electrónico y número de teléfono con el
          fin de gestionar tu cuenta, confirmar tu identidad y comunicarnos
          contigo sobre tus solicitudes.
        </p>
        <p>
          <strong className="text-edra-ink">Uso de la información.</strong>{" "}
          Utilizamos tus datos únicamente para los fines descritos. No
          compartimos tu información con terceros, salvo cuando sea estrictamente
          necesario para prestar el servicio o lo exija la ley.
        </p>
        <p>
          <strong className="text-edra-ink">Seguridad.</strong> Tus contraseñas
          se almacenan cifradas y la confirmación de correo protege el acceso a
          tu cuenta.
        </p>
        <p>
          Para ejercer tus derechos sobre tus datos personales, escríbenos a{" "}
          <a
            href="mailto:ventas@joyeriaedra.com"
            className="font-medium text-edra hover:text-edra-dark"
          >
            ventas@joyeriaedra.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
