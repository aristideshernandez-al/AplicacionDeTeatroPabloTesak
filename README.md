# Aplicación web del Teatro Pablo Tesak

Versión web del sistema de control y seguimiento de actividades del Teatro Pablo Tesak. Está diseñada para escritorio y teléfonos, tomando como referencia la aplicación Android.

## Funciones disponibles

- Resumen con actividades recientes, métricas del mes y estado de gestión.
- Registro de actividades como borradores.
- Búsqueda y filtro de actividades por estado.
- Consulta de instituciones participantes.
- Consulta de usuarios para perfiles administradores.
- Descarga de un reporte de actividades en formato CSV.
- Navegación adaptada a pantallas pequeñas.

## Tecnologías

- Next.js y React
- TypeScript
- Tailwind CSS
- Supabase para consultar y guardar información

## Requisitos

Instala [Node.js](https://nodejs.org/) y `pnpm` antes de iniciar el proyecto.

## Instalación y ejecución

Desde la carpeta del proyecto, instala las dependencias:

```bash
pnpm install
```

Crea un archivo `.env.local` en la raíz del proyecto y agrega la URL y la clave pública de tu proyecto de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publica
```

Si tu proyecto todavía utiliza una clave anónima, puedes usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` en lugar de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No agregues claves secretas o `service_role` a variables que comiencen con `NEXT_PUBLIC_`, ni compartas el archivo `.env.local`.

Inicia el servidor local:

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Comandos

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo. |
| `pnpm build` | Genera la versión optimizada para producción. |
| `pnpm start` | Ejecuta la versión de producción después de compilarla. |

## Datos y configuración

La versión web consulta las tablas `activities`, `activity_institutions` y `profiles` de Supabase. Para mostrar la sección de usuarios, el perfil debe tener el rol `ADMIN`.

La aplicación Android de referencia usa Firebase. La versión web todavía usa Supabase, por lo que los datos no se sincronizan automáticamente entre ambas aplicaciones. Si no se configura Supabase, la web muestra el estado vacío y los borradores que se creen solo permanecen en la sesión actual del navegador.

## Estructura principal

```text
app/                 Pantallas, diseño y estilos
components/          Componentes reutilizables
lib/supabase/        Cliente de conexión con Supabase
public/              Recursos estáticos
```
