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

    // GPT-4oで最適な検索キーワードを生成
    const keywordRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `以下の日本語ブログ記事に最適な写真をPexelsで検索するための英語キーワードを生成してください。
タイトル：${title}
カテゴリ：${category}
条件：
- 英語で3〜5単語
- 建設・リフォーム・住宅関連の写真が検索できるキーワード
- キーワードのみ返答（説明不要）
例：exterior wall painting house japan`,
      }],
      max_tokens: 30,
    })

    const searchQuery = keywordRes.choices[0].message.content?.trim() || `${category} house renovation japan`

    // Pexelsで写真を検索
    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY! } }
    )

    if (!pexelsRes.ok) throw new Error('Pexelsからの画像取得に失敗しました')

    const pexelsData = await pexelsRes.json()
    const photo = pexelsData.photos?.[0]
    if (!photo) throw new Error(`「${searchQuery}」に一致する画像が見つかりませんでした`)

    const imageUrl = photo.src.large2x || photo.src.large || photo.src.medium

    // DBに保存
    await supabase
      .from('generated_blogs')
      .update({ image_url: imageUrl })
      .eq('id', blogId)

    return NextResponse.json({ imageUrl, photographer: photo.photographer, searchQuery })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '画像取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
