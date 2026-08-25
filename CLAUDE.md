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
- `npm run db:migrate-ajustes` (migración de datos idempotente: renombra los estados
  de las órdenes, crea `InvoiceType`/columnas del comprobante y recalcula el saldo).
  **Correr ANTES de `db:push`** para no perder las órdenes existentes.
- `npm run db:migrate-multiproducto` (migración idempotente: crea `order_items` y
  mueve allí los datos por producto de cada orden, agrega barrio/especificaciones
  de la dirección y actualiza la lista de materiales). **Correr ANTES de `db:push`**;
  va después de `db:migrate-ajustes`.
- `npm run db:migrate-medios-pago` (migración idempotente: agrega los nuevos valores
  del enum `PaymentMethod` y la columna `paymentMethodOther`). **Correr ANTES de
  `db:push`**; va después de `db:migrate-multiproducto`.
- `npm run test:correo -- correo@dominio.com [--real]` (prueba ZeptoMail; con
  `--real` genera un token verdadero y envía el enlace de restablecimiento).

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
- Datos personales incluyen **Barrio** (`neighborhood`) y **Especificaciones de la dirección** (`addressDetails`: conjunto, torre, apto…), ambos opcionales. El **código postal solo es obligatorio si el país de envío no es Colombia** (`postalCodeRequired` en `form-options.ts`, reflejado en el cliente y en `personalDataSchema`).
- **Guardado de progreso (borrador) en BD**: `ClientProfile`/`Order` tienen campos nullable + `completed`/`lastStep`. `POST /api/cliente/registro` con `finalize:false` guarda borrador (parcial, vía `persistRegistration` en `src/lib/client-registration.ts`); con `finalize:true` valida estricto y marca `completed`. El gate redirige al form mientras `completed=false`; la página precarga el borrador. Así el asesor podrá ver la info parcial del cliente.
- Modelos: `ClientProfile` (1:1 con User), `Order` (la compra) y `OrderItem` (cada producto de la compra). Opciones/etiquetas en `src/lib/form-options.ts`; campos por producto en `src/lib/product-fields.ts`; fuentes desde la guía PDF (`public/guia-fuentes-edra.pdf`).
- El flujo completo del .docx incluye pasos del **Asesor** (Datos finales, peso/ancho/modelo, etc.) que NO están en el form del cliente; quedan modelados para el módulo de asesores.

## Varios productos en una sola compra
- Una `Order` = **una compra** con `items: OrderItem[]`. En `OrderItem` viven los campos que dependen del producto: los del **cliente** (producto, tallas, material, gemas, grabados, fuente) y los **técnicos del asesor** (`ADVISOR_ITEM_KEYS`, incluida `finalDescription`). En `Order` quedan el número, el código, el estado, `manufacturingNotes` y todos los **datos finales** (fechas, valores, saldo, entrega, pago, FE, comprobante).
- Cliente y asesor agregan/quitan productos con `OrderItemsEditor` (`order-fields.tsx`) + el hook `useOrderItems`; el estado por producto es `OrderItemState` (`order-utils.ts`). Tope: `MAX_ORDER_ITEMS` (15).
- Listados y encabezados usan `orderProductsLabel(items)` ("Argollas +1 más"; con `full` lista todos).
- Opciones: tallas de 3 a 13 **en cuartos** (valor decimal `5.25`, etiqueta `5 1/4` vía `sizeLabel`); materiales sin Oro 22k/24k y con **Oro 18k + plata** y **Platino 950**; si la gema es `OTRA` el cliente debe escribir cuál en `gemOther`.

## Módulo "Mis órdenes" (CLIENTE)
- `/mis-ordenes` (lista), `/mis-ordenes/nueva` (crear), `/mis-ordenes/[id]` (detalle con un bloque por producto + sección "Información del asesor" de solo lectura, "Pendiente" hasta que el asesor la complete).
- `Order.number` (autoincrement, visible como `EDRA-00042` vía `formatOrderNumber`), `Order.workOrderCode` (código que asigna el asesor), `Order.advisorId` → relación `advisor` (User ASESOR). El detalle muestra número, código y datos de contacto del asesor (o "Pendiente"/"sin asignar"). Relaciones nombradas: `ClientOrders` / `AdvisorOrders`.
- Crear: `POST /api/cliente/ordenes` (valida `workOrderSchema` = `{ items: [...] }`, crea la `Order` con sus `OrderItem`).
- Reutilizables: `OrderItemFields` / `OrderItemsEditor` (`src/components/forms/order/order-fields.tsx`), el hook `useOrderItems` y helpers en `src/lib/order-utils.ts` (validación/estado/display) y `src/lib/order-display.ts` (etiquetas de estado, productos y campos del asesor). El onboarding ya usa el mismo editor.

