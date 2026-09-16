# Aplicación web del Teatro Pablo Tesak

Versión web del sistema de control y seguimiento de actividades del Teatro Pablo Tesak. Su diseño se adapta a computadoras y teléfonos y comparte los datos institucionales guardados en Supabase.

## Funciones

- Inicio y cierre de sesión con Google mediante Supabase Auth.
- Resumen, consulta y búsqueda de actividades.
- Registro y edición de actividades con instituciones participantes.
- Consulta del catálogo de instituciones y, para administradores, de usuarios.
- Descarga de reportes de actividades.

La aplicación usa Supabase para autenticación y base de datos. Firebase ya no forma parte del inicio de sesión de la web. Las tablas conservan su protección RLS; el sistema requiere una sesión autenticada para consultar los datos restringidos.

## Configurar Google en Supabase

1. En Supabase, abre **Authentication → Sign In / Providers → Google** y habilita Google.
2. En Google Cloud Console, crea o reutiliza un cliente OAuth de tipo **Aplicación web**. En sus URI de redirección autorizados agrega la URL de callback que muestra Supabase: `https://<id-del-proyecto>.supabase.co/auth/v1/callback`.
3. Copia el ID y el secreto de ese cliente OAuth en la configuración del proveedor Google de Supabase. No los guardes en el repositorio ni en variables `NEXT_PUBLIC_`.
4. En **Authentication → URL Configuration**, establece como URL del sitio el dominio de producción y agrega también `http://localhost:3000/**` y el dominio de producción a las URL de redirección permitidas.
5. En la configuración del proveedor OAuth de Google, agrega el dominio de producción a los orígenes JavaScript autorizados.

Al terminar, Supabase intercambiará el acceso de Google por una sesión propia. Esa sesión cumple las políticas RLS de las tablas sin habilitar lectura anónima. Si se cambia de Firebase Auth a Supabase Auth, las cuentas reciben identificadores de usuario Supabase; revisa y vincula los perfiles administrativos existentes antes de usar funciones de administrador.

## Preparar el proyecto

Requisitos: Node.js 20 o posterior y `pnpm`.

Instala las dependencias:

```bash
pnpm install
```

Crea `.env.local` basado en `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publica
```

Si el proyecto usa todavía la clave anónima, puedes definir `NEXT_PUBLIC_SUPABASE_ANON_KEY` en su lugar. Las claves públicas deben estar protegidas por políticas RLS. Nunca agregues una clave `service_role` o secreta a variables `NEXT_PUBLIC_`. `.env.local` está excluido de Git.

Inicia el servidor local con `pnpm dev` y abre [http://localhost:3000](http://localhost:3000).

## Comandos

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo. |
| `pnpm build` | Genera la versión optimizada para producción. |
| `pnpm start` | Ejecuta la versión de producción después de compilarla. |

## Estructura principal

```text
app/                 Pantallas, callback de autenticación y estilos
components/          Formularios y componentes reutilizables
lib/supabase/        Clientes de Supabase para navegador y servidor
public/              Recursos estáticos
```
