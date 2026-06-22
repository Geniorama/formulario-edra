# CLAUDE.md

Proyecto **Joyería Edra**: autenticación con Next.js 16 (App Router) + TypeScript.

## Stack clave
- **Next.js 16** App Router, React 19, **Tailwind v4** (tema en `src/app/globals.css` con `@theme`).
- **Prisma 7** con generador nuevo `prisma-client` → `src/generated/prisma` (no se versiona).
  - Cliente vía **driver adapter** `@prisma/adapter-pg` (ver `src/lib/prisma.ts`).
  - URLs de conexión en `prisma.config.ts` (CLI usa `DIRECT_URL`); la app usa `DATABASE_URL` (pooled).
- **Auth.js v5** (`next-auth@beta`): config dividida `auth.config.ts` (edge-safe) + `auth.ts` (Prisma/bcrypt). Sesión **JWT**.
- **Middleware** vive en `src/proxy.ts` (Next 16 renombró `middleware`→`proxy`).
- Correo: **ZeptoMail vía API REST** con `fetch`, no SMTP (`src/lib/mailer.ts`).

## Comandos
- `npm run dev` · `npm run build`
- `npm run db:push` (crear tablas) · `npm run db:studio` · `npm run db:generate`

## Roles
- Enum `Role { ADMIN, ASESOR, CLIENTE }` (default `CLIENTE`). El `role` va en el JWT/sesión (`session.user.role`).
- Front solo registra `CLIENTE`. Admin se crea con `npm run db:seed` (admin@joyeriaedra.com / Admin1234*).
- `/admin` (solo ADMIN) crea usuarios → invitación por correo (`ACCOUNT_INVITE`) → `/establecer-contrasena`.
- Protección: middleware exige login en `/dashboard` y `/admin`; el rol se valida en la página/API (`auth()` con config completa).

## Dashboard (escalable por módulos)
- Rutas agrupadas: `src/app/(auth)/` (público: header/footer de marca) y `src/app/(panel)/` (shell con sidebar + topbar). Los grupos NO cambian la URL.
- El shell (`src/components/dashboard/`) es responsive: `dashboard-shell` (estado del drawer móvil) + `sidebar` + `topbar`.
- **Config central de módulos**: `src/lib/navigation.ts` (`NAV_ITEMS`, role-aware con `navForRole`). El sidebar y las tarjetas del dashboard se generan desde aquí.
- **Agregar un módulo**: 1) añade una entrada en `NAV_ITEMS` (con `roles` si aplica e ícono de `lucide-react`); 2) crea `src/app/(panel)/<ruta>/page.tsx`. Listo, aparece en el menú y en el dashboard.
- El layout `(panel)/layout.tsx` exige sesión; cada página valida su rol con `auth()`.

## Registro por pasos del cliente
- Tras iniciar sesión, un `CLIENTE` sin `ClientProfile` es redirigido a `/completar-registro` (gate en `(panel)/layout.tsx`).
- Formulario multipaso (`src/components/forms/onboarding/`): **Datos personales → Orden de trabajo (campos del cliente) → Confirmación**. Stepper + validación por paso en cliente; el servidor revalida con `clientOnboardingSchema`.
- **Guardado de progreso (borrador) en BD**: `ClientProfile`/`Order` tienen campos nullable + `completed`/`lastStep`. `POST /api/cliente/registro` con `finalize:false` guarda borrador (parcial, vía `persistRegistration` en `src/lib/client-registration.ts`); con `finalize:true` valida estricto y marca `completed`. El gate redirige al form mientras `completed=false`; la página precarga el borrador. Así el asesor podrá ver la info parcial del cliente.
- Modelos: `ClientProfile` (1:1 con User) y `Order` (con campos del asesor nullable, para el futuro módulo de asesores). Opciones/etiquetas en `src/lib/form-options.ts`; campos por producto en `src/lib/product-fields.ts`; fuentes desde la guía PDF (`public/guia-fuentes-edra.pdf`).
- El flujo completo del .docx incluye pasos del **Asesor** (Datos finales, peso/ancho/modelo, etc.) que NO están en el form del cliente; quedan modelados para el módulo de asesores.

## Módulo "Mis órdenes" (CLIENTE)
- `/mis-ordenes` (lista), `/mis-ordenes/nueva` (crear), `/mis-ordenes/[id]` (detalle con campos del cliente + sección "Información del asesor" de solo lectura, "Pendiente" hasta que el asesor los complete).
- `Order.number` (autoincrement, visible como `EDRA-00042` vía `formatOrderNumber`), `Order.workOrderCode` (código que asigna el asesor), `Order.advisorId` → relación `advisor` (User ASESOR). El detalle muestra número, código y datos de contacto del asesor (o "Pendiente"/"sin asignar"). Relaciones nombradas: `ClientOrders` / `AdvisorOrders`.
- Crear: `POST /api/cliente/ordenes` (valida `workOrderSchema`, crea `Order`).
- Reutilizables: `OrderFields` (`src/components/forms/order/order-fields.tsx`) y helpers en `src/lib/order-utils.ts` (validación/estado/display) y `src/lib/order-display.ts` (etiquetas de estado y campos del asesor). El onboarding mantiene su propia copia de ese render (no se refactorizó para evitar regresiones).

## Módulo de Asesores (ASESOR + ADMIN)
- `/asesor/ordenes` (lista de todas las órdenes con cliente/asesor/estado), `/asesor/ordenes/[id]` (datos del cliente de solo lectura + formulario editable).
- El asesor edita: código de orden (`workOrderCode`), estado (`OrderStatus`) y **campos técnicos por producto** (`ADVISOR_PRODUCT_FIELDS`/`ADVISOR_FIELD_META` en `product-fields.ts`). Al guardar, si la orden no tiene asesor se autoasigna (gestor de venta) → el cliente ve sus datos de contacto.
- API: `PATCH /api/asesor/ordenes/[id]` (rol ASESOR/ADMIN; whitelista campos del asesor).
- Pendiente (siguiente fase): los "Datos finales" del Paso 4 del .docx (fechas, valores, método de pago, joyero, etc.).

## Notificaciones
- Modelo `Notification` (destinatario `userId`, `type`, `title`, `body`, `link`, `read`). Helpers en `src/lib/notifications.ts`.
- **Nueva orden** → notifica a todos los ADMIN/ASESOR activos (en `/api/cliente/ordenes` y al finalizar el registro).
- **Cambio de estado** (en `PATCH /api/asesor/ordenes/[id]`) → notifica al cliente en dashboard **y por correo** (`sendOrderStatusEmail`).
- UI: `NotificationsBell` en el topbar (campana con badge, dropdown, marcar leídas); hace polling cada 30s a `GET /api/notificaciones`. Marcar leídas: `POST /api/notificaciones/marcar-leidas` (ids opcionales).

## Convenciones
- UI y textos en **español**. Paleta de marca: teal `#1496a6` (clases `text-edra`, `bg-edra`, etc.).
- Validación con **Zod** en `src/lib/validations.ts`.
- Rutas en español: `/registro`, `/recuperar-contrasena`, `/reenviar-verificacion`.
