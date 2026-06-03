import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BUCKETS = ['documents', 'dms-files', 'qc-reports', 'coa-pdfs']
const MAX_FILE_SIZE_MB = 25
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/csv',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'documents'
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate bucket
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return new Response(JSON.stringify({ error: `Bucket "${bucket}" not allowed` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: `File type "${file.type}" not allowed` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate file size
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return new Response(JSON.stringify({ error: `File too large (max ${MAX_FILE_SIZE_MB}MB, got ${sizeMb.toFixed(1)}MB)` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`
    const path = `${folder}/${safeName}`

    // Upload
    const arrayBuffer = await file.arrayBuffer()
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Log to audit
    await supabase.from('audit_log').insert({
      user_name: user.user_metadata?.full_name ?? user.email ?? 'Unknown',
      user_email: user.email,
      action: 'INSERT',
      module: 'DMS',
      record_label: file.name,
      details: `File uploaded: ${path} (${sizeMb.toFixed(2)}MB, ${file.type})`,
    })

    return new Response(JSON.stringify({
      path: data.path,
      bucket,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
