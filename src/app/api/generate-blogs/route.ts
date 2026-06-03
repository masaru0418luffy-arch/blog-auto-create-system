import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const BLOG_STYLE_REFERENCE = `
【参考ブログスタイル】
以下のような文体・構成・トーンで記事を作成してください：

構成例：
＼[キャッチーな一言]／

『[企業名]』では、[対応地域]を中心に[業種・サービス]として[活動/対応]しております。

今回の投稿テーマは「[テーマ名]」です。

[問題提起や状況説明を2〜3文で。読者の共感を得る内容。]

[サービスの価値や特徴を1〜2文で。]

[地域名]で[サービス内容]なら『[企業名]』へ。

詳しくは下記の【詳細】をタップ

文体の特徴：
- 親しみやすく、地域密着感のある言葉遣い
- 読者への語りかけ口調（「〜こともあります」「〜しやすくなります」）
- 季節感・時季に合った表現を使う
- シンプルで読みやすい短文構成
- CTAは必ず末尾に配置
`

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json()
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: '企業情報が見つかりません' }, { status: 404 })
    }

    // Re-scrape HP for fresh content
    let hpContent = company.hp_content || ''
    if (company.hp_url) {
      try {
        const origin = req.nextUrl.origin
        const scrapeRes = await fetch(`${origin}/api/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: company.hp_url }),
        })
        const scrapeData = await scrapeRes.json()
        if (scrapeData.text) hpContent = scrapeData.text
      } catch {
        // Use cached content
      }
    }

    const constructionList = (company.construction_types || []).join('、') || '（未設定）'

    const prompt = `あなたはリフォーム・建築・造園会社のブログライターです。
以下の情報をもとに、SEOに強く、地域の見込み客に響くGoogleビジネスプロフィール向けブログ記事を12本生成してください。

【企業情報】
企業名：${company.name}
${hpContent ? `HP内容：${hpContent.substring(0, 2000)}` : ''}

【ヒアリングシート内容】
${company.hearing_text ? company.hearing_text.substring(0, 2000) : '（未設定）'}

【注力施工内容】
${constructionList}

${BLOG_STYLE_REFERENCE}

【生成ルール】
- 各記事は400〜600文字程度（日本語）
- タイトル＋本文の形式
- 施工内容を均等にカバーする（各施工種別を複数記事で扱う）
- 地域名・季節感（現在は${new Date().toLocaleDateString('ja-JP', { month: 'long' })}）・具体的な施工事例を含める
- 読者への呼びかけ・CTA（お問い合わせ誘導）を末尾に入れる
- 企業名は『』で囲む
- ＼[キャッチーなフレーズ]／ で始めるのを推奨

必ず以下のJSON配列形式のみで返してください（コードブロックなし、説明文なし）：
[{"title": "...", "body": "...", "category": "施工種別名"}, ...]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 8000,
    })

    const content = completion.choices[0].message.content || '[]'

    let blogs: Array<{ title: string; body: string; category: string }> = []
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      blogs = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI応答のパースに失敗しました' }, { status: 500 })
    }

    // 生成バッチレコードを作成
    const { data: generation, error: genError } = await supabase
      .from('blog_generations')
      .insert({ company_id: companyId })
      .select()
      .single()

    if (genError || !generation) {
      return NextResponse.json({ error: '履歴レコードの作成に失敗しました' }, { status: 500 })
    }

    // 新しいブログを挿入（旧記事は削除しない）
    const { data: insertedBlogs, error: insertError } = await supabase
      .from('generated_blogs')
      .insert(
        blogs.map((b) => ({
          company_id: companyId,
          generation_id: generation.id,
          title: b.title,
          body: b.body,
          category: b.category,
        }))
      )
      .select()

    if (insertError) {
      return NextResponse.json({ error: 'DB保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ blogs: insertedBlogs })
  } catch (error: unknown) {
    console.error('Generate blogs error:', error)
    const message = error instanceof Error ? error.message : '生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
