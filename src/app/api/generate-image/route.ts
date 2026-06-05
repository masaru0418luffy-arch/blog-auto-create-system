import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// カテゴリ→英語キーワードのマッピング（GPT-4o呼び出しを省いて高速化）
const categoryKeywords: Record<string, string> = {
  '外壁塗装': 'Japanese house exterior wall painting renovation, realistic photo',
  '屋根補修': 'Japanese roof repair construction work, realistic site photo',
  '屋根工事': 'Japanese roof construction tiles repair, realistic photo',
  '防水工事': 'waterproofing construction work Japan, realistic site photo',
  '内装リフォーム': 'Japanese interior renovation remodeling, realistic photo',
  'リフォーム': 'Japanese home renovation construction, realistic photo',
  '造園': 'Japanese garden landscaping work, realistic photo',
  '草刈り': 'lawn mowing grass cutting Japan, realistic site photo',
  '剪定': 'tree pruning garden work Japan, realistic photo',
  '伐採': 'tree cutting removal Japan, realistic site photo',
  '雑草対策': 'weed control prevention Japan garden, realistic photo',
  '外構工事': 'Japanese exterior construction driveway, realistic photo',
  'サポート': 'Japanese construction maintenance work, realistic photo',
  '施工': 'Japanese construction renovation work site, realistic photo',
}

export async function POST(req: NextRequest) {
  try {
    const { blogId, title, category, companyId } = await req.json()
    if (!blogId || !title || !category) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // カテゴリからキーワードを取得（GPT-4o不要で高速）
    const baseKeyword = categoryKeywords[category] ||
      `Japanese ${category} construction work, realistic documentary photo, no people`

    const imagePrompt = `${baseKeyword}. Natural daylight, on-site documentation style, slightly imperfect composition like smartphone photo, high quality realistic photograph.`

    // fal.ai FLUX/schnellで画像生成
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
        enable_safety_checker: false,
      }),
    })

    if (!falRes.ok) {
      const errData = await falRes.json().catch(() => ({}))
      throw new Error((errData as { detail?: string }).detail || `fal.ai エラー: ${falRes.status}`)
    }

    const falData = await falRes.json()
    const imageUrl = (falData as { images?: { url: string }[] }).images?.[0]?.url
    if (!imageUrl) throw new Error('画像URLが取得できませんでした')

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
