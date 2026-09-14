'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Mail, Theater } from 'lucide-react'
import { firebaseConfigured, getFirebase } from '@/lib/firebase/client'

type UserProfile = { uid: string; fullName: string; email: string; role: string; active: boolean; profilePhotoUrl?: string | null }
type AuthContextValue = { user: User; profile: UserProfile; signOutUser: () => Promise<void> }
type AuthView = 'login' | 'register' | 'forgot'
const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthSession() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuthSession debe usarse dentro de AuthGate.')
  return value
}

function readableError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'El correo o la contraseña no son correctos.'
  if (code.includes('email-already-in-use')) return 'Este correo ya tiene una cuenta. Inicia sesión o recupera la contraseña.'
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (code.includes('invalid-email')) return 'Escribe un correo electrónico válido.'
  if (code.includes('popup-closed-by-user')) return 'Se cerró la ventana de Google antes de terminar el acceso.'
  if (code.includes('unauthorized-domain')) return 'Este dominio todavía no está autorizado en Firebase Authentication.'
  if (code.includes('network-request-failed')) return 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.'
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud. Inténtalo de nuevo.'
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AuthView>('login')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [checking, setChecking] = useState(true)
  const [notice, setNotice] = useState('')
  const [authError, setAuthError] = useState('')
  const blockedNotice = useRef('')

  useEffect(() => {
    if (!firebaseConfigured) {
      setChecking(false)
      return
    }
    let unsubscribe: (() => void) | undefined
    let disposed = false
    const { auth, db } = getFirebase()
    setPersistence(auth, browserLocalPersistence).then(() => {
      if (disposed) return
      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        if (!nextUser) {
          setUser(null)
          setProfile(null)
          setChecking(false)
          if (blockedNotice.current) {
            setNotice(blockedNotice.current)
            blockedNotice.current = ''
          }
          return
        }
        try {
          const hasGoogleProvider = nextUser.providerData.some((provider) => provider.providerId === 'google.com')
          if (!hasGoogleProvider && !nextUser.emailVerified) {
            blockedNotice.current = 'Verifica tu correo desde el enlace que te enviamos antes de iniciar sesión.'
            await signOut(auth)
            return
          }
          const profileRef = doc(db, 'users', nextUser.uid)
          const profileSnapshot = await getDoc(profileRef)
          if (!profileSnapshot.exists()) {
            const newProfile: UserProfile = {
              uid: nextUser.uid,
              fullName: nextUser.displayName || nextUser.email?.split('@')[0] || 'Usuario',
              email: nextUser.email || '',
              role: 'USER',
              active: true,
              profilePhotoUrl: nextUser.photoURL,
            }
            await setDoc(profileRef, { ...newProfile, emailVerified: nextUser.emailVerified, createdAt: serverTimestamp(), createdBy: 'SYSTEM', lastLoginAt: serverTimestamp() })
            setProfile(newProfile)
          } else {
            const data = profileSnapshot.data()
            if (data.active === false) {
              blockedNotice.current = 'Tu cuenta está desactivada. Comunícate con una persona administradora.'
              await signOut(auth)
              return
            }
            const nextProfile: UserProfile = {
              uid: nextUser.uid,
              fullName: data.fullName || nextUser.displayName || nextUser.email?.split('@')[0] || 'Usuario',
              email: data.email || nextUser.email || '',
              role: String(data.role || 'USER').toUpperCase(),
              active: data.active !== false,
              profilePhotoUrl: data.profilePhotoUrl || nextUser.photoURL,
            }
            if (!data.fullName && nextUser.displayName) await updateDoc(profileRef, { fullName: nextUser.displayName })
            await updateDoc(profileRef, { lastLoginAt: serverTimestamp(), emailVerified: nextUser.emailVerified })
            setProfile(nextProfile)
          }
          setUser(nextUser)
          setChecking(false)
          setNotice('')
        } catch (error) {
          setChecking(false)
          setAuthError(`No se pudo cargar tu perfil. ${readableError(error)}`)
          await signOut(auth).catch(() => undefined)
        }
      })
    }).catch((error: unknown) => {
      setChecking(false)
      setAuthError(readableError(error))
    })
    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  const signOutUser = async () => {
    if (!firebaseConfigured) return
    await signOut(getFirebase().auth)
  }

  const value = useMemo(() => user && profile ? { user, profile, signOutUser } : null, [user, profile])
  if (checking) return <div className="auth-loading"><span className="brand-mark"><Theater size={21} /></span><LoaderCircle className="loading-spinner" size={26} /><p>Preparando tu espacio…</p></div>
  if (value) return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

  return <AuthScreen
    view={view}
    setView={(nextView) => { setView(nextView); setNotice(''); setAuthError('') }}
    notice={notice}
    authError={authError}
    setNotice={setNotice}
    setAuthError={setAuthError}
  />
}

