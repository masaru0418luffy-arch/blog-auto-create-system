import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// カテゴリ→英語キーワードのマッピング（GPT-4o呼び出しを省いて高速化）
const categoryKeywords: Record<string, string> = {
  '外壁塗装': 'Japanese house exterior wall with fresh paint, scaffolding, paint roller and buckets on site, no people, shot with smartphone by worker, slightly imperfect angle, raw job site documentation photo',
  '屋根補修': 'Japanese roof tiles close-up, worn and damaged tiles being repaired, no people, raw smartphone photo from job site, overcast natural light, slightly imperfect composition, real construction documentation',
  '屋根工事': 'Japanese residential roof construction work, tiles and roofing materials on site, no people, raw smartphone photo taken by worker, natural daylight, documentary style, gritty real site',
  '防水工事': 'Japanese flat roof waterproofing work, sealant materials and tools on site, no people, raw smartphone documentation photo, slightly imperfect, real job site',
  '内装リフォーム': 'Japanese interior renovation in progress, bare walls and floors, construction materials scattered, no people, raw smartphone photo by worker, natural light, real job site feel',
  'リフォーム': 'Japanese house renovation work in progress, construction materials and tools visible, no people, raw smartphone photo, natural light, imperfect angle, real job site documentation',
  '造園': 'Japanese residential garden landscaping work, soil and plants being arranged, tools on ground, no people, raw smartphone photo, natural daylight, documentary style',
  '草刈り': 'Japanese residential property after grass mowing, cut grass on ground, mower nearby, no people, raw smartphone photo taken by worker, natural light, real work documentation',
  '剪定': 'Japanese garden trees being pruned, cut branches on ground, no people, raw smartphone photo, natural daylight, slightly imperfect composition, real job site',
  '伐採': 'Japanese tree removal job site, fallen logs and branches, no people, raw smartphone photo, natural light, real work documentation, slightly imperfect angle',
  '雑草対策': 'Japanese property weed control, black防草シート ground cover being laid, no people, raw smartphone photo by worker, natural daylight, real job site documentation',
  '外構工事': 'Japanese residential exterior construction, driveway or fence work in progress, materials on site, no people, raw smartphone photo, natural light, real job documentation',
  'サポート': 'Japanese house maintenance work, tools and materials visible, no people, raw smartphone photo by worker, natural daylight, real job site feel',
  '施工': 'Japanese construction work site, materials and tools visible, work in progress, no people, raw smartphone photo, natural light, imperfect angle, documentary style',
  '雨樋工事': 'close-up of Japanese house rain gutter installation, ladder against residential house wall, gutter and brackets visible, no people, raw smartphone photo by worker, natural daylight, tight framing',
  '塗装': 'close-up of Japanese residential house exterior being painted, paint roller on wall, paint bucket nearby, no people, raw smartphone photo, natural light, tight framing',
  '板金': 'close-up of Japanese residential house sheet metal roofing work, metal panels and flashing on roof edge, tools nearby, no people, raw smartphone photo by worker, natural daylight, tight close-up shot',
  '板金工事': 'close-up of Japanese residential house sheet metal flashing or gutter work, metal panels visible, no people, raw smartphone photo, natural daylight, tight framing, residential house only not commercial',
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

    const imagePrompt = `${baseKeyword}. Close-up shot, tight framing, Japanese residential house only not commercial building, shot on iPhone, candid documentary style, not artistic, not professional photography, raw authentic construction site, grainy texture, real world imperfections.`

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
