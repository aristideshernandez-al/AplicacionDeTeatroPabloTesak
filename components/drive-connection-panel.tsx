"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Cloud, LoaderCircle, ShieldCheck } from "lucide-react";
import { firebase } from "@/lib/firebase";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (options: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            select_account: boolean;
            prompt: string;
            callback: (response: { code?: string; error?: string }) => void;
            error_callback?: (error: { type?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

const CLIENT_ID = "585734411312-l189mhlvsq513q3v5695geo410rfaifu.apps.googleusercontent.com";
type Status = { connected: boolean; email: string | null };

export function DriveConnectionPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await httpsCallable<void, Status>(firebase().functions, "getDriveConnectionStatus")();
    setStatus(result.data);
  }

  useEffect(() => {
    void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo consultar el estado de Google Drive."));
    if (!document.querySelector("script[data-google-identity]") && !window.google?.accounts?.oauth2) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!window.google?.accounts?.oauth2) throw new Error("No se pudo cargar la autorización segura de Google. Recarga la página e inténtalo de nuevo.");
      const auth = firebase().auth;
      if (!auth.currentUser) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
      const code = await new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts!.oauth2!.initCodeClient({
          client_id: CLIENT_ID,
          scope: "openid email https://www.googleapis.com/auth/drive",
          ux_mode: "popup",
          select_account: true,
          prompt: "consent select_account",
          callback: (response) => response.code ? resolve(response.code) : reject(new Error(response.error || "Google no devolvió el permiso de Drive.")),
          error_callback: (reason) => reject(new Error(reason.type || "No se completó la autorización de Google Drive.")),
        });
        client.requestCode();
      });
      const result = await httpsCallable<{ code: string }, Status>(firebase().functions, "completeDriveConnection")({ code });
      setStatus(result.data);
      setMessage(`Google Drive conectado como ${result.data.email}. Los reportes de tus actividades se guardarán automáticamente.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo conectar Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      await httpsCallable<void, { connected: boolean }>(firebase().functions, "disconnectDrive")();
      setStatus({ connected: false, email: null });
      setMessage("Google Drive quedó desconectado. Los reportes no se subirán hasta volver a conectarlo.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo desconectar Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2><Cloud size={20} style={{ verticalAlign: "middle", marginRight: 8 }} /> Guardado automático en Google Drive</h2>
      <p className="muted">Autoriza una vez la cuenta Google que tiene acceso a la carpeta institucional. Al guardar actividades, se enviarán ahí el PDF, las fotografías y las listas de asistencia.</p>
      {status?.connected ? (
        <p className="alert success"><ShieldCheck size={17} /> Conectado como <strong>{status.email}</strong></p>
      ) : (
        <p className="muted">Aún no está conectada la cuenta de Drive de este usuario.</p>
      )}
      {error && <div className="alert error" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <button className="primary" disabled={busy} onClick={() => void connect()}>
          {busy && <LoaderCircle className="spin" size={17} />}{status?.connected ? "Revisar conexión de Drive" : "Conectar Google Drive"}
        </button>
        {status?.connected && <button className="secondary" disabled={busy} onClick={() => void disconnect()}>Desconectar</button>}
      </div>
    </section>
  );
}