function AuthScreen({ view, setView, notice, authError, setNotice, setAuthError }: {
  view: AuthView
  setView: (view: AuthView) => void
  notice: string
  authError: string
  setNotice: (notice: string) => void
  setAuthError: (error: string) => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const changeView = (nextView: AuthView) => {
    setView(nextView)
    setFullName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setAuthError('')
    if (!firebaseConfigured) {
      setAuthError('Falta configurar Firebase para habilitar el acceso. Revisa las instrucciones de configuración en el README.')
      return
    }
    const { auth, db } = getFirebase()
    setBusy(true)
    try {
      if (view === 'login') {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password)
        if (!result.user.emailVerified && !result.user.providerData.some((provider) => provider.providerId === 'google')) {
          await signOut(auth)
          setNotice('Revisa tu correo y confirma la cuenta con el enlace de verificación antes de iniciar sesión.')
        }
      } else if (view === 'register') {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
        if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.')
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(result.user, { displayName: fullName.trim() })
        const userProfile: UserProfile = { uid: result.user.uid, fullName: fullName.trim(), email: email.trim(), role: 'USER', active: true }
        await setDoc(doc(db, 'users', result.user.uid), {
          ...userProfile,
          emailVerified: false,
          createdAt: serverTimestamp(),
          createdBy: 'SYSTEM',
          lastLoginAt: serverTimestamp(),
          profilePhotoUrl: null,
        })
        await sendEmailVerification(result.user)
        await signOut(auth)
        setView('login')
        setNotice('Cuenta creada. Te enviamos un correo para verificar tu dirección antes de iniciar sesión.')
      } else {
        await sendPasswordResetEmail(auth, email.trim())
        setView('login')
        setNotice('Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.')
      }
    } catch (error) {
      setAuthError(readableError(error))
    } finally {
      setBusy(false)
    }
  }

  async function continueWithGoogle() {
    setNotice('')
    setAuthError('')
    if (!firebaseConfigured) {
      setAuthError('Falta configurar Firebase para habilitar el acceso con Google. Revisa las instrucciones del README.')
      return
    }
    setBusy(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(getFirebase().auth, provider)
    } catch (error) {
      setAuthError(readableError(error))
    } finally {
      setBusy(false)
    }
  }

  const isLogin = view === 'login'
  const isRegister = view === 'register'
  const title = isLogin ? 'Iniciar sesión' : isRegister ? 'Crear cuenta' : 'Recuperar contraseña'

  return <main className="auth-page">
    <section className="auth-brand-panel">
      <div className="auth-brand"><span className="brand-mark"><Theater size={23} /></span><span>Teatro Pablo Tesak</span></div>
      <div className="auth-brand-copy"><span className="auth-kicker">GESTIÓN CULTURAL</span><h1>Las actividades que transforman, en un solo lugar.</h1><p>Registra, organiza y da seguimiento al trabajo que hacemos junto a las comunidades.</p></div>
      <div className="auth-brand-foot">Sistema de control y seguimiento de actividades</div>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap">
      <span className="auth-mobile-brand"><span className="brand-mark"><Theater size={20} /></span>Teatro Pablo Tesak</span>
      {!isLogin && <button className="auth-back" onClick={() => changeView('login')}><ArrowLeft size={17} />Volver al acceso</button>}
      <p className="auth-kicker">TEATRO PABLO TESAK</p><h2>{title}</h2><p className="auth-description">{isLogin ? 'Ingresa con tu cuenta para continuar.' : isRegister ? 'Crea tu cuenta para acceder al sistema.' : 'Te enviaremos un enlace para restablecer tu contraseña.'}</p>
      {notice && <div className="auth-message success" role="status">{notice}</div>}
      {authError && <div className="auth-message error" role="alert">{authError}</div>}
      {!firebaseConfigured && <div className="auth-message config" role="status">La autenticación web necesita las variables de Firebase. Consulta la sección de configuración del README.</div>}
      <form className="auth-form" onSubmit={submit}>
        {isRegister && <label>Nombre completo<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre" required disabled={busy} /></label>}
        <label>Correo electrónico<span className="auth-input-wrap"><Mail size={17} /><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" required disabled={busy} /></span></label>
        {view !== 'forgot' && <>
          <label>Contraseña<span className="auth-input-wrap"><input autoComplete={isLogin ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required disabled={busy} /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {isRegister && <label>Confirmar contraseña<input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Vuelve a escribir la contraseña" minLength={6} required disabled={busy} /></label>}
        </>}
        {isLogin && <button className="forgot-link" type="button" onClick={() => changeView('forgot')} disabled={busy}>¿Olvidaste tu contraseña?</button>}
        <button className="auth-submit" type="submit" disabled={busy || !firebaseConfigured}>{busy ? <><LoaderCircle className="spin" size={18} />Procesando…</> : isLogin ? 'Ingresar' : isRegister ? 'Crear cuenta' : 'Enviar enlace de recuperación'}</button>
      </form>
      {isLogin && <><div className="auth-divider"><span />o continúa con<span /></div><button className="google-button" onClick={continueWithGoogle} disabled={busy || !firebaseConfigured}><GoogleMark />Continuar con Google</button><p className="auth-switch">¿No tienes cuenta? <button onClick={() => changeView('register')}>Regístrate aquí</button></p><p className="auth-note">Las cuentas nuevas comienzan con permisos de colaborador. La administración de roles se realiza desde el sistema.</p></>}
      {isRegister && <p className="auth-note">Al registrarte, enviaremos un correo de verificación. Podrás iniciar sesión después de confirmar tu dirección.</p>}
      {view === 'forgot' && <button className="auth-switch auth-switch-button" onClick={() => changeView('login')}>Regresar a iniciar sesión</button>}
    </div></section>
  </main>
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.71 7.16l7.2 5.59c4.2-3.88 6.55-9.59 6.55-17.22Z"/><path fill="#FBBC05" d="M10.54 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)"/><path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.78l-7.2-5.59c-2 1.34-4.56 2.13-8.67 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
}
