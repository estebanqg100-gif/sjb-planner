# Backend del organizador — sistema de acceso

Esto es solo la parte de **usuarios, invitaciones y login**. La interfaz visual (el calendario) va después, conectada a estas mismas rutas.

## Cómo funciona el acceso

- Nadie se registra libremente. Tú generas un **código de invitación** (8 caracteres) desde tu cuenta de administrador y se lo pasas a tu amigo por WhatsApp o lo que uses.
- Tu amigo entra al link, pone el código, y elige su propio usuario y contraseña.
- Las contraseñas se guardan cifradas (hash) — ni tú ni nadie puede verlas, solo se pueden verificar.
- Si alguien olvida su contraseña, te escribe. Tú generas un **código de restablecimiento** para su usuario (endpoint de admin) y se lo pasas. Con ese código, esa persona pone una contraseña nueva desde la pantalla de "olvidé mi contraseña" — nunca necesitas ver la contraseña, ni la vieja ni la nueva.

## 1. Base de datos gratis (Postgres)

1. Crea una cuenta gratis en [neon.tech](https://neon.tech) (o [supabase.com](https://supabase.com), cualquiera de las dos sirve).
2. Crea un proyecto nuevo. Te dan un **connection string** (empieza con `postgresql://...`) — cópialo.
3. En el panel de tu proyecto, abre el editor SQL y pega el contenido de `schema.sql` de esta carpeta. Ejecútalo una vez.

## 2. Configurar el proyecto

1. Copia `.env.example` a un archivo nuevo llamado `.env`.
2. Pega tu connection string en `DATABASE_URL`.
3. En `JWT_SECRET` escribe cualquier frase larga y aleatoria (es la "llave" que firma las sesiones — que no la sepa nadie más).

## 3. Probarlo en tu compu

```
npm install
npm run seed-admin -- tu_usuario tu_contraseña
npm run dev
```

Esto instala las dependencias, crea tu cuenta de administrador directo en la base de datos (sin pasar por invitación, porque eres el primero), y arranca el servidor en `http://localhost:3000`.

Prueba con una herramienta como Postman, o el mismo navegador, estos endpoints:

- `POST /api/login` con `{ "username": "tu_usuario", "password": "tu_contraseña" }` → te da un `token`.
- `POST /api/admin/invite-codes` (con el header `Authorization: Bearer <token>`) → te genera un código de invitación para tu primer amigo.
- `POST /api/register` con `{ "username": "...", "password": "...", "inviteCode": "..." }` → así se registra tu amigo.

## 4. Subir el código a GitHub

Necesitas una cuenta gratis en [github.com](https://github.com). Crea un repositorio nuevo y sube esta carpeta (puedes arrastrar los archivos desde la web de GitHub si aún no usas git en la terminal).

## 5. Publicarlo con un link real (Render)

1. Crea una cuenta gratis en [render.com](https://render.com) (no pide tarjeta).
2. "New +" → "Web Service" → conecta tu repositorio de GitHub.
3. Build command: `npm install` — Start command: `npm start`.
4. En "Environment", agrega las mismas variables de tu `.env`: `DATABASE_URL` y `JWT_SECRET`.
5. Deploy. Render te da un link tipo `https://tu-proyecto.onrender.com` — ese es el link que compartes.

Nota: en el plan gratis, el servidor "duerme" tras un rato sin uso y tarda unos segundos en despertar con la primera visita del día. Para un grupo cerrado de amigos probando la idea, no es un problema real.

## Siguiente paso

Con esto ya tienes el acceso funcionando. Lo que sigue es conectar la interfaz visual (el calendario/dashboard) a estas rutas: pantalla de login/registro, y que guarde/lea desde `/api/me/data` en vez de `localStorage`. Lo armamos apenas confirmes que este acceso funciona como quieres.
