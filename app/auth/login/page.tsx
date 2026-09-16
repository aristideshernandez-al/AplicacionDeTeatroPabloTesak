'use client'

import { useEffect, useState } from 'react'
import { Activity, Globe2, Loader2 } from 'lucide-react'
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
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span className="brand-mark"><Activity size={18} /></span><span>Control de Actividades</span></div><p className="eyebrow">TEATRO PABLO TESAK</p><h1>Inicia sesión</h1><p className="auth-copy">Accede al sistema de control y seguimiento de actividades institucionales.</p><button className="google-button" onClick={signInWithGoogle} disabled={loading}>{loading ? <Loader2 className="spin" size={18} /> : <Globe2 size={18} />} {loading ? 'Conectando...' : 'Continuar con Google'}</button>{error && <p className="auth-error" role="alert">{error}</p>}<p className="auth-note">Serás redirigido al panel principal después de seleccionar tu cuenta.</p></section></main>
}
