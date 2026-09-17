package com.teatropablotesak.scanner

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Bundle
import android.os.ParcelFileDescriptor
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.ExternalAuthAction
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.handleDeeplinks
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {
    private val supabase by lazy {
        createSupabaseClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_PUBLIC_KEY) {
            install(Auth) {
                scheme = "teatrotesakscanner"
                host = "auth-callback"
                defaultExternalAuthAction = ExternalAuthAction.CustomTabs()
            }
        }
    }

    private var authReady by mutableStateOf(false)
    private var authenticated by mutableStateOf(false)
    private var currentUserId by mutableStateOf("")
    private var currentEmail by mutableStateOf("")
    private var signingIn by mutableStateOf(false)
    private var uploadUrl by mutableStateOf("")
    private var apiKey by mutableStateOf("")
    private var requiredUserId by mutableStateOf("")
    private var status by mutableStateOf("Inicia sesión con Google para usar el escáner de Teatro Pablo Tesak.")
    private var scanning by mutableStateOf(false)
    private var uploading by mutableStateOf(false)
    private var pdfFile by mutableStateOf<File?>(null)
    private var pdfBitmap by mutableStateOf<Bitmap?>(null)
    private var pdfPage by mutableStateOf(0)
    private var pdfPageCount by mutableStateOf(0)

    private val scannerLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        scanning = false
        if (result.resultCode != RESULT_OK) {
            status = "Escaneo cancelado. Puedes volver a intentarlo con el mismo QR."
            return@registerForActivityResult
        }
        val pdfUri = com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
            .fromActivityResultIntent(result.data)?.pdf?.uri
        if (pdfUri == null) {
            status = "El escáner de Google no devolvió un PDF. Vuelve a intentarlo."
            return@registerForActivityResult
        }
        prepareAndUploadPdf(pdfUri)
    }

    private val pdfPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) preparePdfPreview(uri, uploadAfterPreview = false)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supabase.handleDeeplinks(intent)
        handleScannerLink(intent)
        setContent {
            ScannerScreen(
                authReady = authReady,
                authenticated = authenticated,
                email = currentEmail,
                status = status,
                ready = canScan(),
                busy = signingIn || scanning || uploading,
                pdfBitmap = pdfBitmap,
                pdfPage = pdfPage,
                pdfPageCount = pdfPageCount,
                onSignIn = ::signInWithGoogle,
                onSignOut = ::signOut,
                onScan = ::startScanner,
                onOpenPdf = { pdfPicker.launch(arrayOf("application/pdf")) },
                onPreviousPage = { showPdfPage((pdfPage - 1).coerceAtLeast(0)) },
                onNextPage = { showPdfPage((pdfPage + 1).coerceAtMost(pdfPageCount - 1)) },
            )
        }
        lifecycleScope.launch {
            supabase.auth.sessionStatus.collect { sessionStatus ->
                authReady = sessionStatus !is SessionStatus.Initializing
                when (sessionStatus) {
                    is SessionStatus.Authenticated -> {
                        authenticated = true
                        currentUserId = sessionStatus.session.user?.id.orEmpty()
                        currentEmail = sessionStatus.session.user?.email.orEmpty()
                        if (uploadUrl.isNotBlank()) launchScannerWhenReady()
                        else if (status.startsWith("Inicia sesión")) status = "Sesión iniciada. Escanea el QR de la computadora o abre un PDF."
                    }
                    is SessionStatus.NotAuthenticated -> {
                        authenticated = false
                        currentUserId = ""
                        currentEmail = ""
                        if (authReady && uploadUrl.isNotBlank()) status = "El QR está listo. Inicia sesión con la misma cuenta que usaste en la página."
                    }
                    is SessionStatus.RefreshFailure -> {
                        authenticated = false
                        currentUserId = ""
                        currentEmail = ""
                        status = "La sesión venció. Inicia sesión nuevamente para continuar."
                    }
                    SessionStatus.Initializing -> Unit
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        supabase.handleDeeplinks(intent)
        handleScannerLink(intent)
    }

    private fun signInWithGoogle() {
        if (BuildConfig.SUPABASE_URL.isBlank() || BuildConfig.SUPABASE_PUBLIC_KEY.isBlank()) {
            status = "Falta configurar la conexión con Supabase para el inicio de sesión."
            return
        }
        lifecycleScope.launch {
            signingIn = true
            status = "Abriendo el inicio de sesión seguro de Google…"
            try {
                supabase.auth.signInWith(Google)
            } catch (error: Exception) {
                status = "No se pudo iniciar sesión: ${error.localizedMessage ?: "intenta nuevamente"}"
            } finally {
                signingIn = false
            }
        }
    }

    private fun signOut() {
        lifecycleScope.launch {
            runCatching { supabase.auth.signOut() }
                .onFailure { status = "No se pudo cerrar la sesión: ${it.localizedMessage.orEmpty()}" }
        }
    }

    private fun handleScannerLink(intent: Intent?) {
        val link = intent?.data ?: return
        if (link.scheme != "teatrotesakscanner" || link.host != "scan") return

        uploadUrl = link.getQueryParameter("uploadUrl").orEmpty()
        apiKey = link.getQueryParameter("apiKey").orEmpty()
        requiredUserId = link.getQueryParameter("userId").orEmpty()
        val parsedUploadUrl = runCatching { URL(uploadUrl) }.getOrNull()
        val trustedUploadUrl = parsedUploadUrl?.let {
            it.protocol == "https" && it.host.endsWith(".supabase.co") &&
                it.path.startsWith("/storage/v1/object/upload/sign/")
        } == true
        val trustedApiKey = apiKey.isNotBlank() && apiKey == BuildConfig.SUPABASE_PUBLIC_KEY
        if (!trustedUploadUrl || !trustedApiKey || requiredUserId.isBlank()) {
            clearPendingUpload()
            status = "Este QR no es válido o venció. Genera uno nuevo desde la actividad."
            return
        }
        status = "QR recibido. Inicia sesión con la cuenta que generó la actividad; el escáner se abrirá al volver a esta app."
        launchScannerWhenReady()
    }

    private fun canScan(): Boolean = authenticated && uploadUrl.isNotBlank() &&
        requiredUserId.isNotBlank() && currentUserId == requiredUserId

    private fun launchScannerWhenReady() {
        if (!authenticated) {
            status = "Inicia sesión con Google para usar el escáner."
            return
        }
        if (currentUserId != requiredUserId) {
            status = "Inicia sesión con la misma cuenta de Google que usaste en la aplicación web."
            return
        }
        window.decorView.post { startScanner() }
    }

    private fun startScanner() {
        if (!canScan() || scanning || uploading) return
        scanning = true
        status = "Abriendo el escáner de documentos de Google…"
        val options = com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(30)
            .setResultFormats(
                com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.RESULT_FORMAT_PDF,
                com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.RESULT_FORMAT_JPEG,
            )
            .setScannerMode(com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()
        com.google.mlkit.vision.documentscanner.GmsDocumentScanning.getClient(options).getStartScanIntent(this)
            .addOnSuccessListener { sender -> scannerLauncher.launch(IntentSenderRequest.Builder(sender).build()) }
            .addOnFailureListener { error ->
                scanning = false
                status = "No se pudo iniciar el escáner. Comprueba Google Play Services. ${error.localizedMessage.orEmpty()}"
            }
    }

    private fun prepareAndUploadPdf(uri: Uri) {
        lifecycleScope.launch {
            try {
                status = "Preparando y abriendo el PDF escaneado…"
                val file = copyPdfToCache(uri, maxBytes = 20L * 1024 * 1024)
                val (bitmap, pages) = renderPdfPage(file, 0)
                pdfFile = file
                pdfBitmap = bitmap
                pdfPage = 0
                pdfPageCount = pages
                uploadScannedPdf(file)
            } catch (error: Exception) {
                status = "No se pudo preparar el PDF: ${error.localizedMessage ?: "vuelve a escanear"}"
            }
        }
    }

    private fun preparePdfPreview(uri: Uri, uploadAfterPreview: Boolean) {
        lifecycleScope.launch {
            try {
                status = "Abriendo el documento PDF…"
                val file = copyPdfToCache(uri, maxBytes = 100L * 1024 * 1024)
                val (bitmap, pages) = renderPdfPage(file, 0)
                pdfFile = file
                pdfBitmap = bitmap
                pdfPage = 0
                pdfPageCount = pages
                status = "PDF abierto. Usa los controles para recorrer las páginas."
                if (uploadAfterPreview && uploadUrl.isNotBlank()) uploadScannedPdf(file)
            } catch (error: Exception) {
                status = "No se pudo abrir este PDF: ${error.localizedMessage ?: "archivo no válido"}"
            }
        }
    }

    private suspend fun copyPdfToCache(uri: Uri, maxBytes: Long): File = withContext(Dispatchers.IO) {
        val file = File(cacheDir, "documento-teatro.pdf")
        contentResolver.openInputStream(uri)?.use { input ->
            file.outputStream().use { output ->
                val buffer = ByteArray(16 * 1024)
                var total = 0L
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    if (total > maxBytes) error("El documento supera el límite permitido de ${maxBytes / (1024 * 1024)} MB.")
                    output.write(buffer, 0, count)
                }
            }
        } ?: error("Android no pudo leer el archivo seleccionado.")
        if (file.length() == 0L) error("El archivo seleccionado está vacío.")
        file
    }

    private suspend fun renderPdfPage(file: File, pageIndex: Int): Pair<Bitmap, Int> = withContext(Dispatchers.IO) {
        val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = PdfRenderer(descriptor)
        try {
            if (renderer.pageCount == 0) error("El PDF no contiene páginas.")
            val page = renderer.openPage(pageIndex.coerceIn(0, renderer.pageCount - 1))
            try {
                val width = 1400
                val height = (width.toFloat() * page.height / page.width).toInt().coerceAtLeast(1)
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                bitmap to renderer.pageCount
            } finally {
                page.close()
            }
        } finally {
            renderer.close()
            descriptor.close()
        }
    }

    private fun showPdfPage(index: Int) {
        val file = pdfFile ?: return
        if (index !in 0 until pdfPageCount) return
        lifecycleScope.launch {
            runCatching { renderPdfPage(file, index) }
                .onSuccess { (bitmap, count) -> pdfBitmap = bitmap; pdfPage = index; pdfPageCount = count }
                .onFailure { status = "No se pudo mostrar la página del PDF: ${it.localizedMessage.orEmpty()}" }
        }
    }

    private fun uploadScannedPdf(file: File) {
        if (!canScan()) {
            status = "Inicia sesión con la cuenta que generó el QR antes de subir el documento."
            return
        }
        uploading = true
        status = "Subiendo el PDF privado a Supabase…"
        lifecycleScope.launch {
            try {
                if (file.length() > 20L * 1024 * 1024) error("El PDF supera el límite de 20 MB. Escanea con menos páginas o menor calidad.")
                withContext(Dispatchers.IO) {
                    val connection = (URL(uploadUrl).openConnection() as HttpURLConnection).apply {
                        requestMethod = "PUT"
                        connectTimeout = 30_000
                        readTimeout = 60_000
                        doOutput = true
                        setRequestProperty("apikey", apiKey)
                        setRequestProperty("Content-Type", "application/pdf")
                        setRequestProperty("cache-control", "max-age=3600")
                        setRequestProperty("x-upsert", "false")
                        setFixedLengthStreamingMode(file.length())
                    }
                    try {
                        file.inputStream().use { input ->
                            connection.outputStream.use { output -> input.copyTo(output) }
                        }
                        if (connection.responseCode !in 200..299) {
                            val detail = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                            error("Supabase rechazó la carga (${connection.responseCode}). $detail")
                        }
                    } finally {
                        connection.disconnect()
                    }
                }
                status = "PDF escaneado y subido. Puedes revisarlo aquí; al guardar la actividad se adjuntará al registro."
                clearPendingUpload()
            } catch (error: Exception) {
                status = "No se pudo subir el escaneo: ${error.localizedMessage ?: "error de conexión"}. Genera un QR nuevo e inténtalo otra vez."
            } finally {
                uploading = false
            }
        }
    }

    private fun clearPendingUpload() {
        uploadUrl = ""
        apiKey = ""
        requiredUserId = ""
    }
}

@androidx.compose.runtime.Composable
private fun ScannerScreen(
    authReady: Boolean,
    authenticated: Boolean,
    email: String,
    status: String,
    ready: Boolean,
    busy: Boolean,
    pdfBitmap: Bitmap?,
    pdfPage: Int,
    pdfPageCount: Int,
    onSignIn: () -> Unit,
    onSignOut: () -> Unit,
    onScan: () -> Unit,
    onOpenPdf: () -> Unit,
    onPreviousPage: () -> Unit,
    onNextPage: () -> Unit,
) {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("TEATRO PABLO TESAK", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                Text("Escáner de documentos", fontSize = 25.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Text(status, fontSize = 14.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))

                if (!authReady) {
                    Text("Verificando la sesión…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else if (!authenticated) {
                    Button(onClick = onSignIn, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                        Text(if (busy) "Abriendo Google…" else "Iniciar sesión con Google")
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("Usa la misma cuenta con la que inicias sesión en la aplicación web.", fontSize = 12.sp, textAlign = TextAlign.Center)
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Text(email.ifBlank { "Sesión iniciada" }, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(4.dp))
                        TextButton(onClick = onSignOut, enabled = !busy) { Text("Cerrar sesión") }
                    }
                    Button(onClick = onScan, enabled = ready && !busy, modifier = Modifier.fillMaxWidth()) {
                        Text(if (busy) "Preparando documento…" else "Escanear documento")
                    }
                }
                if (authReady) {
                    OutlinedButton(onClick = onOpenPdf, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                        Text("Abrir PDF del dispositivo")
                    }
                }

                if (pdfBitmap != null) {
                    Spacer(Modifier.height(18.dp))
                    Image(
                        bitmap = pdfBitmap.asImageBitmap(),
                        contentDescription = "Página ${pdfPage + 1} del PDF",
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        TextButton(onClick = onPreviousPage, enabled = pdfPage > 0) { Text("Anterior") }
                        Text("${pdfPage + 1} de $pdfPageCount", fontSize = 12.sp)
                        TextButton(onClick = onNextPage, enabled = pdfPage + 1 < pdfPageCount) { Text("Siguiente") }
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text("Los documentos se suben al almacenamiento privado de Supabase.", fontSize = 11.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
