import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    let text = ''
    try {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      text = result.text.substring(0, 3000)
    } catch (e) {
      console.warn('PDF parse error:', e)
      text = ''
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let fileUrl = ''
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`
      const { data } = await supabase.storage
        .from('hearing-sheets')
        .upload(fileName, buffer, { contentType: 'application/pdf' })

      if (data) {
        const { data: urlData } = supabase.storage
          .from('hearing-sheets')
          .getPublicUrl(data.path)
        fileUrl = urlData.publicUrl
      }
    } catch (e) {
      console.warn('Storage upload error:', e)
    }

    return NextResponse.json({ text, fileUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
