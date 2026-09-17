# Escáner Teatro Pablo Tesak (Android)

Aplicación Android independiente para escanear documentos con el escáner de documentos de Google ML Kit y subir el PDF directamente al bucket privado `activity-attachments` de Supabase.

## Uso

1. Inicia sesión en Escáner Teatro con la misma cuenta de Google que usas en la aplicación web.
2. En la web, dentro del formulario de actividad, genera el QR de escaneo.
3. Escanea el QR con la cámara o lector QR del teléfono. Android abrirá Escáner Teatro y luego el escáner de documentos de Google.
4. Escanea las páginas y confirma. La aplicación muestra el PDF y lo sube a Supabase; vuelve a la computadora y guarda la actividad.

El QR contiene un permiso temporal para cargar un único archivo, emitido por Supabase, y el identificador de la cuenta que creó la actividad. La aplicación requiere que inicies sesión con esa misma cuenta. Genera otro QR si el permiso caduca o si la carga falla. El enlace sólo se acepta si apunta al endpoint HTTPS de carga firmada de Supabase.

## Compilar

Desde esta carpeta ejecuta `gradlew.bat :app:assembleDebug`. El APK de prueba queda en `app/build/outputs/apk/debug/app-debug.apk`. El paquete de Google Play es `app/build/outputs/bundle/release/app-release.aab`; la llave de carga y `keystore.properties` deben respaldarse de forma privada y nunca subirse a Git.

El escáner de documentos de Google funciona en Android con Google Play Services; no es una API web ni almacena los documentos en Google Drive. ML Kit devuelve el PDF al teléfono, y la aplicación lo envía al almacenamiento privado de Supabase.
