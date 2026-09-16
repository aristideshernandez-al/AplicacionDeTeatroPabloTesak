'use client'

import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && publishableKey)

export function createClient() {
  if (!url || !publishableKey) {
    throw new Error('Falta la URL o la clave pública de Supabase.')
  }

  return createBrowserClient(url, publishableKey)
}