## Módulo de Asesores (ASESOR + ADMIN)
- `/asesor/ordenes` (lista con **filtros**: búsqueda libre, N.º de orden, cliente, asesor, estado y rango de fechas → `OrdersFilters` + `Pagination params={...}`), `/asesor/ordenes/[id]` (datos del cliente + formulario editable de 2 pasos).
- El asesor edita: código de orden (`workOrderCode`), estado (`OrderStatus`), **campos técnicos de cada producto** (`ADVISOR_PRODUCT_FIELDS`/`ADVISOR_FIELD_META`) y los **Datos finales** (fechas, valores, entrega, pago, FE, joyero, comprobante). Al guardar, si la orden no tiene asesor se autoasigna (gestor de venta).
- **ADMIN = edición completa**: además edita la solicitud del cliente de cada producto (producto, tallas, material, gemas, grabados), **agrega o quita productos de la compra** y reasigna el asesor. El form recibe `canEditClient` y `advisors`; la API acepta `items[].client`, altas/bajas de productos y `advisorId` solo si el rol es ADMIN.
- Estructura del formulario (`advisor-order-form.tsx`):
  - **Paso 1 – Orden de trabajo**: código, estado, (admin: asesor) y un bloque por producto con la solicitud del cliente (editable solo para admin), sus detalles técnicos y su **Descripción del producto** (`finalDescription`).
  - **Paso 2 – Datos finales**: fecha de venta → fecha de entrega del joyero → fecha de entrega y envío (desde/hasta); valor compra, abono, envío y **saldo con envío calculado y no editable** (`computeBalanceWithShipping` = compra − abono + envío, recalculado también en el servidor); comprobante de abono (**archivo**); tipo de entrega, **Facturación electrónica (Con FE / Sin FE)** y **medio de pago dependiente de ella**; joyero; notas internas y, al final, **Observaciones de fabricación** (`manufacturingNotes`, ya no va por producto).
- **Medios de pago**: la lista del selector depende de `invoiceType`. Con FE → `PAYMENT_METHODS_FE` (Efectivo, Addi, Bancolombia/Davivienda/Datafono Eduardo); Sin FE → `PAYMENT_METHODS_SIN_FE` (Western Weendy … Otro). Helpers en `order-display.ts`: `paymentMethodOptionsFor(invoiceType)` e `isPaymentMethodAllowed`. Al cambiar la facturación se limpia el medio de pago que ya no aplique (en el cliente y revalidado en la API). Si es `OTRO`, el asesor escribe cuál en `Order.paymentMethodOther`. Los valores viejos (`TARJETA_CREDITO`, `TARJETA_DEBITO`, `TRANSFERENCIA`) siguen en el enum solo para mostrar órdenes antiguas.
- API: `PATCH /api/asesor/ordenes/[id]` (rol ASESOR/ADMIN; whitelista campos; el cuerpo lleva `items: [{ id, fields, client? }]`) y `POST/GET/DELETE /api/asesor/ordenes/[id]/comprobante` (archivo del comprobante: máx. 5 MB, PDF o imagen, guardado en la BD en `depositReceiptData`; el GET lo puede ver el staff y el cliente dueño).
- Estados (`OrderStatus`, en orden): `EN_TRAMITE`, `EN_FABRICACION`, `ENGASTE`, `NOVEDAD_FABRICACION`, `FINALIZADO`, `ENTREGADO`, `DESISTIDO`.

## Notificaciones
- Modelo `Notification` (destinatario `userId`, `type`, `title`, `body`, `link`, `read`). Helpers en `src/lib/notifications.ts`.
- **Nueva orden** → notifica a todos los ADMIN/ASESOR activos (en `/api/cliente/ordenes` y al finalizar el registro).
- **Cambio de estado** (en `PATCH /api/asesor/ordenes/[id]`) → notifica **solo al asesor** de la orden (dashboard + correo, `notifyAdvisorStatusChange` + `sendOrderStatusEmail`); **nunca al cliente**. Si la orden no tiene asesor, avisa a todos los ADMIN/ASESOR activos; nunca se notifica a quien hizo el cambio.
- UI: `NotificationsBell` en el topbar (campana con badge, dropdown, marcar leídas); hace polling cada 30s a `GET /api/notificaciones`. Marcar leídas: `POST /api/notificaciones/marcar-leidas` (ids opcionales).

## Convenciones
- UI y textos en **español**. Paleta de marca: teal `#1496a6` (clases `text-edra`, `bg-edra`, etc.).
- Validación con **Zod** en `src/lib/validations.ts`.
- Rutas en español: `/registro`, `/recuperar-contrasena`, `/reenviar-verificacion`.
