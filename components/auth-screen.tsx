"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { firebase } from "@/lib/firebase";
import { errorMessage } from "@/lib/models";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    void getRedirectResult(firebase().auth).catch((e) => {
      if (mounted) setError(errorMessage(e));
    });
    return () => {
      mounted = false;
    };
  }, []);
  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password") || "");
    await perform(async () => {
      const { auth } = firebase();
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setMessage("Revisa tu correo para recuperar la contraseña.");
        return;
      }
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(credential.user, {
          displayName: String(data.get("name")).trim(),
        });
        await sendEmailVerification(credential.user);
      } else await signInWithEmailAndPassword(auth, email, password);
    });
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand">
          <img src="/logo-teatro-pablo-tesak.png" alt="Teatro Pablo Tesak" />
          <span>TEATRO PABLO TESAK</span>
        </div>
        <div>
          <span className="eyebrow">ARTE QUE NOS ENCUENTRA</span>
          <h1>
            Cada actividad
            <br />
            cuenta una historia.
          </h1>
          <p>
            Un espacio para organizar, acompañar y compartir el trabajo que da
            vida a nuestro teatro.
          </p>
          <div className="story-line" />
        </div>
        <footer>
          Ministerio de Educación, Ciencia y Tecnología
          <br />
          El Salvador
        </footer>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <span className="eyebrow">GESTIÓN DE ACTIVIDADES</span>
          <h2>
            {mode === "login"
              ? "Bienvenido de nuevo"
              : mode === "register"
                ? "Crea tu cuenta"
                : "Recupera tu acceso"}
          </h2>
          <p className="muted">
            Usa la misma cuenta que utilizas en la aplicación Android.
          </p>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="alert success">
              {message}
            </div>
          )}
          {mode === "login" && (
            <>
              <button
                className="google-button"
                disabled={busy}
                onClick={() =>
                  perform(() =>
                    signInWithRedirect(
                      firebase().auth,
                      new GoogleAuthProvider(),
                    ),
                  )
                }
              >
                <b className="google-g">G</b> Continuar con Google
              </button>
              <div className="divider">
                <span>o con tu correo electrónico</span>
              </div>
            </>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Nombre completo
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={150}
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                placeholder="nombre@mined.gob.sv"
                autoComplete="email"
                required
              />
            </label>
            {mode !== "reset" && (
              <label>
                Contraseña
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
              </label>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {mode === "login"
                    ? "Iniciar sesión"
                    : mode === "register"
                      ? "Registrarme"
                      : "Enviar enlace"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="auth-links">
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login"
                ? "Crear una cuenta"
                : "Volver a iniciar sesión"}
            </button>
            {mode === "login" && (
              <button className="text-button" onClick={() => setMode("reset")}>
                Olvidé mi contraseña
              </button>
            )}
          </div>
          <div className="secure-note">
            <ShieldCheck size={16} /> Acceso institucional protegido con
            Firebase
          </div>
          <a className="privacy-link" href="/privacidad">
            Privacidad y uso de datos
          </a>
        </div>
      </section>
    </main>
  );
}
