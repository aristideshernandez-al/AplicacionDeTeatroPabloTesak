package com.teatropablotesak.scanner

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {
    private var uploadUrl by mutableStateOf("")
    private var apiKey by mutableStateOf("")
    private var status by mutableStateOf("Abre el QR generado en la computadora para iniciar un escaneo seguro.")
    private var scanning by mutableStateOf(false)
    private var uploading by mutableStateOf(false)

    private val scannerLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        scanning = false
        if (result.resultCode != RESULT_OK) {
            status = "Escaneo cancelado. Puedes volver a abrir el QR para intentarlo otra vez."
            return@registerForActivityResult
        }
        val scanResult = GmsDocumentScanningResult.fromActivityResultIntent(result.data)
        val pdfUri = scanResult?.pdf?.uri
        if (pdfUri == null) {
            status = "Google no devolvió el PDF del escaneo. Vuelve a intentarlo."
            return@registerForActivityResult
        }
        uploadScannedPdf(pdfUri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleScannerLink(intent)
        setContent { ScannerScreen(status = status, ready = uploadUrl.isNotBlank(), busy = scanning || uploading, onScan = ::startScanner) }
        if (uploadUrl.isNotBlank()) window.decorView.post { startScanner() }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleScannerLink(intent)
        if (uploadUrl.isNotBlank()) window.decorView.post { startScanner() }
    }

    private fun handleScannerLink(intent: Intent?) {
        val link = intent?.data ?: return
        if (link.scheme != "teatrotesakscanner" || link.host != "scan") return
        uploadUrl = link.getQueryParameter("uploadUrl").orEmpty()
        apiKey = link.getQueryParameter("apiKey").orEmpty()
        val parsedUploadUrl = runCatching { URL(uploadUrl) }.getOrNull()
        val trustedUploadUrl = parsedUploadUrl?.let {
            it.protocol == "https" && it.host.endsWith(".supabase.co") &&
                it.path.startsWith("/storage/v1/object/upload/sign/")
        } == true
        status = if (trustedUploadUrl && apiKey.isNotBlank()) {
            "Listo. Se abrirá el escáner de documentos de Google. Al finalizar, el PDF se subirá directamente a Supabase."
        } else {
            uploadUrl = ""
            "El QR no contiene un permiso de carga válido. Genera un QR nuevo desde la actividad."
        }
    }

    private fun startScanner() {
        if (uploadUrl.isBlank() || scanning || uploading) return
        scanning = true
        status = "Abriendo el escáner de Google…"
        val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(30)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_PDF, GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()
        GmsDocumentScanning.getClient(options).getStartScanIntent(this)
            .addOnSuccessListener { sender -> scannerLauncher.launch(IntentSenderRequest.Builder(sender).build()) }
            .addOnFailureListener { error ->
                scanning = false
                status = "No se pudo iniciar el escáner. Comprueba Google Play Services e inténtalo otra vez. ${error.localizedMessage.orEmpty()}"
            }
    }

    private fun uploadScannedPdf(uri: Uri) {
        uploading = true
        status = "Subiendo el PDF privado a Supabase…"
        lifecycleScope.launch {
            try {
                val bytes = withContext(Dispatchers.IO) {
                    contentResolver.openInputStream(uri)?.use { input ->
                        val output = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(8192)
                        var total = 0
                        while (true) {
                            val count = input.read(buffer)
                            if (count < 0) break
                            total += count
                            if (total > 20 * 1024 * 1024) error("El PDF supera el límite de 20 MB. Escanea con menos páginas o menor calidad.")
                            output.write(buffer, 0, count)
                        }
                        output.toByteArray()
                    } ?: error("No se pudo leer el PDF escaneado.")
                }
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
                        setFixedLengthStreamingMode(bytes.size)
                    }
                    try {
                        connection.outputStream.use { it.write(bytes) }
                        if (connection.responseCode !in 200..299) {
                            val detail = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                            error("Supabase rechazó la carga (${connection.responseCode}). $detail")
                        }
                    } finally { connection.disconnect() }
                }
                status = "Documento escaneado y subido a Supabase. Regresa a la computadora y guarda la actividad para finalizar."
                uploadUrl = ""
                apiKey = ""
            } catch (error: Exception) {
                status = "No se pudo subir el escaneo: ${error.message ?: "error de conexión"}. Genera un QR nuevo e inténtalo otra vez."
            } finally { uploading = false }
        }
    }
}

@androidx.compose.runtime.Composable
private fun ScannerScreen(status: String, ready: Boolean, busy: Boolean, onScan: () -> Unit) {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.fillMaxSize().padding(28.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("TEATRO PABLO TESAK", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(16.dp))
                Text("Escáner de documentos", fontSize = 25.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                Text(status, fontSize = 15.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(24.dp))
                Button(onClick = onScan, enabled = ready && !busy) {
                    Text(when { busy -> "Preparando o subiendo…"; else -> "Iniciar escáner" })
                }
            }
        }
    }
}
