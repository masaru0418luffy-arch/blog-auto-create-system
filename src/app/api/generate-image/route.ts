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
  '板金': 'Japanese residential house roof with sheet metal flashing work, medium shot from rooftop level showing roof slope and surrounding neighborhood, metal panels installed on roof edge, no people, raw smartphone photo by worker standing on roof, natural daylight, residential house visible',
  '板金工事': 'Japanese residential house roof sheet metal work in progress, medium shot from rooftop showing the whole roof slope with metal flashing, surrounding houses visible, no people, raw smartphone photo taken by worker on roof, natural daylight, realistic job site',
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

    const imagePrompt = `${baseKeyword}. Medium distance shot showing work in context of Japanese residential house, not too close not too wide, shot on iPhone by worker, candid documentary style, not artistic, not staged, raw authentic job site, real world imperfections, residential neighborhood visible.`

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
    const falImageUrl = (falData as { images?: { url: string }[] }).images?.[0]?.url
    if (!falImageUrl) throw new Error('画像URLが取得できませんでした')

    // fal.aiから画像をダウンロードしてSupabaseに永続保存
    const imgRes = await fetch(falImageUrl)
    if (!imgRes.ok) throw new Error('fal.ai画像のダウンロードに失敗しました')
    const imgBuffer = await imgRes.arrayBuffer()

    // バケットが存在しない場合は作成
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'blog-images')
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('blog-images', { public: true })
      if (bucketError) throw new Error(`バケット作成失敗: ${bucketError.message}`)
    }

    const timestamp = Date.now()
    const fileName = `${companyId}/${blogId}-${timestamp}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imgBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) throw new Error(`Supabaseアップロード失敗: ${uploadError.message}`)

    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    await supabase
      .from('generated_blogs')
      .update({ image_url: imageUrl })
      .eq('id', blogId)

    return NextResponse.json({ imageUrl })
  } catch (error: unknown) {
    console.error('Generate image error:', error)
    const message = error instanceof Error ? error.message : '画像生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
