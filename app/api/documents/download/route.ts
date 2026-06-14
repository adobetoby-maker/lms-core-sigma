import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('file_path, file_name')
    .eq('id', id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60, { download: doc.file_name })

  if (!signed?.signedUrl) return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
