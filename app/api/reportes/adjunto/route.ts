import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAllowedHost(hostname: string) {
  if (hostname === 'firebasestorage.googleapis.com' || hostname === 'storage.googleapis.com') return true
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  try { return hostname === new URL(supabaseUrl).hostname } catch { return false }
}

function isAllowedUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && isAllowedHost(url.hostname)
  } catch { return false }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Inicia sesión para consultar los anexos.' }, { status: 401 })

  const source = request.nextUrl.searchParams.get('url')
  if (!source || !isAllowedUrl(source)) return NextResponse.json({ error: 'El origen del archivo no está permitido.' }, { status: 400 })

  try {
    let currentUrl = source
    let response: Response | undefined
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (!isAllowedUrl(currentUrl)) return NextResponse.json({ error: 'La dirección del anexo no es válida.' }, { status: 400 })
      response = await fetch(currentUrl, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(20000) })
      if (response.status < 300 || response.status >= 400) break
      const location = response.headers.get('location')
      if (!location || redirects === 3) break
      currentUrl = new URL(location, currentUrl).toString()
    }
    if (!response?.ok) return NextResponse.json({ error: 'No se pudo descargar el anexo.' }, { status: response?.status === 404 ? 404 : 502 })

    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 25 * 1024 * 1024) return NextResponse.json({ error: 'El anexo supera el límite de 25 MB.' }, { status: 413 })
    let contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (contentType === 'application/octet-stream' || contentType === 'binary/octet-stream') {
      const signature = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength))
      const ascii = String.fromCharCode(...signature)
      if (ascii.startsWith('%PDF-')) contentType = 'application/pdf'
      else if (ascii.startsWith('\xFF\xD8\xFF')) contentType = 'image/jpeg'
      else if (ascii.startsWith('\x89PNG\r\n\x1A\n')) contentType = 'image/png'
      else if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') contentType = 'image/webp'
    }
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(contentType)) return NextResponse.json({ error: 'El anexo no es una imagen ni un PDF compatible.' }, { status: 415 })

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo obtener el archivo del expediente.' }, { status: 502 })
  }
}
