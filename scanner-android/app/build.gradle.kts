import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val webEnvFile = rootProject.projectDir.parentFile.resolve(".env.local")
val signingPropertiesFile = rootProject.file("keystore.properties")
val signingProperties = Properties().apply {
    if (signingPropertiesFile.exists()) signingPropertiesFile.inputStream().use { load(it) }
}
fun envValue(name: String): String = System.getenv(name)
    ?: webEnvFile.takeIf { it.exists() }?.readLines()?.firstOrNull { it.startsWith("$name=") }?.substringAfter('=')?.trim()?.trim('"', '\'')
    ?: ""
fun String.asBuildConfigLiteral(): String = "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

android {
    namespace = "com.teatropablotesak.scanner"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.teatropablotesak.scanner"
        minSdk = 24
    targetSdk = 36
        versionCode = 2
        versionName = "1.0.1"
        buildConfigField("String", "SUPABASE_URL", envValue("NEXT_PUBLIC_SUPABASE_URL").asBuildConfigLiteral())
        buildConfigField("String", "SUPABASE_PUBLIC_KEY", (envValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").ifBlank { envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") }).asBuildConfigLiteral())
    }

    signingConfigs {
        if (signingPropertiesFile.exists()) {
            create("release") {
                storeFile = rootProject.file(signingProperties.getProperty("storeFile"))
                storePassword = signingProperties.getProperty("storePassword")
                keyAlias = signingProperties.getProperty("keyAlias")
                keyPassword = signingProperties.getProperty("keyPassword")
            }
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.findByName("release")
        }
    }

    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(platform("io.github.jan-tennert.supabase:bom:3.8.0"))
    implementation(platform("androidx.compose:compose-bom:2026.02.01"))
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.ktor:ktor-client-android:3.5.1")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
    implementation("com.google.android.gms:play-services-mlkit-document-scanner:16.0.0")
}
