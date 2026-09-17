# Escáner Teatro Pablo Tesak (Android)

Aplicación Android independiente para escanear documentos con el escáner de documentos de Google ML Kit y subir el PDF directamente al bucket privado `activity-attachments` de Supabase.

## Uso

1. Instala `app-debug.apk` en un teléfono Android con Google Play Services.
2. En la web, dentro del formulario de actividad, selecciona **Crear borrador y generar QR**.
3. Escanea el QR con la cámara o lector QR del teléfono. Android abrirá Escáner Teatro y luego el escáner de documentos de Google.
4. Escanea las páginas y confirma. La aplicación sube el PDF a Supabase; vuelve a la computadora y guarda la actividad.

El QR contiene un permiso temporal para cargar un único archivo, emitido por Supabase. El teléfono no necesita iniciar sesión. Genera otro QR si el permiso caduca o si la carga falla. El enlace sólo se acepta si apunta al endpoint HTTPS de carga firmada de Supabase.

## Compilar

Desde esta carpeta ejecuta `gradlew.bat :app:assembleDebug`. El APK de prueba queda en `app/build/outputs/apk/debug/app-debug.apk`. Para distribuir fuera de pruebas, genera una compilación firmada de lanzamiento desde Android Studio.

El escáner de documentos de Google funciona en Android con Google Play Services; no es una API web ni almacena los documentos en Google Drive. ML Kit devuelve el PDF al teléfono, y la aplicación lo envía al almacenamiento privado de Supabase.
