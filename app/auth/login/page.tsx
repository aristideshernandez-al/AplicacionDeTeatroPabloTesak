'use client'

import './login.css'
import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      setError('No se pudo completar el acceso. Verifica que Google esté habilitado en Supabase y vuelve a intentarlo.')
    }
  }, [])
  async function signInWithGoogle() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const redirect = new URL('/auth/callback', window.location.origin)
    const next = new URLSearchParams(window.location.search).get('next')
    if (next?.startsWith('/') && !next.startsWith('//')) redirect.searchParams.set('next', next)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect.toString(), queryParams: { access_type: 'offline', prompt: 'select_account' } },
    })
    if (authError) { setError('No se pudo iniciar sesión con Google. Intenta nuevamente.'); setLoading(false) }
  }
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <a className="auth-brand" href="/" aria-label="Teatro Pablo Tesak, inicio">
          <span className="auth-brand-mark"><Activity size={20} strokeWidth={2.2} /></span>
          <span className="auth-brand-name">Teatro Pablo Tesak</span>
        </a>

        <div className="auth-content">
          <p className="auth-kicker"><span /> PLATAFORMA INSTITUCIONAL</p>
          <h1 id="login-title">Bienvenido de nuevo</h1>
          <p className="auth-copy">Inicia sesión para gestionar y dar seguimiento a las actividades del Teatro Pablo Tesak.</p>

          <button className="google-button" onClick={signInWithGoogle} disabled={loading}>
            {loading ? <Loader2 className="spin" size={19} /> : <GoogleMark />}
            <span>{loading ? 'Conectando con Google…' : 'Continuar con Google'}</span>
            {!loading && <ArrowUpRight className="google-arrow" size={17} />}
          </button>
          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-security"><ShieldCheck size={16} /><span>Acceso seguro con tu cuenta institucional de Google</span></div>
        </div>

        <p className="auth-legal">© {new Date().getFullYear()} Teatro Pablo Tesak <span>·</span> Uso institucional</p>
      </section>

      <aside className="auth-visual" aria-label="Teatro Pablo Tesak, arte y comunidad">
        <div className="auth-visual-top"><span className="auth-visual-icon"><Sparkles size={17} /></span><span>ARTE · CULTURA · COMUNIDAD</span></div>
        <div className="auth-stage-art" aria-hidden="true">
          <div className="stage-glow" />
          <div className="stage-curtain stage-curtain-left" />
          <div className="stage-curtain stage-curtain-right" />
          <div className="stage-light" />
          <div className="stage-floor" />
          <div className="stage-orbit stage-orbit-one" />
          <div className="stage-orbit stage-orbit-two" />
        </div>
        <div className="auth-visual-copy">
          <p>Una comunidad que crea</p>
          <h2>El arte nos<br />encuentra.</h2>
          <span>Organizamos cada actividad para acercar la cultura a más personas.</span>
        </div>
        <div className="auth-visual-footer"><span>EL SALVADOR</span><span className="auth-footer-line" /><span>DESDE 2025</span></div>
      </aside>
    </main>
  )
}

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.26 5.48-4.73 7.18l7.3 5.67c4.26-3.93 6.7-9.72 6.7-17.32Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.8l-7.3-5.67c-2.03 1.36-4.62 2.17-8.62 2.17-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
}
