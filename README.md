# Joyería Edra — Autenticación

Aplicación **Next.js 16 (App Router)** con autenticación de usuario/contraseña,
confirmación de correo y recuperación de contraseña, siguiendo la identidad
gráfica de **Joyería Edra**.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | PostgreSQL en **Supabase** |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Autenticación | NextAuth / Auth.js v5 (Credentials, sesión JWT) |
| Contraseñas | bcryptjs |
| Correo | **ZeptoMail** (API REST, no SMTP) |
| Validación | Zod |

## Funcionalidades

- **Registro** (`/registro`) con nombre, correo, teléfono y contraseña.
- **Confirmación de correo** por enlace (token de 24 h) antes de poder ingresar.
- **Login** (`/login`) con email + contraseña.
- **Recuperar contraseña** (`/recuperar-contrasena`) → enlace de restablecimiento (token de 1 h).
- **Restablecer contraseña** (`/reset-password?token=...`).
- **Reenviar confirmación** (`/reenviar-verificacion`).
- **Dashboard** protegido (`/dashboard`) vía `proxy.ts` (middleware) + verificación en servidor.

### Roles y administración

Tres roles: **Admin**, **Asesor** y **Cliente** (enum `Role`, por defecto `CLIENTE`).

- Desde el front **solo se registran Clientes** (`/registro` nunca acepta un rol).
- El **Admin** se crea desde la base de datos con el seed (`npm run db:seed`).
- El Admin accede a **`/admin`** (solo rol `ADMIN`) y puede:
  - **Crear** usuarios de cualquier rol → reciben una **invitación por correo**
    (ZeptoMail) para establecer su contraseña en `/establecer-contrasena`, lo
    que además confirma su correo.
  - **Cambiar el rol**, **activar/desactivar** (un usuario inactivo no puede
    iniciar sesión), **reenviar la invitación** (a quienes siguen pendientes) y
    **eliminar** usuarios.
  - No puede modificar ni eliminar su propia cuenta desde el panel (evita
    quedarse sin acceso).

Admin de prueba que crea el seed:

| Correo | Contraseña |
| --- | --- |
| `admin@joyeriaedra.com` | `Admin1234*` |

## Puesta en marcha

### 1. Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

- **Supabase** → *Project Settings ▸ Database ▸ Connection string*:
  - `DATABASE_URL`: conexión **pooled** (PgBouncer, puerto `6543`, con `?pgbouncer=true`). La usa la app.
  - `DIRECT_URL`: conexión **directa** (puerto `5432`). La usan las migraciones de Prisma.
- **Auth.js**:
  - `AUTH_SECRET`: genéralo con `npx auth secret` (o `openssl rand -base64 32`).
  - `AUTH_URL` / `NEXT_PUBLIC_APP_URL`: URL pública (en local, `http://localhost:3000`).
- **ZeptoMail** (*panel ▸ Mail Agents ▸ tu agente ▸ SMTP/API ▸ Send Mail Token*):
  - `ZEPTOMAIL_TOKEN`: el *Send Mail Token* (con o sin el prefijo `Zoho-enczapikey `).
  - `ZEPTOMAIL_FROM` / `ZEPTOMAIL_FROM_NAME`: remitente verificado en ZeptoMail.
  - `ZEPTOMAIL_URL`: endpoint regional (`api.zeptomail.com` global o `api.zeptomail.eu` Europa).

### 2. Base de datos

Crea las tablas en Supabase a partir del esquema de Prisma:

```bash
npm run db:push       # crea las tablas (users, tokens) directamente
# o, para llevar historial de migraciones:
npm run db:migrate
```

El cliente de Prisma se genera automáticamente (`postinstall`), pero puedes
regenerarlo con `npm run db:generate`.

Crea el **admin de prueba** (tras `db:push`):

```bash
npm run db:seed
```

### 3. Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/
├── auth.ts               # Config completa de Auth.js (Credentials + Prisma)
├── auth.config.ts        # Config edge-safe (la usa el proxy/middleware)
├── proxy.ts              # Protección de rutas (/dashboard, /admin)
├── app/
│   ├── (auth)/           # Público: header/footer de marca
│   │   └── login, registro, recuperar-contrasena, reset-password,
│   │       reenviar-verificacion, establecer-contrasena, politicas-de-privacidad/
│   ├── (panel)/          # Privado: shell del dashboard (sidebar + topbar)
│   │   ├── layout.tsx    # Exige sesión
│   │   ├── dashboard/    # Inicio (tarjetas de módulos)
│   │   └── admin/        # Gestión de usuarios (solo ADMIN)
│   ├── api/              # register, verify-email, forgot/reset-password,
│   │   │                 # set-password, resend-verification, admin/users/...
│   └── page.tsx          # Redirige a /registro
├── components/
│   ├── dashboard/        # dashboard-shell, sidebar, topbar
│   ├── forms/, admin/, ui/
│   └── logo, site-header, site-footer, auth-card
├── lib/                  # prisma, mailer, tokens, validations, roles, navigation
└── generated/prisma/     # Cliente Prisma generado (no se versiona)
```

> **Agregar un módulo al dashboard:** añade una entrada en `src/lib/navigation.ts`
> (`NAV_ITEMS`, con su `roles` e ícono de `lucide-react`) y crea su página en
> `src/app/(panel)/<ruta>/page.tsx`. El sidebar y las tarjetas se actualizan solos.

## Notas

- La sesión es **JWT** (requisito del provider de Credentials de Auth.js).
- Las contraseñas se almacenan con `bcrypt`; los tokens de verificación/recuperación
  son de un solo uso y con expiración.
- Por seguridad, los endpoints de recuperación y reenvío responden de forma
  genérica sin revelar si un correo existe.
