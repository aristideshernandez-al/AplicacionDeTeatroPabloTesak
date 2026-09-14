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

La web lee y guarda actividades, perfiles e instituciones en Firebase/Cloud Firestore, el mismo servicio utilizado por la aplicación Android.

## Requisitos

- Node.js 20 o posterior.
- `pnpm`.
- Un proyecto Firebase con Authentication y Cloud Firestore configurados.

## Preparar Firebase

1. En Firebase Console, abre el proyecto `teatropablotesak-78d51` o el proyecto que corresponda a tu instalación.
2. En **Configuración del proyecto**, registra una aplicación web y copia su configuración. La aplicación Android no sustituye el registro web: utiliza el `appId` de la aplicación web.
3. En **Authentication → Método de acceso**, habilita **Correo electrónico/contraseña** y **Google**.
4. En **Authentication → Configuración → Dominios autorizados**, agrega `localhost` para desarrollo y el dominio donde publicarás la web.
5. Verifica que Cloud Firestore tenga las reglas de seguridad del proyecto Android. La web crea perfiles de colaborador con rol `USER` y respeta los permisos definidos en Firestore.

## Instalación y ejecución

Instala las dependencias:

```bash
pnpm install
```

Crea `.env.local` en la carpeta principal del proyecto y agrega los valores de la aplicación web registrada en Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id-web
```

Estas variables corresponden a la configuración pública del cliente web de Firebase. No agregues credenciales de cuentas de servicio ni claves privadas al navegador. `.env.local` está excluido de Git.

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
