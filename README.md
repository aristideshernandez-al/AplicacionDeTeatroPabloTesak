# Teatro Pablo Tesak — aplicación web

Migración de la aplicación Android a Next.js 16, Node.js y TypeScript. Usa **el mismo Firebase** (`teatropablotesak-78d51`), las mismas cuentas y las mismas colecciones. Sustituye la implementación anterior de Supabase. No se migran ni duplican los datos de producción.

## Ejecutar

Requisitos: Node.js 20.9 o posterior y pnpm.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

La configuración pública de la aplicación web registrada está en `lib/firebase-public.json`. No contiene cuentas de servicio ni credenciales administrativas. Firebase aplica la sesión del usuario y las reglas publicadas. `.env.example` documenta las variables opcionales `NEXT_PUBLIC_FIREBASE_*` para otros entornos.

## Funciones

- Acceso con Google, correo/contraseña, registro, verificación de correo y recuperación de contraseña.
- Perfiles y roles existentes; acceso de usuarios activos y administración de roles/estado de cuentas.
- Resumen con indicadores y actividades recientes; consulta, búsqueda y filtros por estado y fecha.
- Formulario de siete pasos con todos los campos Android: actividad, espacios, instituciones, participantes, información técnica, evidencias y resumen.
- Borradores, edición, envío y códigos oficiales `TPT-AAAA-0001` mediante el mismo contador transaccional que Android. Un reintento conserva ID y código.
- Fotografías (8), listas PDF (4) y otros anexos PDF (4), menos de 25 MB por archivo. Compresión de fotografías y recuperación del progreso de subida confirmado.
- Conversión de fotos de páginas a PDF desde el navegador, incluida la selección de cámara disponible en teléfonos. No incorpora el recorte automático del escáner nativo ML Kit de Android.
- Aprobación, rechazo con observaciones y archivo; catálogos de instituciones y opciones compartidos con Android.
- Notificaciones de revisión. Al abrir la web como administrador, se generan avisos de actividades enviadas pendientes, sin conceder a usuarios normales acceso a perfiles privados. No se agregan push ni correo automático.
- Exportación CSV, Excel, PDF de listado y PDF individual con fotografías y anexos PDF incorporados. Los archivos protegidos o dañados pueden impedir unir un anexo y se informa el fallo; la actividad no se altera.
- Edición de perfil y fotografía, solicitud de eliminación de cuenta y página de privacidad.
- Diseño adaptable a teléfonos y computadoras con identidad visual del teatro.

## Compatibilidad con Android

Las colecciones son `activities`, `counters`, `users`, `institutions`, `appData/settings` y `notifications`. Los nombres de campos, enum de estados, rutas de evidencias y formato de códigos se conservan. Se reconocen `SUBMITTED`, `ENVIADO` y el alias histórico `EVIADO`. Las fechas Android `d/M/yyyy` se pueden filtrar junto con fechas ISO y se escriben como `dd/MM/yyyy`.

El texto del formulario se guarda en localStorage por UID y actividad. Los archivos sin subir no sobreviven al cierre de la pestaña y deben seleccionarse otra vez. El guardado en Firebase y la asignación del código requieren internet; el guardado local del formulario es independiente. No se afirma que un envío se completó hasta confirmar la operación remota y las evidencias.

## v0 y Vercel

El repositorio conectado es `aristideshernandez-al/AplicacionDeTeatroPabloTesak`; la rama de producción de Vercel es `main`. El proyecto existente es `web-design-and-database-creation`, con dominio `https://web-design-and-database-creation.vercel.app`.

La publicación se realiza mediante el push de `main`, sin reemplazar el historial ni forzar ramas. La etiqueta `backup-before-firebase-web-20261023` conserva el estado anterior. En v0, sincroniza la rama `main` para continuar editando el código actualizado; evita publicar una conversación antigua que todavía utilice Supabase.

El dominio de producción y `localhost` ya estaban autorizados en Firebase Authentication al revisar el proyecto. Para un dominio nuevo, debes autorizarlo en Firebase Authentication → Configuración → Dominios autorizados. No es necesario crear usuarios nuevos ni cambiar sus UID. Las variables Supabase existentes de Vercel ya no se utilizan.

## Reglas de Firebase

Las reglas publicadas fueron inspeccionadas y no se modifican ni despliegan automáticamente desde este repositorio. Las reglas locales del proyecto Android son distintas de producción: no deben desplegarse sin revisión. En particular, una regla que prohíba todo cambio de `code` impide enviar borradores sin código como usuario normal.

La interfaz presenta acciones según rol, pero la autorización definitiva depende de las reglas publicadas de Firebase. Las reglas actuales permiten a cuentas autenticadas más operaciones de las que expone la interfaz; endurecerlas requiere un cambio separado compatible con Android. Nunca colocar claves privadas en `NEXT_PUBLIC_*` ni habilitar lectura anónima para resolver problemas de permisos.

## Validación

`pnpm test` verifica fechas Android, estados históricos, numeración oficial, participantes, validación del envío, mensajes de error y exportación CSV segura. `pnpm typecheck` y `pnpm build` deben pasar sin ignorar errores. La lectura y el inicio de sesión se verifican con Firebase real; las pruebas automatizadas no escriben ni eliminan actividades de producción.
