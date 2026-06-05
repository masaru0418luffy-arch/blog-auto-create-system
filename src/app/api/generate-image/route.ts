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

    // GPT-4oで施工現場写真風のプロンプトを生成
    const promptRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `以下のブログ記事に合う施工現場写真を生成するための英語プロンプトを作成してください。
タイトル：${title}
カテゴリ：${category}
要件：
- 日本の住宅の施工・リフォーム・造園の現場写真のような雰囲気
- スマートフォンで撮影したリアルなドキュメンタリー写真スタイル
- 自然光、現場感あり、人物なし
- 英語で80文字以内
プロンプトのみ返してください（説明不要）。`,
      }],
      max_tokens: 80,
    })

    const imagePrompt = promptRes.choices[0].message.content?.trim() ||
      `Japanese ${category} construction work, realistic site photo, natural lighting, no people, documentary style`

    // fal.ai FLUX/schnellで画像生成（高速・2〜4秒）
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'landscape_4_3',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    })

    if (!falRes.ok) {
      const errData = await falRes.json()
      throw new Error(errData.detail || `fal.ai エラー: ${falRes.status}`)
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url
    if (!imageUrl) throw new Error('画像URLが取得できませんでした')

    // DBに保存
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
