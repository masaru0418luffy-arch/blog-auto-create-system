import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { blogId, title, category, companyId } = await req.json()
    if (!blogId || !title || !category) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const prompt = `Professional, high-quality photograph for a Japanese home renovation and construction company blog.
Theme: ${title}
Category: ${category}
Requirements:
- Realistic, professional photography style
- Depicts ${category} work at a Japanese-style residential property
- Clean, bright natural lighting
- No text, no logos, no visible faces
- Suitable for a business blog header image
- Japanese architectural aesthetics`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    })

    const tempUrl = response.data?.[0]?.url
    if (!tempUrl) throw new Error('画像URLが取得できませんでした')

    // Download image from DALL-E
    const imageResponse = await fetch(tempUrl)
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Upload to Supabase Storage for permanent URL
    const fileName = `${companyId}/${Date.now()}_${blogId}.png`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imageBuffer, { contentType: 'image/png' })

    if (uploadError || !uploadData) throw new Error('画像のアップロードに失敗しました')

    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(uploadData.path)

    const permanentUrl = urlData.publicUrl

    // Save URL to DB
    await supabase
      .from('generated_blogs')
      .update({ image_url: permanentUrl })
      .eq('id', blogId)

    return NextResponse.json({ imageUrl: permanentUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '画像生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
