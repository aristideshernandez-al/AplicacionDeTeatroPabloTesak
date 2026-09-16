# Aplicación web del Teatro Pablo Tesak

Versión web del sistema de control y seguimiento de actividades del Teatro Pablo Tesak. Su diseño se adapta a computadoras y teléfonos y toma como referencia la aplicación Android.

## Funciones

- Inicio de sesión con correo electrónico y contraseña.
- Creación de cuenta con verificación por correo.
- Acceso con Google.
- Recuperación de contraseña por correo electrónico.
- Resumen, búsqueda y filtro de actividades.
- Registro de borradores con los datos principales de la actividad.
- Consulta de instituciones y, para administradores, consulta de usuarios.
- Descarga de reportes de actividades en formato CSV.
- Cierre de sesión y navegación adaptable a pantallas pequeñas.

La aplicación usa Firebase Authentication para iniciar sesión y Supabase para cargar y guardar las actividades, instituciones y perfiles que ya existen en la base de datos web. El perfil de acceso también se valida en Firestore.

## Requisitos

- Node.js 20 o posterior.
- `pnpm`.
- Un proyecto Firebase con Authentication y Cloud Firestore configurados.
- El proyecto Supabase donde están las tablas de la aplicación web.

## Preparar Firebase

1. En Firebase Console, abre el proyecto `teatropablotesak-78d51` o el proyecto que corresponda a tu instalación.
2. En **Configuración del proyecto → General → Tus apps**, agrega una aplicación **Web**. Copia la configuración de esa aplicación; el valor `appId` debe ser el identificador web (termina en `:web:...`), no el identificador Android.
3. En **Authentication → Método de acceso**, habilita **Correo electrónico/contraseña** y **Google**.
4. En **Authentication → Configuración → Dominios autorizados**, agrega `localhost` para desarrollo y el dominio donde publicarás la web.
5. En Supabase, abre **Authentication → Sign In / Third-party providers** y registra Firebase como proveedor externo usando el ID del proyecto Firebase.
6. Asegúrate de que los tokens de Firebase incluyan el claim `role: authenticated` y que las políticas RLS de Supabase permitan a esos usuarios leer o modificar las filas correspondientes. No desactives RLS para resolver errores de permisos.

## Instalación y ejecución

Instala las dependencias:

```bash
pnpm install
```

Crea `.env.local` en la carpeta principal del proyecto y agrega la configuración web de Firebase y las credenciales públicas de Supabase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id-web
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publica
```

Si el proyecto todavía usa la clave anónima, puedes usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` en lugar de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Las claves públicas se usan en el navegador y deben estar protegidas por RLS. Nunca agregues una clave `service_role`, una clave secreta de Supabase ni credenciales de cuenta de servicio a variables `NEXT_PUBLIC_`. `.env.local` está excluido de Git.

Inicia el servidor local:

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo. |
| `pnpm build` | Genera la versión optimizada para producción. |
| `pnpm start` | Ejecuta la versión de producción después de compilarla. |

## Estructura principal

```text
app/                 Pantallas, diseño y estilos
components/          Autenticación y componentes reutilizables
lib/firebase/        Conexión con Firebase Authentication y Firestore
public/              Recursos estáticos
```
