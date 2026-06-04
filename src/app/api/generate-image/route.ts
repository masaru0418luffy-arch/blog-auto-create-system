import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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

    const prompt = `Professional photograph for a Japanese home renovation company blog.
Theme: ${title}. Category: ${category}.
Realistic, clean, bright lighting. Japanese residential style.
No text, no logos, no faces.`

    // DALL-E 2（高速・Vercel Hobbyプラン対応）
    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt,
      n: 1,
      size: '1024x1024',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) throw new Error('画像URLが取得できませんでした')

    // OpenAI URLを直接DBに保存（Supabaseアップロード省略で高速化）
    await supabase
      .from('generated_blogs')
      .update({ image_url: imageUrl })
      .eq('id', blogId)

    return NextResponse.json({ imageUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '画像生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
